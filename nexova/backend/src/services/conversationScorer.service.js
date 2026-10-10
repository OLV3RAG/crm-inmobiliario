import { Conversation, ConversationScore, Message } from '../models/index.js';
import { scoreConversation } from './claude.service.js';
import { maybeAutoAssignLead } from './assignmentEngine.service.js';
import { env } from '../config/env.js';
import { generateId } from '../utils/uuid.js';
import { logger } from '../utils/logger.js';

const throttleMap = new Map();
const THROTTLE_MS = 60_000;

function scoreToTemperature(score) {
  if (score <= 25) return 'frio';
  if (score <= 50) return 'tibio';
  if (score <= 75) return 'caliente';
  return 'hirviendo';
}

export async function scoreConversationIfNeeded({ conversationId, leadId, businessId, io, handoffRequired = false }) {
  const lastRun = throttleMap.get(conversationId);
  if (lastRun && Date.now() - lastRun < THROTTLE_MS) {
    if (handoffRequired && businessId) {
      await maybeAutoAssignLead({ leadId, businessId, handoffRequired: true, io });
    }
    return null;
  }
  throttleMap.set(conversationId, Date.now());

  const messages = await Message.findAll({
    where: { conversation_id: conversationId },
    order: [['created_at', 'ASC']],
    limit: 50,
  });
  if (!messages.length) return null;

  const result = await scoreConversation(messages);
  const temperature = result.temperature || scoreToTemperature(result.score);
  const score = Math.min(100, Math.max(0, result.score || 0));

  let scoreRecord = await ConversationScore.findOne({ where: { conversation_id: conversationId } });
  const scoreData = {
    score,
    temperature,
    sentiment: result.sentiment,
    intent: result.intent,
    objections_detected: result.objections_detected || [],
    next_best_action: result.next_best_action,
    reasoning: result.reasoning,
    claude_model: env.anthropic.model,
    updated_by: 'claude',
    updated_at: new Date(),
  };
  if (scoreRecord) {
    await scoreRecord.update(scoreData);
  } else {
    scoreRecord = await ConversationScore.create({
      id: generateId(),
      conversation_id: conversationId,
      lead_id: leadId,
      ...scoreData,
    });
  }

  const payload = {
    conversationId,
    leadId,
    score,
    temperature,
    sentiment: result.sentiment,
    intent: result.intent,
    objections_detected: result.objections_detected,
    next_best_action: result.next_best_action,
  };

  let resolvedBusinessId = businessId;
  if (!resolvedBusinessId) {
    const conv = await Conversation.findByPk(conversationId, { attributes: ['business_id'] });
    resolvedBusinessId = conv?.business_id;
  }

  if (io && resolvedBusinessId) {
    io.to(`business:${resolvedBusinessId}`).emit('conversation:scored', payload);
  }

  await maybeAutoAssignLead({
    leadId,
    businessId: resolvedBusinessId,
    score,
    handoffRequired,
    io,
  });

  logger.info('Conversación puntuada', { conversationId, score, temperature });
  return { ...payload, record: scoreRecord };
}
