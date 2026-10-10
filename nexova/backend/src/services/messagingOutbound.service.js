import { sendWhatsApp } from './twilio.service.js';
import { sendMetaMessage } from './metaMessaging.service.js';

function metaRecipientFromLead(lead) {
  if (lead?.external_id) {
    const parts = String(lead.external_id).split(':');
    if (parts.length >= 2) return parts.slice(1).join(':');
  }
  const phone = String(lead?.phone || '');
  const match = phone.match(/^meta:(messenger|instagram):(.+)$/);
  return match ? match[2] : null;
}

function attachmentType(contentType) {
  return String(contentType || '').startsWith('image/') ? 'image' : 'file';
}

export async function sendOutboundMessage({ channel, lead, body, media = [] } = {}) {
  const resolvedChannel = channel || lead?.source || 'whatsapp';
  const text = String(body || '').trim();
  const files = Array.isArray(media) ? media.filter((item) => item?.publicUrl) : [];

  if (resolvedChannel === 'whatsapp') {
    if (!files.length) {
      const result = await sendWhatsApp({ to: lead.phone, body: text });
      return { provider: 'twilio', sid: result.sid, status: result.status || 'sent' };
    }
    let last = null;
    for (let i = 0; i < files.length; i += 1) {
      last = await sendWhatsApp({
        to: lead.phone,
        body: i === 0 ? text : '',
        mediaUrl: files[i].publicUrl,
      });
    }
    return { provider: 'twilio', sid: last.sid, status: last.status || 'sent' };
  }

  const recipientId = metaRecipientFromLead(lead);
  if (!recipientId) {
    throw new Error('Lead sin identificador de Meta para responder');
  }

  if (resolvedChannel === 'instagram') {
    const unsupported = files.filter((item) => attachmentType(item.contentType) !== 'image');
    if (unsupported.length) {
      throw new Error('Instagram solo permite enviar imágenes. PDF, Word y Excel envíalos por WhatsApp o Messenger.');
    }
  }

  let last = null;
  if (text) {
    last = await sendMetaMessage({
      recipientId,
      body: text,
      channel: resolvedChannel,
    });
  }
  for (const item of files) {
    last = await sendMetaMessage({
      recipientId,
      channel: resolvedChannel,
      attachment: {
        type: attachmentType(item.contentType),
        url: item.publicUrl,
      },
    });
  }
  if (!last) throw new Error('No hay texto ni archivo para enviar');

  return {
    provider: 'meta',
    sid: last.messageId,
    status: 'sent',
  };
}
