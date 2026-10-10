import { Op } from 'sequelize';
import { Asesor, Lead, LeadAssignment, Notification } from '../models/index.js';
import { generateId } from '../utils/uuid.js';
import { sendWhatsApp } from './twilio.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const AUTO_ASSIGN_SCORE_THRESHOLD = 60;

const pendingTimers = new Map();

function matchesZone(asesor, zone) {
  if (!zone) return 0;
  if (asesor.zone?.toLowerCase() === zone.toLowerCase()) return 10;
  return 0;
}

function matchesSpecialty(asesor, propertyType) {
  if (!propertyType || !asesor.specialties) return 0;
  const specs = Array.isArray(asesor.specialties) ? asesor.specialties : [];
  return specs.some((s) => s.toLowerCase() === propertyType.toLowerCase()) ? 5 : 0;
}

function clearReassignmentTimer(assignmentId) {
  if (pendingTimers.has(assignmentId)) {
    clearTimeout(pendingTimers.get(assignmentId));
    pendingTimers.delete(assignmentId);
  }
}

async function notifyAsesorOfAssignment({ lead, asesor, assignment, businessId, io }) {
  const crmLink = `${env.frontendUrl}/crm?lead=${lead.id}`;
  const summary = `🔥 Nuevo lead calificado\nNombre: ${lead.full_name || 'Sin nombre'}\nTel: ${lead.phone}\nZona: ${lead.zone || '—'}\nPresupuesto: ${lead.budget_min || '—'} - ${lead.budget_max || '—'}\nCRM: ${crmLink}`;

  try {
    await sendWhatsApp({ to: asesor.phone, body: summary });
  } catch (err) {
    logger.error('Error enviando WhatsApp a asesor', { err: err.message });
  }

  if (asesor.user_id) {
    await Notification.create({
      id: generateId(),
      user_id: asesor.user_id,
      type: 'lead_assigned',
      title: 'Nuevo lead asignado',
      body: `${lead.full_name || lead.phone} — revisa el CRM`,
      link_url: `/crm?lead=${lead.id}`,
      metadata: { leadId: lead.id, asesorId: asesor.id },
    });
  }

  if (io) {
    io.to(`asesor:${asesor.id}`).emit('lead:assigned', {
      leadId: lead.id,
      asesorId: asesor.id,
      assignment,
    });
    io.to(`business:${businessId}`).emit('lead:assigned', {
      leadId: lead.id,
      asesorId: asesor.id,
    });
  }
}

async function closeActiveAssignment(leadId) {
  const existing = await LeadAssignment.findOne({
    where: { lead_id: leadId, status: { [Op.notIn]: ['reasignado', 'perdido'] } },
  });
  if (!existing) return null;

  clearReassignmentTimer(existing.id);
  await existing.update({ status: 'reasignado' });
  const oldAsesor = await Asesor.findByPk(existing.asesor_id);
  if (oldAsesor) {
    await oldAsesor.update({ current_leads: Math.max(0, oldAsesor.current_leads - 1) });
  }
  return existing;
}

export async function assignLeadToAsesor({
  leadId,
  asesorId,
  businessId,
  reason,
  io,
  allowReassign = false,
  notify = true,
}) {
  const lead = await Lead.findByPk(leadId);
  if (!lead) return null;

  const resolvedBusinessId = businessId || lead.business_id;
  const asesor = await Asesor.findOne({
    where: {
      id: asesorId,
      business_id: resolvedBusinessId,
      active: true,
    },
  });
  if (!asesor) {
    logger.warn('Asesor no válido para asignación', { leadId, asesorId, businessId: resolvedBusinessId });
    return null;
  }

  const existing = await LeadAssignment.findOne({
    where: { lead_id: leadId, status: { [Op.notIn]: ['reasignado', 'perdido'] } },
  });

  if (existing) {
    if (existing.asesor_id === asesorId) return existing;
    if (!allowReassign) return existing;
    await closeActiveAssignment(leadId);
  } else if (asesor.current_leads >= asesor.max_concurrent_leads) {
    logger.warn('Asesor al límite de leads', { asesorId, current: asesor.current_leads });
    return null;
  }

  const assignment = await LeadAssignment.create({
    id: generateId(),
    lead_id: leadId,
    asesor_id: asesor.id,
    assigned_at: new Date(),
    assignment_reason: reason || 'Asignación manual',
    status: 'pendiente',
  });

  await asesor.update({
    current_leads: asesor.current_leads + 1,
    total_leads_received: asesor.total_leads_received + 1,
  });
  await lead.update({ status: lead.status === 'new' ? 'qualified' : lead.status });

  if (notify) {
    await notifyAsesorOfAssignment({
      lead,
      asesor,
      assignment,
      businessId: resolvedBusinessId,
      io,
    });
  }

  scheduleReassignment({
    assignmentId: assignment.id,
    leadId,
    businessId: resolvedBusinessId,
    excludedAsesorId: asesor.id,
    io,
  });

  logger.info('Lead asignado', { leadId, asesorId: asesor.id, reason });
  return assignment;
}

