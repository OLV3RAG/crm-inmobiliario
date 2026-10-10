import dotenv from 'dotenv';
dotenv.config({ override: true });

const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];

export function validateEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length && process.env.NODE_ENV === 'production') {
    throw new Error(`Variables de entorno faltantes: ${missing.join(', ')}`);
  }
}

export const env = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  /** Orígenes extra separados por coma (ej. https://www.tudominio.com) */
  corsOrigins: process.env.CORS_ORIGINS || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'nexova_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    /** URL pública exacta del webhook en Twilio (incluye ?business=...) */
    webhookUrl: process.env.TWILIO_WEBHOOK_URL,
    skipSignatureValidation: process.env.TWILIO_SKIP_SIGNATURE_VALIDATION === 'true',
  },
  backup: {
    bucket: process.env.BACKUP_S3_BUCKET,
    accessKey: process.env.BACKUP_S3_ACCESS_KEY,
    secretKey: process.env.BACKUP_S3_SECRET_KEY,
    gpgPassphrase: process.env.BACKUP_GPG_PASSPHRASE,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'noreply@nexova.com',
  },
  /** URL pública del sitio (para links e imágenes en Facebook). Por defecto FRONTEND_URL. */
  publicUrl: (process.env.PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, ''),
  facebook: {
    enabled: process.env.FACEBOOK_ENABLED !== 'false',
    pageId: process.env.FACEBOOK_PAGE_ID || '',
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    graphVersion: process.env.FACEBOOK_GRAPH_VERSION || 'v21.0',
    contactWhatsapp: process.env.FACEBOOK_WHATSAPP_CONTACT || '+525511346655',
  },
  metaMessaging: {
    enabled: process.env.META_MESSAGING_ENABLED !== 'false',
    appSecret: process.env.META_APP_SECRET || '',
    igAppSecret: process.env.META_IG_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || '',
    verifyToken: process.env.META_VERIFY_TOKEN || '',
    skipSignatureValidation: process.env.META_SKIP_SIGNATURE_VALIDATION === 'true',
    instagramAccountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
    instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
  },
  timezone: process.env.TZ || 'America/Chihuahua',
};
