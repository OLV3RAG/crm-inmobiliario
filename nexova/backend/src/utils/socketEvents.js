/** Emite mensaje nuevo a clientes del negocio (CRM en tiempo real). */
export function emitConversationMessage(io, { conversationId, businessId, message, leadName, leadPhone, channel }) {
  if (!io || !conversationId || !message) return;
  const payload = {
    conversationId,
    leadName: leadName || null,
    leadPhone: leadPhone || null,
    channel: channel || null,
    message: typeof message.toJSON === 'function' ? message.toJSON() : message,
  };
  if (businessId) {
    io.to(`business:${businessId}`).emit('conversation:new_message', payload);
    return;
  }
  io.to('role:owner').emit('conversation:new_message', payload);
}