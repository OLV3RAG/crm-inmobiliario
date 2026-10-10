import cron from 'node-cron';
import { runDatabaseBackup } from '../services/backup.service.js';
import { logger } from '../utils/logger.js';
import { Conversation } from '../models/index.js';
import { scoreConversationIfNeeded } from '../services/conversationScorer.service.js';
import { Op } from 'sequelize';

export function registerCronJobs() {
  cron.schedule('0 3 * * *', async () => {
    logger.info('Iniciando backup programado');
    await runDatabaseBackup();
  }, { timezone: 'America/Chihuahua' });

  cron.schedule('*/5 * * * *', async () => {
    const active = await Conversation.findAll({
      where: { is_active: true, last_message_at: { [Op.gte]: new Date(Date.now() - 3600000) } },
      limit: 20,
    });
    for (const conv of active) {
      try {
        await scoreConversationIfNeeded({ conversationId: conv.id, leadId: conv.lead_id });
      } catch (err) {
        logger.error('Error en cron scoring', { err });
      }
    }
  });
}
