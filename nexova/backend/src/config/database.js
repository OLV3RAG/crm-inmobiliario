import { Sequelize } from 'sequelize';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
  logging: env.nodeEnv === 'development' ? (msg) => logger.debug(msg) : false,
  timezone: '-06:00',
  dialectOptions: env.db.ssl
    ? { ssl: { require: true, rejectUnauthorized: true } }
    : {},
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

async function ensureMessageIdColumn() {
  try {
    const [rows] = await sequelize.query(`
      SELECT CHARACTER_MAXIMUM_LENGTH AS len
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'messages'
        AND COLUMN_NAME = 'twilio_sid'
    `);
    const len = Number(rows?.[0]?.len || rows?.[0]?.LEN || 0);
    if (len && len < 512) {
      await sequelize.query('ALTER TABLE messages MODIFY twilio_sid VARCHAR(512) NULL');
      await sequelize.query('ALTER TABLE conversations MODIFY twilio_sid VARCHAR(512) NULL');
      logger.info('Columna twilio_sid ampliada a 512 para IDs de Instagram');
    }
  } catch (err) {
    logger.warn('No se pudo ampliar twilio_sid', { err: err.message });
  }
}

export async function connectDatabase() {
  await sequelize.authenticate();
  await ensureMessageIdColumn();
  logger.info('MySQL conectado correctamente');
}
