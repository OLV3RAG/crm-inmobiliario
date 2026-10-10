import { parseTwilioWebhook, validateTwilioSignature, resolveInboundMedia } from '../services/twilio.service.js';
import { Business } from '../models/index.js';
import { processInboundMessage } from '../services/inboundMessage.service.js';
import { logger } from '../utils/logger.js';

const BUSINESS_SLUG_DEFAULT = 'gareva-zenith';

/** Abre en el navegador o curl — confirma que IIS llega a Node (sin Twilio). */
export function twilioPing(req, res) {
  res.json({
    ok: true,
    message: 'Webhook route reachable',
    businessQuery: req.query.business || BUSINESS_SLUG_DEFAULT,
    time: new Date().toISOString(),
  });
}

export async function twilioWebhook(req, res) {
  logger.info('POST /webhooks/twilio', {
    ip: req.ip,
    host: req.get('host'),
    originalUrl: req.originalUrl,
  });

  try {
    if (!validateTwilioSignature(req)) {
      return res.status(403).send('Invalid signature');
    }

    const parsed = parseTwilioWebhook(req.body);
    const media = await resolveInboundMedia({
      webhookMedia: parsed.media,
      messageSid: parsed.messageSid,
    });

    logger.info('Webhook Twilio recibido', {
      from: parsed.from,
      sid: parsed.messageSid,
      bodyPreview: parsed.body?.slice(0, 80),
      numMedia: parsed.numMedia,
      mediaResolved: media.length,
    });

    const businessSlug = req.query.business || BUSINESS_SLUG_DEFAULT;
    const business = await Business.findOne({ where: { slug: businessSlug } });
    if (!business) {
      logger.warn('Webhook Twilio: negocio no encontrado', { businessSlug });
      return res.status(404).send('Business not found');
    }

    await processInboundMessage({
      business,
      channel: 'whatsapp',
      externalUserId: parsed.from,
      externalId: null,
      phone: parsed.from,
      fullName: parsed.profileName || parsed.from,
      body: parsed.body,
      messageId: parsed.messageSid,
      media,
      io: req.app.get('io'),
    });

    res.status(200).type('text/xml').send('<Response></Response>');
  } catch (err) {
    logger.error('Error en webhook Twilio', { err: err.message, stack: err.stack });
    res.status(200).type('text/xml').send('<Response></Response>');
  }
}
