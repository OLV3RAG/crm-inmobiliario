import { Message, CoachingInsight } from '../models/index.js';
import { coachConversation } from './claude.service.js';
import { generateId } from '../utils/uuid.js';

export async function generateCoachingInsight({ leadId, asesorId, conversationId, outcome, lostReason }) {
  const messages = await Message.findAll({
    where: conversationId ? { conversation_id: conversationId } : { lead_id: leadId },
    order: [['created_at', 'ASC']],
  });

  const analysis = await coachConversation({
    messages,
    outcome: outcome === 'closed_won' ? 'cierre' : outcome === 'closed_lost' ? 'perdido' : 'en_progreso',
    lostReason,
  });

  return CoachingInsight.create({
    id: generateId(),
    asesor_id: asesorId,
    lead_id: leadId,
    conversation_id: conversationId,
    outcome: outcome === 'closed_won' ? 'cierre' : outcome === 'closed_lost' ? 'perdido' : 'en_progreso',
    fortalezas: analysis.fortalezas,
    errores: analysis.errores,
    sugerencias: analysis.sugerencias,
    frases_clave: analysis.frases_clave,
    full_analysis: analysis.full_analysis,
  });
}
