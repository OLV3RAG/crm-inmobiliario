import { Business, Conversation, Lead, Message, Asesor } from '../models/index.js';
import { chatBot } from './claude.service.js';
import { scoreConversationIfNeeded } from './conversationScorer.service.js';
import { maybeAutoAssignLead } from './assignmentEngine.service.js';
import { sendOutboundMessage } from './messagingOutbound.service.js';
import { fetchMetaUserProfile, buildMetaDisplayName } from './metaMessaging.service.js';
import { generateId } from '../utils/uuid.js';
import { logger } from '../utils/logger.js';
import { emitConversationMessage } from '../utils/socketEvents.js';
import { detectHandoffIntent, buildHandoffReply } from '../utils/handoffIntent.js';
import { serializeMessageMedia, normalizeProviderMessageId } from '../utils/messageMedia.js';

async function applyLeadDataFromBot(lead, leadData) {
  if (!leadData || typeof leadData !== 'object') return lead;
  const updates = {};
  if (leadData.property_type) updates.property_type = leadData.property_type;
  if (leadData.zone) updates.zone = leadData.zone;
  if (leadData.budget_min != null) updates.budget_min = leadData.budget_min;
  if (leadData.budget_max != null) updates.budget_max = leadData.budget_max;
  if (!Object.keys(updates).length) return lead;
  await lead.update(updates);
  return lead;
}

async function executeHandoff({ lead, businessId, io, reason }) {
  await lead.update({ bot_paused: true });
  const assignment = await maybeAutoAssignLead({
    leadId: lead.id,
    businessId,
    handoffRequired: true,
    io,
  });

  let asesorName = null;
  if (assignment?.asesor_id) {
    const asesor = await Asesor.findByPk(assignment.asesor_id, { attributes: ['name'] });
    asesorName = asesor?.name || null;
  }

  logger.info('Handoff a asesor', {
    leadId: lead.id,
    reason,
    assigned: Boolean(assignment),
    asesorId: assignment?.asesor_id || null,
  });

  return buildHandoffReply({
    leadName: lead.full_name,
    asesorName,
    assigned: Boolean(assignment),
  });
}

async function sendBotReply({ conversation, lead, businessId, io, body }) {
  const reply = String(body || '').trim() || 'Gracias por tu mensaje. En un momento te atendemos.';
  const outbound = await Message.create({
    id: generateId(),
    conversation_id: conversation.id,
    lead_id: lead.id,
    direction: 'outbound',
    sender_type: 'bot',
    content: reply,
  });

  try {
    const sent = await sendOutboundMessage({
      channel: conversation.channel,
      lead,
      body: reply,
    });
    await outbound.update({
      twilio_sid: normalizeProviderMessageId(sent.sid),
      status: sent.status || 'sent',
    });
    logger.info('Respuesta bot enviada', { leadId: lead.id, channel: conversation.channel });
  } catch (sendErr) {
    await outbound.update({ status: 'failed' });
    logger.error('Bot respondió en BD pero falló envío', {
      leadId: lead.id,
      channel: conversation.channel,
      err: sendErr.message,
    });
  }

  emitConversationMessage(io, {
    conversationId: conversation.id,
    businessId,
    message: outbound,
    leadName: lead.full_name,
    leadPhone: lead.phone,
    channel: conversation.channel,
  });
}

function buildInboundContent(text, media) {
  const hasMedia = media?.length > 0;
  const trimmed = text?.trim();
  if (trimmed) return trimmed;
  if (hasMedia) return '📷 Imagen';
  return '(sin texto)';
}

export async function resolveMetaLeadIdentity({ channel, senderId, profileName }) {
  const externalId = `${channel}:${senderId}`;
  const syntheticPhone = `meta:${channel}:${senderId}`;
  const profile = profileName ? null : await fetchMetaUserProfile(senderId, { channel });
  const fullName = profileName || buildMetaDisplayName(profile, `Usuario ${channel}`);
  return { externalId, syntheticPhone, fullName };
}

