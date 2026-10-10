import fs from 'fs';
import path from 'path';
import { Op } from 'sequelize';
import {
  Conversation, Message, Lead, ConversationScore, Business, LeadAssignment, Asesor, User,
} from '../models/index.js';
import { buildScopeWhere, applyLeadScope } from '../middlewares/scopeFilter.js';
import { generateId } from '../utils/uuid.js';
import { sendOutboundMessage } from '../services/messagingOutbound.service.js';
import { fetchMetaMedia } from '../services/metaMessaging.service.js';
import { fetchTwilioMedia } from '../services/twilio.service.js';
import { scoreConversationIfNeeded } from '../services/conversationScorer.service.js';
import { assignLeadToAsesor, assignLeadToBestAsesor, recordFirstResponse } from '../services/assignmentEngine.service.js';
import { emitConversationMessage } from '../utils/socketEvents.js';
import { parseMessageMediaField, backfillMessageMedia, isMetaPlatformMessageId, serializeMessageMedia } from '../utils/messageMedia.js';
import { isMetaMessagingConfigured } from '../services/metaMessaging.service.js';
import { isFacebookConfigured } from '../services/facebook.service.js';
import { env } from '../config/env.js';
import { saveChatAttachmentsFromJson } from '../middlewares/upload.js';
import { logger } from '../utils/logger.js';

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function mimeFromFilename(filename, fallback = 'application/octet-stream') {
  const ext = path.extname(filename || '').toLowerCase();
  return MIME_BY_EXT[ext] || fallback;
}

function publicFileUrl(relativeUrl) {
  const rel = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  const chatMatch = rel.match(/^\/uploads\/chat\/([^/]+)\/([^/]+)$/);
  if (chatMatch) {
    return `${env.publicUrl}/api/public/chat-files/${chatMatch[1]}/${encodeURIComponent(chatMatch[2])}`;
  }
  return `${env.publicUrl}${rel}`;
}

export function getPublicChatFile(req, res) {
  const { conversationId, filename } = req.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(filename || '')) {
    return res.status(400).json({ error: 'Archivo inválido' });
  }
  const filePath = path.resolve(process.cwd(), 'uploads', 'chat', conversationId, filename);
  const root = path.resolve(process.cwd(), 'uploads', 'chat');
  if (!filePath.startsWith(root) || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  res.setHeader('Content-Type', mimeFromFilename(filename));
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.sendFile(filePath);
}

