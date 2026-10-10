import { Business } from '../models/index.js';
import {
  isMetaMessagingConfigured,
  parseMetaWebhook,
  validateMetaSignature,
  fetchInstagramMessage,
} from '../services/metaMessaging.service.js';
import { processInboundMessage, resolveMetaLeadIdentity } from '../services/inboundMessage.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const BUSINESS_SLUG_DEFAULT = 'gareva-zenith';

export function metaPing(req, res) {
  res.json({
    ok: true,
    configured: isMetaMessagingConfigured(),
    instagramTokenSet: Boolean(env.metaMessaging.instagramAccessToken),
    igAppSecretSet: Boolean(env.metaMessaging.igAppSecret),
    message: 'Meta webhook route reachable',
    businessQuery: req.query.business || BUSINESS_SLUG_DEFAULT,
    time: new Date().toISOString(),
  });
}

export function metaWebhookVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token && token === env.metaMessaging.verifyToken) {
    logger.info('Meta webhook verificado');
    return res.status(200).send(challenge);
  }

  logger.warn('Meta webhook verify falló', { mode, tokenPresent: Boolean(token) });
  return res.status(403).send('Forbidden');
}

export async function metaWebhook(req, res) {
  try {
    const rawBody = Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

    logger.info('Meta webhook POST', {
      bytes: rawBody.length,
      hasSignature: Boolean(req.get('X-Hub-Signature-256')),
      contentType: req.get('content-type') || null,
    });

    if (!validateMetaSignature(req, rawBody)) {
      logger.warn('Meta webhook: firma inválida', {
        hasAppSecret: Boolean(env.metaMessaging.appSecret),
        hasSignature: Boolean(req.get('X-Hub-Signature-256')),
      });
      return res.status(403).send('Invalid signature');
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const events = parseMetaWebhook(payload);
    const entryKeys = (payload?.entry || []).map((e) => Object.keys(e || {}));

    logger.info('Meta webhook recibido', {
      object: payload?.object || null,
      entries: payload?.entry?.length || 0,
      entryKeys,
      events: events.length,
      channels: events.map((e) => e.channel),
      preview: JSON.stringify(payload).slice(0, 1200),
    });

    if (!events.length) {
      return res.status(200).send('EVENT_RECEIVED');
    }

    const businessSlug = req.query.business || BUSINESS_SLUG_DEFAULT;
    const business = await Business.findOne({ where: { slug: businessSlug } });
    if (!business) {
      logger.warn('Meta webhook: negocio no encontrado', { businessSlug });
      return res.status(404).send('Business not found');
    }

    const io = req.app.get('io');

    for (const event of events) {
      if (event.channel === 'instagram' && event.messageId && !event.text?.trim()) {
        const hydrated = await fetchInstagramMessage(event.messageId);
        if (hydrated?.message) event.text = hydrated.message;
        if (!event.senderId && hydrated?.from?.id) event.senderId = hydrated.from.id;
      }

      logger.info('Meta evento', {
        channel: event.channel,
        senderId: event.senderId || null,
        hasText: Boolean(event.text?.trim()),
        messageId: event.messageId || null,
      });

      if (!event.senderId) {
        logger.warn('Meta evento sin senderId, se ignora', { channel: event.channel, messageId: event.messageId });
        continue;
      }

      if (
        event.channel === 'instagram'
        && env.metaMessaging.instagramAccountId
        && String(event.senderId) === String(env.metaMessaging.instagramAccountId)
      ) {
        logger.info('Echo Instagram ignorado (mismo ID de cuenta)');
        continue;
      }

      const identity = await resolveMetaLeadIdentity({
        channel: event.channel,
        senderId: event.senderId,
      });

      await processInboundMessage({
        business,
        channel: event.channel,
        externalUserId: event.senderId,
        externalId: identity.externalId,
        phone: identity.syntheticPhone,
        fullName: identity.fullName,
        body: event.text,
        messageId: event.messageId,
        media: event.attachments,
        io,
      });
    }

    return res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    logger.error('Error en webhook Meta', { err: err.message, stack: err.stack });
    return res.status(200).send('EVENT_RECEIVED');
  }
}

export function getMetaMessagingStatus(req, res) {
  res.json({
    configured: isMetaMessagingConfigured(),
    verifyTokenSet: Boolean(env.metaMessaging.verifyToken),
    appSecretSet: Boolean(env.metaMessaging.appSecret),
    pageId: env.facebook.pageId || null,
  });
}
