import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const client = env.anthropic.apiKey ? new Anthropic({ apiKey: env.anthropic.apiKey }) : null;

const BOT_SYSTEM_PROMPT = (businessName) => `Eres el asistente virtual de ${businessName}, una inmobiliaria en todo México.
Tu trabajo es calificar prospectos con preguntas naturales (no interrogatorio).

Información a obtener gradualmente:
1. Tipo de propiedad (casa, depa, preventa)
2. Zona o colonia de interés
3. Rango de presupuesto
4. Plazo de compra (inmediato, 3 meses, 6 meses, explorando)
5. Forma de pago (contado, financiamiento interno)

Reglas:
- Tono cálido, profesional, sin emojis excesivos
- Mensajes cortos (max 2 párrafos)
- NO inventes propiedades. Si el lead pide algo específico, di: "Permíteme conectarte con un asesor que te muestre las opciones exactas"
- NO des precios sin verificar con asesor
- Si el lead pide asesor, agente, hablar con alguien o persona real, responde brevemente que lo conectarás y SIEMPRE incluye al final:
<!--LEAD_DATA:{"handoff_required":true}-->
- En cualquier otro caso, si detectas datos del lead incluye:
<!--LEAD_DATA:{"property_type":"","zone":"","budget_min":null,"budget_max":null,"handoff_required":false}-->
`;

const SCORING_PROMPT = `Eres analista de ventas inmobiliarias. Analiza esta conversación de WhatsApp entre un asesor/bot y un prospecto.

Devuelve SOLO un JSON válido con:
{
  "score": 0-100,
  "temperature": "frio"|"tibio"|"caliente"|"hirviendo",
  "sentiment": "positivo"|"neutro"|"negativo",
  "intent": "explorando"|"comparando"|"decidido"|"objetando",
  "objections_detected": [],
  "next_best_action": "string accionable, máx 100 chars",
  "reasoning": "string breve, máx 200 chars"
}`;

const FALLBACK_BOT_REPLY = 'Gracias por escribirnos. Recibimos tu mensaje y un asesor te contactará en breve. ¿Qué tipo de propiedad buscas (casa, departamento)?';

const DEFAULT_SCORE = {
  score: 30,
  temperature: 'frio',
  sentiment: 'neutro',
  intent: 'explorando',
  objections_detected: [],
  next_best_action: 'Continuar calificación',
  reasoning: 'Score por defecto',
};

export async function chatBot({ businessName, messages, leadContext }) {
  if (!client) {
    return {
      reply: FALLBACK_BOT_REPLY,
      handoff_required: false,
      leadData: {},
      fallback: true,
    };
  }
  const system = BOT_SYSTEM_PROMPT(businessName);
  try {
    const response = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: 512,
      system,
      messages: messages.map((m) => ({
        role: m.direction === 'inbound' || m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    });
    const text = response.content[0]?.text || '';
    let handoff_required = false;
    let leadData = {};
    const dataMatch = text.match(/<!--LEAD_DATA:(.*?)-->/);
    if (dataMatch) {
      try {
        leadData = JSON.parse(dataMatch[1]);
        handoff_required = !!leadData.handoff_required;
      } catch {
        /* ignore */
      }
    }
    const cleanReply = text.replace(/<!--LEAD_DATA:.*?-->/g, '').trim();
    return { reply: cleanReply || FALLBACK_BOT_REPLY, handoff_required, leadData };
  } catch (err) {
    logger.warn('Claude no disponible para chatBot; usando respuesta por defecto', {
      err: err.message,
    });
    return {
      reply: FALLBACK_BOT_REPLY,
      handoff_required: false,
      leadData: {},
      fallback: true,
    };
  }
}

export async function scoreConversation(messages) {
  if (!client) {
    return { ...DEFAULT_SCORE, reasoning: 'API no configurada — score por defecto' };
  }
  const history = messages.map((m) => `[${m.sender_type}/${m.direction}] ${m.content}`).join('\n');
  try {
    const response = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: 400,
      system: SCORING_PROMPT,
      messages: [{ role: 'user', content: `Historial:\n${history}` }],
    });
    const text = response.content[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    try {
      return JSON.parse(jsonMatch ? jsonMatch[0] : text);
    } catch (err) {
      logger.error('Error parseando score Claude', { err });
      return { ...DEFAULT_SCORE, reasoning: 'Error al analizar' };
    }
  } catch (err) {
    logger.warn('Claude no disponible para scoreConversation', { err: err.message });
    return { ...DEFAULT_SCORE, reasoning: 'Claude no disponible' };
  }
}

export async function coachConversation({ messages, outcome, lostReason }) {
  if (!client) {
    return {
      fortalezas: ['Comunicación iniciada'],
      errores: ['Análisis no disponible sin API'],
      sugerencias: ['Configurar ANTHROPIC_API_KEY'],
      frases_clave: [],
      full_analysis: 'Coaching requiere configuración de Claude API.',
    };
  }
  const prompt = `Eres coach de ventas inmobiliarias experto. Analiza esta conversación que terminó en ${outcome}.

Devuelve JSON con:
{
  "fortalezas": ["3 cosas que el asesor hizo bien"],
  "errores": ["3 cosas que pudo hacer mejor"],
  "sugerencias": ["3 recomendaciones accionables"],
  "frases_clave": [{"frase":"","impacto":""}],
  "full_analysis": "párrafo 150-200 palabras"
}

Conversación:
${messages.map((m) => `[${m.sender_type}] ${m.content}`).join('\n')}

Outcome: ${outcome}
Reason: ${lostReason || 'N/A'}`;

  try {
    const response = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (err) {
    logger.warn('Claude no disponible para coachConversation', { err: err.message });
    return {
      fortalezas: ['Comunicación iniciada'],
      errores: ['Análisis automático no disponible'],
      sugerencias: ['Revisar conversación manualmente'],
      frases_clave: [],
      full_analysis: 'Coaching automático no disponible (Claude sin créditos o error de API).',
    };
  }
}

/**
 * Copy corto para flyer inmobiliario.
 * @returns {{ headline: string, subtitle: string }}
 */
export async function generateFlyerCopy(property) {
  const fallback = {
    headline: String(property?.title || 'Hermosa propiedad').slice(0, 40).toUpperCase(),
    subtitle: 'Espacios amplios, modernos y la comodidad que tu familia merece.',
  };
  if (!client) return fallback;

  const prompt = `Genera copy para un flyer inmobiliario en español (México).

Propiedad:
- Título: ${property?.title || ''}
- Tipo: ${property?.property_type || ''}
- Zona: ${[property?.municipality, property?.city, property?.state].filter(Boolean).join(', ')}
- Precio: ${property?.price || ''}
- Recámaras: ${property?.bedrooms ?? ''}
- Baños: ${property?.bathrooms ?? ''}
- Descripción: ${String(property?.description || '').slice(0, 400)}

Devuelve SOLO JSON válido:
{"headline":"máximo 4 palabras en MAYÚSCULAS","subtitle":"una frase de venta, máximo 90 caracteres"}`;

  try {
    const response = await client.messages.create({
      model: env.anthropic.model,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return {
      headline: String(parsed.headline || fallback.headline).slice(0, 48).toUpperCase(),
      subtitle: String(parsed.subtitle || fallback.subtitle).slice(0, 120),
    };
  } catch (err) {
    logger.warn('Claude no disponible para flyer copy', { err: err.message });
    return fallback;
  }
}

export function isClaudeConfigured() {
  return !!client;
}