function resolveLocalUpload(url) {
  if (!url) return null;
  const raw = String(url);
  const match = raw.match(/\/uploads\/.+$/);
  if (!match && !raw.startsWith('/uploads/')) return null;
  const rel = (match ? match[0] : raw).split('?')[0];
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const filePath = path.resolve(process.cwd(), rel.replace(/^\//, '').replace(/\//g, path.sep));
  if (!filePath.startsWith(uploadsRoot)) return null;
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

function buildOutboundContent(text, files) {
  const trimmed = String(text || '').trim();
  if (trimmed) return trimmed;
  if (!files.length) return '';
  if (files.every((f) => String(f.contentType || '').startsWith('image/'))) {
    return files.length === 1 ? '📷 Imagen' : `📷 ${files.length} imágenes`;
  }
  if (files.length === 1) return `📎 ${files[0].filename}`;
  return `📎 ${files.length} archivos`;
}

async function assertConversationAccess(req, conversationId) {
  const conv = await Conversation.findByPk(conversationId);
  if (!conv) return { error: { status: 404, message: 'Conversación no encontrada' } };
  const leadWhere = applyLeadScope({ id: conv.lead_id }, req);
  const lead = await Lead.findOne({ where: leadWhere });
  if (!lead) return { error: { status: 403, message: 'Sin acceso' } };
  return { conv, lead };
}

async function enrichMessagesWithSenderNames(messages) {
  const asesorIds = [...new Set(
    messages.filter((m) => m.sender_type === 'asesor' && m.sender_id).map((m) => m.sender_id),
  )];
  const userIds = [...new Set(
    messages.filter((m) => m.sender_type === 'admin' && m.sender_id).map((m) => m.sender_id),
  )];

  const asesores = asesorIds.length
    ? await Asesor.findAll({ where: { id: asesorIds }, attributes: ['id', 'name'] })
    : [];
  const users = userIds.length
    ? await User.findAll({ where: { id: userIds }, attributes: ['id', 'full_name'] })
    : [];

  const asesorMap = Object.fromEntries(asesores.map((a) => [a.id, a.name]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.full_name]));

  return messages.map((m) => {
    const json = typeof m.toJSON === 'function' ? m.toJSON() : { ...m };
    if (json.sender_type === 'asesor') {
      json.sender_name = asesorMap[json.sender_id] || 'Asesor';
    } else if (json.sender_type === 'admin') {
      json.sender_name = userMap[json.sender_id] || 'Admin';
    } else if (json.sender_type === 'bot') {
      json.sender_name = 'Bot IA';
    } else if (json.sender_type === 'lead') {
      json.sender_name = 'Lead';
    } else if (json.sender_type === 'system') {
      json.sender_name = 'Sistema';
    }
    return json;
  });
}

export async function listConversations(req, res) {
  if (req.user.role === 'asesor' && req.scope?.leadIds?.length === 0) {
    return res.json({ data: [] });
  }
  if (req.user.role === 'admin' && req.scope?.leadIds?.length === 0) {
    return res.json({ data: [] });
  }

  const businessWhere = buildScopeWhere(req);
  const leadFilter = (req.user.role === 'asesor' || req.user.role === 'admin') && req.scope?.leadIds?.length
    ? { id: { [Op.in]: req.scope.leadIds } }
    : undefined;

  const conversations = await Conversation.findAll({
    where: businessWhere.business_id ? { business_id: businessWhere.business_id } : {},
    include: [
      {
        model: Lead,
        where: leadFilter,
        required: Boolean(leadFilter),
        include: [{
          model: LeadAssignment,
          where: { status: { [Op.notIn]: ['reasignado', 'perdido'] } },
          required: false,
          include: [{ model: Asesor, attributes: ['id', 'name'] }],
        }],
      },
      { model: ConversationScore, required: false },
    ],
    order: [['last_message_at', 'DESC']],
  });
  const sorted = [...conversations].sort((a, b) => {
    const sa = a.conversation_score?.score || 0;
    const sb = b.conversation_score?.score || 0;
    return sb - sa;
  });
  res.json({ data: sorted });
}

export async function getMessagingStatus(req, res) {
  res.json({
    whatsapp: {
      configured: Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.whatsappNumber),
    },
    meta: {
      configured: isMetaMessagingConfigured(),
      messenger: isMetaMessagingConfigured(),
      instagram: isMetaMessagingConfigured(),
      pageConfigured: isFacebookConfigured(),
    },
  });
}

export async function getMessages(req, res) {
  const access = await assertConversationAccess(req, req.params.id);
  if (access.error) return res.status(access.error.status).json({ error: access.error.message });

  const { conv } = access;
  const rows = await Message.findAll({
    where: { conversation_id: conv.id },
    order: [['created_at', 'ASC']],
  });

  await Promise.all(rows.map(async (message) => {
    try {
      if (!message.media_url && message.twilio_sid && message.direction === 'inbound') {
        if (!isMetaPlatformMessageId(message.twilio_sid)) {
          await backfillMessageMedia(message);
        }
      }
    } catch (err) {
      console.warn('backfill media falló', message.id, err.message);
    }
  }));

  const messages = rows;
  await conv.update({ unread_count: 0 });
  const data = await enrichMessagesWithSenderNames(messages);
  res.json({ data, conversation: { ...conv.toJSON(), unread_count: 0 } });
}

export async function markConversationRead(req, res) {
  const access = await assertConversationAccess(req, req.params.id);
  if (access.error) return res.status(access.error.status).json({ error: access.error.message });

  await access.conv.update({ unread_count: 0 });
  res.json({ ok: true, conversationId: access.conv.id });
}

export async function getMessageMedia(req, res) {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Mensaje no encontrado' });

    const access = await assertConversationAccess(req, message.conversation_id);
    if (access.error) return res.status(access.error.status).json({ error: access.error.message });

    await backfillMessageMedia(message);
    await message.reload();

    let mediaList = parseMessageMediaField(message.media_url);
    const index = Math.max(0, parseInt(req.query.index || '0', 10));
    const item = mediaList[index];
    if (!item?.url) return res.status(404).json({ error: 'Este mensaje no tiene adjuntos' });

    const localPath = resolveLocalUpload(item.url);
    let buffer;
    let contentType = item.contentType || 'application/octet-stream';
    if (localPath) {
      buffer = fs.readFileSync(localPath);
      contentType = item.contentType || mimeFromFilename(localPath, contentType);
    } else if (item.url?.includes('fbcdn.net') || item.url?.includes('facebook.com') || item.url?.includes('cdninstagram.com')) {
      const fetched = await fetchMetaMedia(item.url);
      buffer = fetched.buffer;
      contentType = fetched.contentType || contentType;
    } else {
      const fetched = await fetchTwilioMedia(item.url);
      buffer = fetched.buffer;
      contentType = fetched.contentType || contentType;
    }

    const filename = item.filename || item.name || path.basename(localPath || item.url);
    const isImage = String(contentType).startsWith('image/');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader(
      'Content-Disposition',
      `${isImage ? 'inline' : 'attachment'}; filename="${encodeURIComponent(filename)}"`,
    );
    return res.send(buffer);
  } catch (err) {
    console.error('getMessageMedia error', err.message);
    return res.status(502).json({ error: 'No se pudo cargar el adjunto' });
  }
}

