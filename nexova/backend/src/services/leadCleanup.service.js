import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { Lead, LeadAssignment, Asesor, Business, Conversation, Message, ConversationScore } from '../models/index.js';
/** Ajusta contador de leads activos del asesor antes de borrar asignaciones. */
async function decrementAsesorLeadCounts(leadId, transaction) {
  const assignments = await LeadAssignment.findAll({
    where: {
      lead_id: leadId,
      status: { [Op.notIn]: ['reasignado', 'perdido'] },
    },
    transaction,
  });
  for (const assignment of assignments) {
    const asesor = await Asesor.findByPk(assignment.asesor_id, { transaction });
    if (asesor) {
      await asesor.update({ current_leads: Math.max(0, asesor.current_leads - 1) }, { transaction });
    }
  }
}

export async function deleteLeadById(leadId) {
  const lead = await Lead.findByPk(leadId);
  if (!lead) return null;
  await decrementAsesorLeadCounts(leadId);
  await lead.destroy();
  return lead;
}

/**
 * Borra SOLO el chat abierto. Si el lead tiene otros canales, esos chats se quedan.
 * El lead se elimina únicamente cuando ya no quedan conversaciones.
 */
export async function deleteConversationChat({ conversationId, expectedLeadId }) {
  const t = await sequelize.transaction();
  try {
    const conversation = await Conversation.findByPk(conversationId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!conversation) {
      await t.rollback();
      return { error: { status: 404, message: 'Conversación no encontrada' } };
    }

    if (expectedLeadId && String(conversation.lead_id) !== String(expectedLeadId)) {
      await t.rollback();
      return {
        error: {
          status: 400,
          message: 'El chat abierto no corresponde a ese lead. No se borró nada. Vuelve a seleccionar la conversación.',
        },
      };
    }

    const lead = await Lead.findByPk(conversation.lead_id, {
      attributes: ['id', 'phone', 'full_name', 'source', 'external_id'],
      transaction: t,
    });
    if (!lead) {
      await t.rollback();
      return { error: { status: 404, message: 'Lead no encontrado' } };
    }

    const channel = conversation.channel;
    const conversationLeadId = conversation.lead_id;

    await Message.destroy({ where: { conversation_id: conversation.id }, transaction: t });
    await ConversationScore.destroy({ where: { conversation_id: conversation.id }, transaction: t });
    await conversation.destroy({ transaction: t });

    const remaining = await Conversation.count({ where: { lead_id: conversationLeadId }, transaction: t });
    let leadDeleted = false;
    if (remaining === 0) {
      await decrementAsesorLeadCounts(conversationLeadId, t);
      await lead.destroy({ transaction: t });
      leadDeleted = true;
    }

    await t.commit();
    return {
      conversationId,
      channel,
      leadDeleted,
      remainingConversations: remaining,
      deleted: {
        id: lead.id,
        phone: lead.phone,
        full_name: lead.full_name,
        source: lead.source,
        channel,
        conversation_id: conversationId,
        lead_deleted: leadDeleted,
      },
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Borra leads de WhatsApp (conversaciones, mensajes y scores en cascada).
 * @param {{ businessId: string, phones?: string[], allWhatsapp?: boolean }}
 */
export async function purgeWhatsAppLeads({ businessId, phones, allWhatsapp }) {
  const where = { business_id: businessId, source: 'whatsapp' };
  if (!allWhatsapp && phones?.length) {
    const normalized = phones.map((p) => p.replace(/\s/g, '').replace(/^whatsapp:/i, ''));
    where.phone = { [Op.in]: normalized };
  } else if (!allWhatsapp) {
    throw new Error('Indica teléfonos o allWhatsapp: true');
  }

  const leads = await Lead.findAll({ where, attributes: ['id', 'phone', 'full_name'] });
  for (const lead of leads) {
    await decrementAsesorLeadCounts(lead.id);
    await lead.destroy();
  }
  return leads;
}

export async function resolveBusinessId({ businessId, businessSlug }) {
  if (businessId) return businessId;
  if (businessSlug) {
    const business = await Business.findOne({ where: { slug: businessSlug } });
    return business?.id || null;
  }
  return null;
}
