/**
 * PM2 — NEXOVA API (Windows / Linux)
 * Carga .env antes de arrancar para que CORS y FRONTEND_URL siempre estén actualizados.
 * Uso: pm2 start ecosystem.config.cjs
 * Tras cambiar .env: pm2 restart nexova-api --update-env
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

function pickEnv(keys) {
  return keys.reduce((acc, key) => {
    if (process.env[key] !== undefined) acc[key] = process.env[key];
    return acc;
  }, {});
}

const envFromFile = pickEnv([
  'PORT',
  'NODE_ENV',
  'FRONTEND_URL',
  'CORS_ORIGINS',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_SSL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRY',
  'JWT_REFRESH_EXPIRY',
  'ENCRYPTION_KEY',
  'ANTHROPIC_API_KEY',
  'CLAUDE_MODEL',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_WEBHOOK_URL',
  'TWILIO_SKIP_SIGNATURE_VALIDATION',
  'PUBLIC_URL',
  'FACEBOOK_ENABLED',
  'FACEBOOK_PAGE_ID',
  'FACEBOOK_PAGE_ACCESS_TOKEN',
  'FACEBOOK_GRAPH_VERSION',
  'FACEBOOK_WHATSAPP_CONTACT',
  'META_MESSAGING_ENABLED',
  'META_VERIFY_TOKEN',
  'META_APP_SECRET',
  'META_IG_APP_SECRET',
  'INSTAGRAM_APP_SECRET',
  'INSTAGRAM_ACCOUNT_ID',
  'INSTAGRAM_ACCESS_TOKEN',
  'META_SKIP_SIGNATURE_VALIDATION',
  'TZ',
]);

module.exports = {
  apps: [
    {
      name: 'nexova-api',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      watch: false,
      env: {
        NODE_ENV: 'production',
        ...envFromFile,
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