export async function sendMessage(req, res) {
  const text = (req.body?.content || '').trim();
  const uploaded = Array.isArray(req.files) ? req.files : [];
  const fromMultipart = uploaded.map((file) => {
    const relativeUrl = `/uploads/chat/${req.params.id}/${file.filename}`;
    return {
      url: relativeUrl,
      publicUrl: publicFileUrl(relativeUrl),
      contentType: file.mimetype || mimeFromFilename(file.originalname),
      filename: file.originalname || file.filename,
    };
  });
  const fromJson = saveChatAttachmentsFromJson(req.params.id, req.body?.attachments).map((item) => ({
    ...item,
    publicUrl: publicFileUrl(item.url),
  }));
  const media = [...fromMultipart, ...fromJson];
  const content = buildOutboundContent(text, media);
  if (!content) return res.status(400).json({ error: 'Escribe un mensaje o adjunta un archivo' });
  logger.info('CRM: enviando mensaje', {
    conversationId: req.params.id,
    files: media.length,
    hasText: Boolean(text),
  });

  const conv = await Conversation.findByPk(req.params.id, { include: [Lead] });
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });
  const leadWhere = applyLeadScope({ id: conv.lead_id }, req);
  const lead = await Lead.findOne({ where: leadWhere });
  if (!lead) return res.status(403).json({ error: 'Sin acceso' });

  const senderType = req.user.role === 'asesor' ? 'asesor' : 'admin';
  const senderId = req.user.role === 'asesor' ? req.user.asesorId : req.user.id;

  const msg = await Message.create({
    id: generateId(),
    conversation_id: conv.id,
    lead_id: lead.id,
    direction: 'outbound',
    sender_type: senderType,
    sender_id: senderId,
    content,
    media_url: serializeMessageMedia(media),
  });

  try {
    const sent = await sendOutboundMessage({
      channel: conv.channel,
      lead,
      body: text,
      media,
    });
    await msg.update({ twilio_sid: String(sent.sid || '').slice(0, 512) || null, status: sent.status || 'sent' });
  } catch (err) {
    await msg.update({ status: 'failed' });
    const channelLabel = conv.channel === 'instagram' ? 'Instagram' : conv.channel === 'messenger' ? 'Messenger' : 'WhatsApp';
    return res.status(502).json({
      error: `No se pudo enviar por ${channelLabel}: ${err.message}`,
      data: msg.toJSON(),
    });
  }

  await conv.update({ last_message_at: new Date() });
  await lead.update({ last_contact_at: new Date() });

  const assignment = await LeadAssignment.findOne({
    where: {
      lead_id: lead.id,
      ...(req.user.asesorId ? { asesor_id: req.user.asesorId } : {}),
      first_response_at: null,
      status: { [Op.notIn]: ['reasignado', 'perdido'] },
    },
  });
  if (assignment) await recordFirstResponse(assignment.id);

  const io = req.app.get('io');
  emitConversationMessage(io, {
    conversationId: conv.id,
    businessId: conv.business_id,
    message: msg,
    channel: conv.channel,
  });

  await scoreConversationIfNeeded({
    conversationId: conv.id,
    leadId: lead.id,
    businessId: conv.business_id,
    io,
  });

  res.json({
    data: {
      ...msg.toJSON(),
      sender_name: req.user.role === 'asesor'
        ? (await Asesor.findByPk(req.user.asesorId, { attributes: ['name'] }))?.name || 'Asesor'
        : req.user.fullName || 'Admin',
    },
  });
}

export async function takeConversation(req, res) {
  const conv = await Conversation.findByPk(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' });

  const leadWhere = applyLeadScope({ id: conv.lead_id }, req);
  const lead = await Lead.findOne({ where: leadWhere });
  if (!lead) return res.status(403).json({ error: 'Sin acceso' });

  const asesorId = req.user.asesorId;
  if (!asesorId) {
    return res.status(400).json({ error: 'Solo un asesor puede tomar la conversación' });
  }

  const existing = await LeadAssignment.findOne({
    where: { lead_id: lead.id, status: { [Op.notIn]: ['reasignado', 'perdido'] } },
  });
  if (existing && existing.asesor_id !== asesorId) {
    const other = await Asesor.findByPk(existing.asesor_id, { attributes: ['name'] });
    return res.status(409).json({
      error: `Este lead ya está asignado a ${other?.name || 'otro asesor'}`,
    });
  }

  await lead.update({ bot_paused: true, bot_paused_by: asesorId });

  let assignment = existing;
  if (!assignment) {
    assignment = await assignLeadToAsesor({
      leadId: lead.id,
      asesorId,
      businessId: conv.business_id,
      reason: 'Tomó la conversación desde CRM',
      io: req.app.get('io'),
      notify: false,
    });
  }

  req.app.get('io')?.emit('conversation:asesor_active', { leadId: lead.id, asesorId });
  req.app.get('io')?.emit('lead:status_changed', { leadId: lead.id, bot_paused: true });

  res.json({ data: { lead, assignment } });
}