export async function processInboundMessage({
  business,
  channel,
  externalUserId,
  externalId,
  phone,
  fullName,
  body,
  messageId,
  media = [],
  io,
}) {
  const now = new Date();
  const leadWhere = externalId
    ? { business_id: business.id, external_id: externalId }
    : { business_id: business.id, phone };

  let lead = await Lead.findOne({ where: leadWhere });

  if (!lead) {
    lead = await Lead.create({
      id: generateId(),
      business_id: business.id,
      full_name: fullName,
      phone,
      external_id: externalId || null,
      source: channel,
      status: 'new',
      first_contact_at: now,
      last_contact_at: now,
    });
  } else {
    await lead.update({
      last_contact_at: now,
      full_name: lead.full_name || fullName,
      external_id: lead.external_id || externalId || null,
      source: lead.source || channel,
    });
  }

  let conversation = await Conversation.findOne({
    where: { lead_id: lead.id, channel, is_active: true },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      id: generateId(),
      lead_id: lead.id,
      business_id: business.id,
      channel,
      is_active: true,
      last_message_at: now,
    });
  }

  const inboundContent = buildInboundContent(body, media);
  const providerSid = normalizeProviderMessageId(messageId);

  if (providerSid) {
    const existing = await Message.findOne({ where: { twilio_sid: providerSid } });
    if (existing) {
      logger.info('Mensaje Meta duplicado, se ignora', { leadId: lead.id, channel, providerSid });
      return { lead, conversation, inbound: existing, duplicate: true };
    }
  }

  let inbound;
  try {
    inbound = await Message.create({
      id: generateId(),
      conversation_id: conversation.id,
      lead_id: lead.id,
      direction: 'inbound',
      sender_type: 'lead',
      content: inboundContent,
      media_url: serializeMessageMedia(media),
      twilio_sid: providerSid,
    });
  } catch (err) {
    if (providerSid && /Data too long|ER_DATA_TOO_LONG/i.test(err.message || '')) {
      inbound = await Message.create({
        id: generateId(),
        conversation_id: conversation.id,
        lead_id: lead.id,
        direction: 'inbound',
        sender_type: 'lead',
        content: inboundContent,
        media_url: serializeMessageMedia(media),
        twilio_sid: null,
      });
    } else {
      throw err;
    }
  }

  await conversation.update({
    last_message_at: now,
    unread_count: (conversation.unread_count || 0) + 1,
  });

  emitConversationMessage(io, {
    conversationId: conversation.id,
    businessId: business.id,
    message: inbound,
    leadName: lead.full_name,
    leadPhone: lead.phone,
    channel,
  });

  if (!lead.bot_paused) {
    try {
      const userWantsHandoff = detectHandoffIntent(body);
      let botReply;

      if (userWantsHandoff) {
        botReply = await executeHandoff({
          lead,
          businessId: business.id,
          io,
          reason: 'keyword',
        });
      } else {
        const history = await Message.findAll({
          where: { conversation_id: conversation.id },
          order: [['created_at', 'ASC']],
          limit: 20,
        });

        const botResult = await chatBot({
          messages: history,
          businessName: business.name,
        });

        await applyLeadDataFromBot(lead, botResult.leadData);

        if (botResult.handoff_required && !botResult.fallback) {
          botReply = await executeHandoff({
            lead,
            businessId: business.id,
            io,
            reason: 'claude',
          });
        } else {
          botReply = typeof botResult === 'string' ? botResult : botResult.reply;
        }
      }

      await sendBotReply({
        conversation,
        lead,
        businessId: business.id,
        io,
        body: botReply,
      });
    } catch (botErr) {
      logger.error('Error al generar respuesta del bot', {
        leadId: lead.id,
        channel,
        err: botErr.message,
      });
    }
  } else {
    logger.info('Bot pausado — mensaje guardado sin respuesta automática', {
      leadId: lead.id,
      channel,
      externalUserId,
    });
  }

  await scoreConversationIfNeeded({
    conversationId: conversation.id,
    leadId: lead.id,
    businessId: business.id,
    io,
  });

  return { lead, conversation, inbound };
}
