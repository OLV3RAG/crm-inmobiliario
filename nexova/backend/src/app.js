import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { env, validateEnv } from './config/env.js';
import { generalLimiter } from './middlewares/rateLimiter.js';
import routes from './routes/index.js';
import { health } from './controllers/health.controller.js';
import { corsOriginCallback } from './utils/corsOrigins.js';

validateEnv();

const app = express();

// Detrás de IIS / ARR (X-Forwarded-For)
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: env.nodeEnv === 'production',
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: corsOriginCallback,
  credentials: true,
}));
app.use(generalLimiter);
app.use('/api/webhooks/meta', express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '25mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Sin /api — proxy IIS regla /health
app.get('/health', health);

app.use('/api/webhooks/meta', (req, _res, next) => {
  console.log(`[meta-webhook] ${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.message?.includes('CORS bloqueado')) {
    return res.status(403).json({ error: 'Origen no permitido por CORS' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Archivo demasiado grande (máx. 16 MB)' });
  }
  if (err.message?.includes('Solo se permiten archivos de imagen')
    || err.message?.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Error interno del servidor' });
});

export default app;
