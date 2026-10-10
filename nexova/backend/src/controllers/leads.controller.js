import { Op } from 'sequelize';
import { Lead, LeadAssignment, Conversation, ConversationScore } from '../models/index.js';
import { recordSaleRevenue } from '../services/revenue.service.js';
import { markPropertyAsSold } from '../services/propertySale.service.js';
import { applyLeadScope } from '../middlewares/scopeFilter.js';
import { generateId } from '../utils/uuid.js';
import { generateCoachingInsight } from '../services/coachAgent.service.js';
import { extractAndStorePlaybooks } from '../services/playbookExtractor.service.js';
import { assignLeadToAsesor, assignLeadToBestAsesor, recalculateAsesorMetrics } from '../services/assignmentEngine.service.js';
import { deleteLeadById, deleteConversationChat, purgeWhatsAppLeads, resolveBusinessId } from '../services/leadCleanup.service.js';
import { Asesor } from '../models/index.js';

export async function listLeads(req, res) {
  const where = applyLeadScope({}, req);
  const { status, search, page = 1, limit = 20 } = req.query;
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }
  const offset = (page - 1) * limit;
  const { rows, count } = await Lead.findAndCountAll({
    where,
    include: [
      { model: LeadAssignment, required: false, where: { status: { [Op.notIn]: ['reasignado'] } } },
      { model: Conversation, include: [{ model: ConversationScore, required: false }] },
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit, 10),
    offset,
  });
  res.json({ data: rows, total: count, page: parseInt(page, 10) });
}

export async function getLead(req, res) {
  const where = applyLeadScope({ id: req.params.id }, req);
  const lead = await Lead.findOne({
    where,
    include: [{ model: LeadAssignment }, { model: Conversation }],
  });
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  res.json({ data: lead });
}

export async function updateLead(req, res) {
  const where = applyLeadScope({ id: req.params.id }, req);
  const lead = await Lead.findOne({ where });
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  const before = lead.toJSON();
  const {
    status,
    notes,
    full_name,
    zone,
    budget_min,
    budget_max,
    lost_reason,
    sale_amount: saleAmount,
    commission_amount: commissionAmount,
    payment_method: paymentMethod,
    property_id: propertyId,
  } = req.body;
  await lead.update({
    status: status ?? lead.status,
    notes: notes ?? lead.notes,
    full_name: full_name ?? lead.full_name,
    zone: zone ?? lead.zone,
    budget_min: budget_min ?? lead.budget_min,
    budget_max: budget_max ?? lead.budget_max,
    lost_reason: lost_reason ?? lead.lost_reason,
    closed_at: ['closed_won', 'closed_lost'].includes(status) ? new Date() : lead.closed_at,
  });
  let revenueRecord = null;
  let soldProperty = null;

  if (['closed_won', 'closed_lost'].includes(status)) {
    await lead.update({ bot_paused: true });

    const assignment = await LeadAssignment.findOne({
      where: { lead_id: lead.id, status: { [Op.notIn]: ['reasignado', 'perdido', 'cierre'] } },
    });

    if (status === 'closed_won') {
      if (propertyId) {
        try {
          soldProperty = await markPropertyAsSold({
            propertyId,
            businessId: lead.business_id,
            io: req.app.get('io'),
          });
        } catch (err) {
          return res.status(err.status || 400).json({ error: err.message });
        }
      }

      if (saleAmount != null && parseFloat(saleAmount) > 0) {
        const saleNotes = notes || (soldProperty ? `Venta — ${soldProperty.title}` : undefined);
        revenueRecord = await recordSaleRevenue({
          lead,
          asesorId: assignment?.asesor_id || req.user.asesorId || null,
          amount: saleAmount,
          commissionAmount,
          paymentMethod,
          notes: saleNotes,
          propertyId: soldProperty?.id || propertyId || null,
        });
      }
      if (revenueRecord) {
        req.app.get('io')?.emit('finances:updated', {
          businessId: lead.business_id,
          revenueId: revenueRecord.id,
          amount: revenueRecord.amount,
        });
      }
    }

    if (assignment) {
      const asesor = await Asesor.findByPk(assignment.asesor_id);
      await assignment.update({
        status: status === 'closed_won' ? 'cierre' : 'perdido',
        closed_at: new Date(),
      });
      if (asesor) {
        await asesor.update({ current_leads: Math.max(0, asesor.current_leads - 1) });
        if (status === 'closed_won') {
          await asesor.update({ total_closes: (asesor.total_closes || 0) + 1 });
        }
        await recalculateAsesorMetrics(asesor.id);
      }

      const conversation = await Conversation.findOne({ where: { lead_id: lead.id, is_active: true } });
      await generateCoachingInsight({
        leadId: lead.id,
        asesorId: assignment.asesor_id,
        conversationId: conversation?.id || null,
        outcome: status,
        lostReason: lost_reason,
      });

      if (status === 'closed_won' && conversation) {
        await extractAndStorePlaybooks({
          businessId: lead.business_id,
          conversationId: conversation.id,
          createdByUserId: req.user?.id || null,
        });
      }
    }

    req.app.get('io')?.emit('lead:status_changed', {
      leadId: lead.id,
      status,
      businessId: lead.business_id,
    });
  }

  await lead.reload();
  res.json({ data: lead, before, revenue: revenueRecord, property: soldProperty });
}

