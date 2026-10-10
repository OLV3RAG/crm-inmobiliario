import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Business } from '../models/index.js';
import { logger } from '../utils/logger.js';

async function joinUserRooms(socket) {
  const { businessId, asesorId, sub: userId, role } = socket.user;

  socket.join(`user:${userId}`);
  if (asesorId) socket.join(`asesor:${asesorId}`);

  if (role === 'owner') {
    socket.join('role:owner');
    const businesses = await Business.findAll({ attributes: ['id'] });
    businesses.forEach((b) => socket.join(`business:${b.id}`));
    logger.info('Socket conectado (owner)', { userId, businesses: businesses.length });
    return;
  }

  if (businessId) {
    socket.join(`business:${businessId}`);
    logger.info('Socket conectado', { userId, businessId, role });
    return;
  }

  logger.warn('Socket sin businessId', { userId, role });
}

export function registerSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth requerida'));
    try {
      const payload = jwt.verify(token, env.jwt.accessSecret);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error(err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    joinUserRooms(socket).catch((err) => {
      logger.error('Error al unir rooms de socket', { err: err.message, userId: socket.user?.sub });
    });

    socket.on('disconnect', () => {});
  });
}
