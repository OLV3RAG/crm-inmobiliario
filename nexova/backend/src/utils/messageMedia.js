/** Normaliza media_url (JSON array o URL legacy) a lista de { url, contentType }. */
export function parseMessageMediaField(mediaUrl) {
  if (!mediaUrl) return [];
  const raw = String(mediaUrl).trim();
  if (!raw) return [];

  if (raw.startsWith('[') || raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item?.url);
      }
      if (parsed?.url) return [parsed];
    } catch {
      /* legacy URL below */
    }
  }

  return [{ url: raw, contentType: 'image/jpeg' }];
}

export function serializeMessageMedia(mediaItems) {
  if (!mediaItems?.length) return null;
  return JSON.stringify(mediaItems);
}

function isPlaceholderContent(content) {
  const value = (content || '').trim();
  return !value || value === '(sin texto)' || value === '📷 Imagen';
}

export function normalizeProviderMessageId(messageId, maxLen = 512) {
  if (!messageId) return null;
  const value = String(messageId);
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}

export function isTwilioMessageSid(messageId) {
  return /^(SM|MM|IM)[0-9a-f]{32}$/i.test(String(messageId || ''));
}

/** IDs de Meta Messenger/Instagram (mid) — no son SIDs de Twilio. */
export function isMetaPlatformMessageId(messageId) {
  const value = String(messageId || '');
  if (!value) return false;
  return !isTwilioMessageSid(value);
}

export async function backfillMessageMedia(message) {
  if (!message?.twilio_sid || message.direction !== 'inbound') return message;
  if (isMetaPlatformMessageId(message.twilio_sid)) return message;
  if (parseMessageMediaField(message.media_url).length) return message;

  const { listMessageMediaFromSid } = await import('../services/twilio.service.js');
  const media = await listMessageMediaFromSid(message.twilio_sid);
  if (!media.length) return message;

  const updates = { media_url: serializeMessageMedia(media) };
  if (isPlaceholderContent(message.content)) {
    updates.content = '📷 Imagen';
  }
  await message.update(updates);
  return message;
}