export async function createLead(req, res) {
  const businessId = req.user.role === 'owner' ? req.body.business_id : req.user.businessId;
  if (!businessId) return res.status(400).json({ error: 'business_id requerido' });
  const lead = await Lead.create({
    id: generateId(),
    business_id: businessId,
    ...req.body,
    first_contact_at: new Date(),
    last_contact_at: new Date(),
  });
  res.status(201).json({ data: lead });
}

export async function pauseBot(req, res) {
  const where = applyLeadScope({ id: req.params.id }, req);
  const lead = await Lead.findOne({ where });
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  await lead.update({ bot_paused: true, bot_paused_by: req.user.asesorId });
  req.app.get('io')?.emit('lead:status_changed', { leadId: lead.id, bot_paused: true });
  res.json({ data: lead });
}

export async function resumeBot(req, res) {
  const where = applyLeadScope({ id: req.params.id }, req);
  const lead = await Lead.findOne({ where });
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
  await lead.update({ bot_paused: false, bot_paused_by: null });
  res.json({ data: lead });
}

export async function assignLead(req, res) {
  const where = applyLeadScope({ id: req.params.id }, req);
  const lead = await Lead.findOne({ where });
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

  const { asesor_id: asesorId } = req.body;
  const io = req.app.get('io');

  let assignment;
  if (asesorId) {
    const asesor = await Asesor.findOne({
      where: { id: asesorId, business_id: lead.business_id, active: true },
    });
    if (!asesor) return res.status(400).json({ error: 'Asesor no válido para este negocio' });
    if (req.user.role === 'admin' && asesor.admin_id !== req.user.id) {
      return res.status(400).json({ error: 'Solo puedes asignar asesores de tu equipo' });
    }

    assignment = await assignLeadToAsesor({
      leadId: lead.id,
      asesorId,
      businessId: lead.business_id,
      reason: `Asignado manualmente por ${req.user.role}`,
      io,
      allowReassign: true,
    });
  } else {
    assignment = await assignLeadToBestAsesor({
      leadId: lead.id,
      businessId: lead.business_id,
      reason: 'Asignación automática desde CRM',
      io,
    });
  }

  if (!assignment) {
    return res.status(409).json({ error: 'No se pudo asignar el lead (sin asesores disponibles)' });
  }

  const asesor = await Asesor.findByPk(assignment.asesor_id, { attributes: ['id', 'name'] });
  res.json({ data: { assignment, asesor } });
}

export async function deleteLead(req, res) {
  const conversationId = req.query.conversation_id || req.body?.conversation_id;

  if (conversationId) {
    const conv = await Conversation.findByPk(conversationId, {
      attributes: ['id', 'lead_id', 'channel'],
    });
    if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

    const leadWhere = applyLeadScope({ id: conv.lead_id }, req);
    const accessible = await Lead.findOne({ where: leadWhere, attributes: ['id'] });
    if (!accessible) return res.status(403).json({ error: 'Sin acceso' });

    if (req.params.id && String(req.params.id) !== String(conv.lead_id)) {
      return res.status(400).json({
        error: 'El chat abierto no corresponde a ese lead. No se borró nada. Vuelve a seleccionar la conversación.',
      });
    }

    const result = await deleteConversationChat({
      conversationId,
      expectedLeadId: conv.lead_id,
    });
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    req.app.get('io')?.emit('lead:deleted', {
      leadId: result.deleted.id,
      source: result.deleted.source,
      channel: result.channel,
      conversationId: result.conversationId,
      leadDeleted: result.leadDeleted,
    });
    return res.json({
      ok: true,
      deleted: result.deleted,
    });
  }

  const where = applyLeadScope({ id: req.params.id }, req);
  const lead = await Lead.findOne({
    where,
    attributes: ['id', 'phone', 'full_name', 'source', 'external_id'],
  });
  if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });

  await deleteLeadById(lead.id);
  req.app.get('io')?.emit('lead:deleted', {
    leadId: lead.id,
    source: lead.source,
    channel: lead.source,
    leadDeleted: true,
  });
  res.json({
    ok: true,
    deleted: {
      id: lead.id,
      phone: lead.phone,
      full_name: lead.full_name,
      source: lead.source,
      channel: lead.source,
      lead_deleted: true,
    },
  });
}

/** Elimina leads de WhatsApp en lote (admin/owner). */
export async function purgeWhatsAppLeadsEndpoint(req, res) {
  const { phones, all_whatsapp: allWhatsapp, confirm } = req.body || {};
  if (confirm !== 'BORRAR') {
    return res.status(400).json({
      error: 'Envía confirm: "BORRAR" para ejecutar. Esto elimina leads, chats y mensajes.',
    });
  }

  let businessId = req.user.role === 'owner' ? req.body.business_id : req.user.businessId;
  if (!businessId && req.body.business_slug) {
    businessId = await resolveBusinessId({ businessSlug: req.body.business_slug });
  }
  if (!businessId) return res.status(400).json({ error: 'business_id requerido' });

  try {
    const deleted = await purgeWhatsAppLeads({
      businessId,
      phones: Array.isArray(phones) ? phones : undefined,
      allWhatsapp: Boolean(allWhatsapp),
    });
    req.app.get('io')?.emit('leads:purged', { count: deleted.length, businessId });
    res.json({
      ok: true,
      deletedCount: deleted.length,
      deleted: deleted.map((l) => ({ id: l.id, phone: l.phone, full_name: l.full_name })),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
