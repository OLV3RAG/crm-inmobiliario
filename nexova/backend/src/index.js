import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { registerSocketHandlers } from './sockets/index.js';
import { registerCronJobs } from './jobs/index.js';
import { isCorsOriginAllowed } from './utils/corsOrigins.js';
import { getCorsOriginList } from './utils/corsOrigins.js';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isCorsOriginAllowed(origin)) return callback(null, true);
      console.warn(`[CORS] Socket.io origen no permitido: ${origin}`);
      callback(null, false);
    },
    credentials: true,
  },
});

app.set('io', io);
registerSocketHandlers(io);
registerCronJobs();

async function start() {
  try {
    await connectDatabase();
    server.listen(env.port, () => {
      logger.info(`NEXOVA API en puerto ${env.port}`);
      logger.info('CORS', { frontendUrl: env.frontendUrl, allowed: getCorsOriginList().slice(0, 8) });
    });
  } catch (err) {
    logger.error('Error al iniciar servidor', { err });
    process.exit(1);
  }
}

start();