export async function assignLeadToBestAsesor({ leadId, businessId, reason, io, excludeAsesorId = null }) {
  const lead = await Lead.findByPk(leadId);
  if (!lead) return null;

  const existing = await LeadAssignment.findOne({
    where: { lead_id: leadId, status: { [Op.notIn]: ['reasignado', 'perdido'] } },
  });
  if (existing) return existing;

  const candidates = await Asesor.findAll({
    where: {
      business_id: businessId,
      status: 'disponible',
      active: true,
    },
  });

  let eligible = candidates.filter((a) => {
    if (excludeAsesorId && a.id === excludeAsesorId) return false;
    return a.current_leads < a.max_concurrent_leads;
  });

  if (!eligible.length) {
    const fallback = await Asesor.findAll({
      where: {
        business_id: businessId,
        active: true,
        status: { [Op.in]: ['disponible', 'ocupado'] },
      },
    });
    eligible = fallback.filter((a) => {
      if (excludeAsesorId && a.id === excludeAsesorId) return false;
      return a.current_leads < a.max_concurrent_leads;
    });
  }

  if (!eligible.length) {
    logger.warn('Sin asesores disponibles', { leadId, businessId });
    return null;
  }

  const ranked = eligible
    .map((a) => ({
      asesor: a,
      rank:
        parseFloat(a.performance_score) * 100 +
        matchesZone(a, lead.zone) +
        matchesSpecialty(a, lead.property_type) -
        a.current_leads * 2 -
        parseFloat(a.avg_response_time || 0),
    }))
    .sort((x, y) => y.rank - x.rank);

  return assignLeadToAsesor({
    leadId,
    asesorId: ranked[0].asesor.id,
    businessId,
    reason: reason || `Score >= ${AUTO_ASSIGN_SCORE_THRESHOLD} — asignación automática`,
    io,
    allowReassign: false,
    notify: true,
  });
}

export async function maybeAutoAssignLead({ leadId, businessId, score, handoffRequired, io }) {
  if (!businessId) return null;

  const shouldAssign =
    handoffRequired ||
    (typeof score === 'number' && score >= AUTO_ASSIGN_SCORE_THRESHOLD);

  if (!shouldAssign) return null;

  const reason = handoffRequired
    ? 'Handoff — lead pidió asesor humano'
    : `Score ${score} — asignación automática`;

  const assignment = await assignLeadToBestAsesor({ leadId, businessId, reason, io });

  if (assignment && typeof score === 'number' && score >= AUTO_ASSIGN_SCORE_THRESHOLD && io) {
    io.to(`business:${businessId}`).emit('lead:hot', { leadId, score });
  }

  return assignment;
}

function scheduleReassignment({ assignmentId, leadId, businessId, excludedAsesorId, io }) {
  clearReassignmentTimer(assignmentId);

  const timer = setTimeout(async () => {
    const assignment = await LeadAssignment.findByPk(assignmentId);
    if (!assignment || assignment.first_response_at) return;
    if (assignment.status !== 'pendiente') return;

    await assignment.update({ status: 'reasignado' });
    const asesor = await Asesor.findByPk(assignment.asesor_id);
    if (asesor) await asesor.update({ current_leads: Math.max(0, asesor.current_leads - 1) });
    pendingTimers.delete(assignmentId);

    await assignLeadToBestAsesor({
      leadId,
      businessId,
      reason: 'Reasignación — sin respuesta en 15 min',
      io,
      excludeAsesorId: excludedAsesorId,
    });
  }, 15 * 60 * 1000);

  pendingTimers.set(assignmentId, timer);
}

export async function recordFirstResponse(assignmentId) {
  const assignment = await LeadAssignment.findByPk(assignmentId);
  if (!assignment || assignment.first_response_at) return;
  const assignedAt = assignment.assigned_at || assignment.created_at || new Date();
  const minutes = (Date.now() - new Date(assignedAt).getTime()) / 60000;
  await assignment.update({
    first_response_at: new Date(),
    response_time_minutes: minutes,
    status: 'contactado',
  });
  clearReassignmentTimer(assignmentId);
}

export async function recalculateAsesorMetrics(asesorId) {
  const asesor = await Asesor.findByPk(asesorId);
  if (!asesor) return;
  const assignments = await LeadAssignment.findAll({ where: { asesor_id: asesorId } });
  const closes = assignments.filter((a) => a.status === 'cierre').length;
  const received = asesor.total_leads_received || 1;
  const closeRate = (closes / received) * 100;
  const responseTimes = assignments
    .filter((a) => a.response_time_minutes)
    .map((a) => parseFloat(a.response_time_minutes));
  const avgResponse = responseTimes.length
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 30;
  const performanceScore = closeRate * 0.05 + (1 / Math.max(avgResponse, 1)) * 30 + 2;
  await asesor.update({
    close_rate: closeRate,
    avg_response_time: avgResponse,
    performance_score: Math.min(10, Math.max(0, performanceScore)),
    total_closes: closes,
  });
}
