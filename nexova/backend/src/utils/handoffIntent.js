const HANDOFF_PATTERNS = [
  /\basesor(a|es)?\b/i,
  /\bagente(s)?\b/i,
  /hablar\s+con\s+(alguien|una?\s+persona|un\s+asesor)/i,
  /quiero\s+(un\s+)?asesor/i,
  /pasar(me|)?\s+con/i,
  /conecta(me|)?\s+con/i,
  /humano\b/i,
  /persona\s+real/i,
  /que\s+me\s+atienda/i,
  /atencion\s+humana/i,
  /hablar\s+con\s+ventas/i,
];

export function detectHandoffIntent(text) {
  const normalized = text?.trim();
  if (!normalized) return false;
  return HANDOFF_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildHandoffReply({ leadName, asesorName, assigned }) {
  const name = leadName?.trim() ? leadName.trim().split(' ')[0] : 'Hola';
  if (assigned && asesorName) {
    return `${name}, te estoy conectando con ${asesorName}. Te escribirá en breve por este mismo WhatsApp.`;
  }
  if (assigned) {
    return `${name}, un asesor de nuestro equipo te contactará en breve por este mismo WhatsApp.`;
  }
  return `${name}, recibimos tu solicitud. Un asesor te escribirá lo antes posible por este mismo WhatsApp.`;
}
