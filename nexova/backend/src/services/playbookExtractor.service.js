import { Playbook, Message } from '../models/index.js';
import { generateId } from '../utils/uuid.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { scoreConversation } from './claude.service.js';

/**
 * Extrae playbooks al cerrar una venta:
 * - Usa Claude si está configurado; si no, genera un placeholder.
 */
export async function extractAndStorePlaybooks({ businessId, conversationId, createdByUserId = null }) {
  const messages = await Message.findAll({
    where: { conversation_id: conversationId },
    order: [['created_at', 'ASC']],
    limit: 80,
  });
  if (!messages.length) return [];

  // Reutilizamos scoring para detectar objeciones; en prod se puede reemplazar por un prompt dedicado.
  let objections = [];
  try {
    const scored = await scoreConversation(messages);
    objections = Array.isArray(scored.objections_detected) ? scored.objections_detected : [];
  } catch (err) {
    logger.warn('No se pudo extraer objeciones para playbook', { err: err?.message });
  }

  const outboundAsesor = messages
    .filter((m) => m.sender_type === 'asesor' && m.direction === 'outbound')
    .slice(-3)
    .map((m) => m.content)
    .join('\n\n');

  if (!objections.length) {
    objections = ['general'];
  }

  const created = [];
  for (const objection of objections.slice(0, 3)) {
    const pb = await Playbook.create({
      id: generateId(),
      business_id: businessId,
      objection_type: String(objection).slice(0, 100),
      scenario: 'Cierre exitoso — extracción automática',
      recommended_response: outboundAsesor || 'Respuesta efectiva (pendiente de extracción con Claude)',
      success_rate: null,
      times_used: 0,
      created_by: createdByUserId,
    });
    created.push(pb);
  }
  return created;
}

