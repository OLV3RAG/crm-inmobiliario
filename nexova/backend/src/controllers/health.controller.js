import { sequelize } from '../config/database.js';
import { isTwilioConfigured } from '../services/twilio.service.js';
import { env } from '../config/env.js';

export async function health(req, res) {
  let db = 'ok';
  try {
    await sequelize.authenticate();
  } catch {
    db = 'error';
  }

  res.json({
    status: db === 'ok' ? 'ok' : 'degraded',
    service: 'nexova-api',
    db,
    twilio: isTwilioConfigured() ? 'configured' : 'not_configured',
    claude: env.anthropic.apiKey ? 'configured' : 'not_configured',
    twilioWebhookUrlSet: Boolean(env.twilio.webhookUrl),
    twilioWebhookUrl: env.twilio.webhookUrl || null,
    whatsappHint: !isTwilioConfigured()
      ? 'Faltan TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_NUMBER en backend/.env'
      : !env.twilio.webhookUrl
        ? 'Define TWILIO_WEBHOOK_URL con la URL exacta del panel Twilio'
        : null,
  });
}
