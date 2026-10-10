import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const GRAPH_BASE = `https://graph.facebook.com/${env.facebook.graphVersion}`;

export function isMetaMessagingConfigured() {
  return Boolean(
    env.metaMessaging.enabled
    && env.facebook.pageAccessToken
    && env.facebook.pageId,
  );
}

function signatureMatches(rawBody, receivedHex, secret) {
  if (!secret || !receivedHex) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    const a = Buffer.from(receivedHex, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function validateMetaSignature(req, rawBody) {
  if (env.metaMessaging.skipSignatureValidation) return true;

  const signature = req.get('X-Hub-Signature-256') || '';
  if (!signature.startsWith('sha256=')) return false;
  const received = signature.slice(7);
  const secrets = [
    env.metaMessaging.appSecret,
    env.metaMessaging.igAppSecret,
  ].filter(Boolean);

  if (!secrets.length) return false;
  return secrets.some((secret) => signatureMatches(rawBody, received, secret));
}

function mapAttachments(message) {
  return (message?.attachments || []).map((att) => ({
    type: att.type,
    url: att.payload?.url || att.payload?.url || null,
    contentType: att.type === 'image' ? 'image/jpeg' : att.type === 'video' ? 'video/mp4' : 'application/octet-stream',
  })).filter((att) => att.url);
}

function pushMessagingItem(events, channel, item) {
  if (!item || item.delivery || item.read || item.postback) return;
  const message = item.message;
  if (!message || message.is_echo || message.is_deleted || message.is_self) return;

  const senderId = item.sender?.id || item.from?.id || item.sender_id || null;
  const text = message.text
    || message.body
    || item.text
    || message.quick_reply?.payload
    || '';

  events.push({
    channel,
    senderId,
    recipientId: item.recipient?.id || item.to?.id || null,
    messageId: message.mid || message.id || item.mid || item.id || null,
    text,
    attachments: mapAttachments(message),
    timestamp: item.timestamp,
  });
}

export function parseMetaWebhook(payload) {
  const events = [];
  const objectType = payload?.object;
  const channel = objectType === 'instagram' ? 'instagram' : 'messenger';

  for (const entry of payload?.entry || []) {
    for (const item of entry.messaging || []) {
      pushMessagingItem(events, channel, item);
    }
    for (const item of entry.standby || []) {
      pushMessagingItem(events, channel, item);
    }

    // Instagram API (Login) suele mandar entry.changes en vez de entry.messaging
    for (const change of entry.changes || []) {
      const field = change.field || change.value?.field;
      const value = change.value || {};
      if (field && !['messages', 'message', 'messaging'].includes(field)) continue;

      const items = Array.isArray(value.messaging)
        ? value.messaging
        : Array.isArray(value.messages)
          ? value.messages
          : [value];
      for (const item of items) {
        const message = item.message || (item.mid || item.id || item.text ? item : null);
        if (!message) continue;
        pushMessagingItem(events, 'instagram', {
          sender: item.sender || { id: item.from?.id || item.sender_id },
          recipient: item.recipient || { id: item.to?.id || entry.id },
          timestamp: item.timestamp || value.timestamp,
          message: {
            mid: message.mid || item.mid || item.id,
            text: message.text || item.text || '',
            attachments: message.attachments || item.attachments,
            is_echo: message.is_echo || message.is_self,
          },
        });
      }
    }
  }

  return events;
}

function instagramAuthToken() {
  return env.metaMessaging.instagramAccessToken || env.facebook.pageAccessToken || '';
}

export async function fetchInstagramMessage(messageId) {
  if (!messageId || !instagramAuthToken()) return null;
  const token = instagramAuthToken();
  const endpoints = [
    `https://graph.instagram.com/${env.facebook.graphVersion}/${messageId}?fields=id,from,message,created_time&access_token=${encodeURIComponent(token)}`,
    `${GRAPH_BASE}/${messageId}?fields=id,from,message,created_time&access_token=${encodeURIComponent(token)}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && (data.message || data.from)) return data;
      logger.warn('Meta: no se pudo leer mensaje IG', { messageId, error: data?.error?.message });
    } catch (err) {
      logger.warn('Meta: error al leer mensaje IG', { messageId, err: err.message });
    }
  }
  return null;
}

export async function fetchMetaUserProfile(userId, { channel = 'messenger' } = {}) {
  const token = channel === 'instagram' ? instagramAuthToken() : env.facebook.pageAccessToken;
  if (!userId || !token) return null;

  const fieldSets = channel === 'instagram'
    ? ['name,username,profile_pic', 'name,username', 'name']
    : ['first_name,last_name,name,profile_pic', 'first_name,last_name,name', 'name'];

  const bases = channel === 'instagram'
    ? [`https://graph.instagram.com/${env.facebook.graphVersion}`, GRAPH_BASE]
    : [GRAPH_BASE];

  for (const base of bases) {
    for (const fields of fieldSets) {
      try {
        const params = new URLSearchParams({ fields, access_token: token });
        const res = await fetch(`${base}/${userId}?${params}`);
        const data = await res.json();
        if (res.ok) return data;
        logger.warn('Meta: no se pudo obtener perfil', { userId, channel, fields, error: data?.error?.message });
      } catch (err) {
        logger.warn('Meta: error al obtener perfil', { userId, channel, err: err.message });
      }
    }
  }
  return null;
}

export function buildMetaDisplayName(profile, fallbackId) {
  if (!profile) return fallbackId;
  if (profile.name) return profile.name;
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (profile.username) return `@${profile.username}`;
  return fallbackId;
}

async function postGraphMessage(url, token, payload) {
  const attempts = [
    {
      href: `${url}?access_token=${encodeURIComponent(token)}`,
      headers: { 'Content-Type': 'application/json' },
    },
    {
      href: url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  ];

  let lastError = 'No se pudo enviar mensaje por Meta';
  for (const attempt of attempts) {
    const res = await fetch(attempt.href, {
      method: 'POST',
      headers: attempt.headers,
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    lastError = data?.error?.message || lastError;
  }
  throw new Error(lastError);
}

function buildMetaMessage({ text, attachment }) {
  if (attachment?.url) {
    return {
      attachment: {
        type: attachment.type || 'file',
        payload: { url: attachment.url, is_reusable: true },
      },
    };
  }
  return { text: String(text || '').trim() || ' ' };
}

export async function sendMetaMessage({ recipientId, body, channel = 'messenger', attachment } = {}) {
  if (!recipientId) throw new Error('Destinatario Meta inválido');

  const text = String(body || '').trim();
  if (!text && !attachment?.url) throw new Error('Mensaje Meta vacío');

  const igToken = env.metaMessaging.instagramAccessToken;
  const pageToken = env.facebook.pageAccessToken;
  const igAccountId = env.metaMessaging.instagramAccountId;
  const version = env.facebook.graphVersion;
  const message = buildMetaMessage({ text, attachment });

  const targets = [];
  if (channel === 'instagram' && igToken) {
    targets.push({
      url: `https://graph.instagram.com/${version}/me/messages`,
      token: igToken,
      payload: { recipient: { id: String(recipientId) }, message },
    });
    if (igAccountId) {
      targets.push({
        url: `https://graph.instagram.com/${version}/${igAccountId}/messages`,
        token: igToken,
        payload: { recipient: { id: String(recipientId) }, message },
      });
    }
  }
  if (pageToken) {
    targets.push({
      url: `${GRAPH_BASE}/me/messages`,
      token: pageToken,
      payload: {
        recipient: { id: String(recipientId) },
        message,
        messaging_type: 'RESPONSE',
      },
    });
  }

  if (!targets.length) {
    throw new Error(channel === 'instagram'
      ? 'Falta INSTAGRAM_ACCESS_TOKEN o FACEBOOK_PAGE_ACCESS_TOKEN para responder Instagram'
      : 'Meta Messenger no está configurado (FACEBOOK_PAGE_ACCESS_TOKEN / FACEBOOK_PAGE_ID)');
  }

  let lastError = 'No se pudo enviar mensaje por Meta';
  for (const target of targets) {
    try {
      const data = await postGraphMessage(target.url, target.token, target.payload);
      logger.info('Meta: mensaje enviado', { channel, recipientId, messageId: data.message_id, endpoint: target.url });
      return { messageId: data.message_id, recipientId: data.recipient_id };
    } catch (err) {
      lastError = err.message;
      logger.warn('Meta: intento de envío falló', { channel, endpoint: target.url, err: lastError });
    }
  }

  throw new Error(lastError);
}

export async function fetchMetaMedia(url) {
  if (!url) throw new Error('URL de adjunto vacía');

  const token = env.facebook.pageAccessToken;
  const fetchUrl = url.includes('access_token=') ? url : `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(fetchUrl);
  if (!res.ok) {
    throw new Error(`No se pudo descargar adjunto Meta (${res.status})`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  return { buffer, contentType };
}
