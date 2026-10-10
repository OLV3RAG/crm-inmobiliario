import twilio from 'twilio';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let client = null;

function getTwilioClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken) return null;
  if (!client) {
    client = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return client;
}

export function isTwilioConfigured() {
  return Boolean(
    env.twilio.accountSid &&
    env.twilio.authToken &&
    env.twilio.whatsappNumber
  );
}

/** URL exacta que Twilio firmó (debe coincidir con la del panel de Twilio). */
export function buildTwilioWebhookUrl(req) {
  if (env.twilio.webhookUrl) {
    return env.twilio.webhookUrl;
  }
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https')
    .split(',')[0]
    .trim();
  const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
  return `${proto}://${host}${req.originalUrl}`;
}

export async function sendWhatsApp({ to, body, mediaUrl } = {}) {
  const twilioClient = getTwilioClient();
  if (!twilioClient) {
    logger.error('Twilio no configurado — no se envió WhatsApp. Revisa TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN y TWILIO_WHATSAPP_NUMBER en .env', {
      to: to?.slice?.(0, 20),
    });
    throw new Error('Twilio no configurado en el servidor');
  }

  const from = env.twilio.whatsappNumber;
  if (!from?.startsWith('whatsapp:')) {
    throw new Error('TWILIO_WHATSAPP_NUMBER debe empezar con whatsapp: (ej. whatsapp:+14155238886)');
  }

  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const text = String(body || '').trim();
  const media = mediaUrl ? [mediaUrl] : undefined;
  if (!text && !media) {
    throw new Error('El mensaje de WhatsApp no puede ir vacío');
  }

  try {
    const message = await twilioClient.messages.create({
      from,
      to: toFormatted,
      ...(text ? { body: text } : {}),
      ...(media ? { mediaUrl: media } : {}),
    });
    logger.info('WhatsApp enviado', { sid: message.sid, to: toFormatted, hasMedia: Boolean(media) });
    return { sid: message.sid, status: message.status };
  } catch (err) {
    logger.error('Error al enviar WhatsApp', {
      code: err.code,
      message: err.message,
      status: err.status,
      to: toFormatted,
      from,
    });
    throw err;
  }
}

export function validateTwilioSignature(req) {
  if (env.twilio.skipSignatureValidation) {
    logger.warn('Validación de firma Twilio desactivada (TWILIO_SKIP_SIGNATURE_VALIDATION)');
    return true;
  }
  if (!env.twilio.authToken) {
    logger.warn('TWILIO_AUTH_TOKEN no configurado — webhook rechazado');
    return false;
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    logger.warn('Webhook Twilio sin X-Twilio-Signature');
    return false;
  }

  const candidates = new Set();
  if (env.twilio.webhookUrl) candidates.add(env.twilio.webhookUrl.trim());
  candidates.add(buildTwilioWebhookUrl(req));

  for (const url of [...candidates]) {
    if (url.startsWith('https://')) candidates.add(url.replace('https://', 'http://'));
    else if (url.startsWith('http://')) candidates.add(url.replace('http://', 'https://'));
  }

  for (const url of candidates) {
    if (twilio.validateRequest(env.twilio.authToken, signature, url, req.body)) {
      if (env.twilio.webhookUrl && url !== env.twilio.webhookUrl.trim()) {
        logger.info('Firma Twilio OK con URL distinta a TWILIO_WEBHOOK_URL', { urlUsed: url });
      }
      return true;
    }
  }

  logger.warn('Firma Twilio inválida', {
    tried: [...candidates],
    host: req.get('host'),
    forwardedHost: req.get('x-forwarded-host'),
    configuredWebhook: env.twilio.webhookUrl || null,
  });
  return false;
}

export function parseTwilioWebhook(body) {
  const payload = body || {};
  const from = (payload.From || '').replace('whatsapp:', '');
  const to = (payload.To || '').replace('whatsapp:', '');
  const numMedia = parseInt(payload.NumMedia || '0', 10);

  const mediaByIndex = new Map();
  for (const [key, value] of Object.entries(payload)) {
    const match = String(key).match(/^MediaUrl(\d+)$/i);
    if (!match || !value) continue;
    const index = parseInt(match[1], 10);
    const typeKey = `MediaContentType${index}`;
    const contentType = payload[typeKey]
      || payload[typeKey.toLowerCase()]
      || payload[`mediaContentType${index}`]
      || '';
    mediaByIndex.set(index, { url: String(value), contentType: String(contentType) });
  }

  const media = [...mediaByIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, item]) => item);

  return {
    from,
    to,
    body: payload.Body || '',
    messageSid: payload.MessageSid || payload.SmsMessageSid,
    profileName: payload.ProfileName,
    numMedia,
    media,
  };
}

function buildTwilioMediaContentUrl(uri) {
  if (!uri) return '';
  const path = String(uri).replace(/\.json$/i, '');
  if (path.startsWith('http')) return path;
  return `https://api.twilio.com${path}`;
}

export async function listMessageMediaFromSid(messageSid) {
  const twilioClient = getTwilioClient();
  if (!twilioClient || !messageSid) return [];

  try {
    const items = await twilioClient.messages(messageSid).media.list({ limit: 10 });
    return items.map((item) => ({
      url: buildTwilioMediaContentUrl(item.uri),
      contentType: item.contentType || '',
      sid: item.sid,
    }));
  } catch (err) {
    logger.error('Error listando media en Twilio', { messageSid, err: err.message });
    return [];
  }
}

export async function resolveInboundMedia({ webhookMedia, messageSid }) {
  if (webhookMedia?.length) return webhookMedia;
  if (!messageSid) return [];
  return listMessageMediaFromSid(messageSid);
}

export async function fetchTwilioMedia(mediaUrl) {
  if (!mediaUrl) throw new Error('URL de media requerida');
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    throw new Error('Twilio no configurado');
  }

  const auth = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString('base64');
  const normalizedUrl = String(mediaUrl).replace(/\.json$/i, '');

  let res = await fetch(normalizedUrl, {
    headers: { Authorization: `Basic ${auth}` },
    redirect: 'follow',
  });

  if (!res.ok) {
    const sidMatch = normalizedUrl.match(/Messages\/(MM[a-z0-9]+)\/Media\/(ME[a-z0-9]+)/i);
    if (sidMatch) {
      const [, messageSid, mediaSid] = sidMatch;
      const contentUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages/${messageSid}/Media/${mediaSid}`;
      res = await fetch(contentUrl, {
        headers: { Authorization: `Basic ${auth}` },
        redirect: 'follow',
      });
    }
  }

  if (!res.ok) {
    logger.error('fetchTwilioMedia falló', { status: res.status, url: normalizedUrl.slice(0, 80) });
    throw new Error(`No se pudo descargar media de Twilio (HTTP ${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return { buffer, contentType };
}
