import rateLimit from 'express-rate-limit';

/** IIS/ARR puede dejar req.ip como [::1]:62603; express-rate-limit exige IP válida. */
function normalizeClientIp(req) {
  const raw =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    'unknown';

  const bracket = raw.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracket) return bracket[1];

  const v4WithPort = raw.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (v4WithPort) return v4WithPort[1];

  return raw;
}

const limiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false, ip: false },
  keyGenerator: (req) => normalizeClientIp(req),
};

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  ...limiterOptions,
  skip: (req) => req.path?.includes('/webhooks/') || req.path?.includes('/public/property-photos/'),
  message: { error: 'Demasiadas solicitudes. Intenta en un minuto.' },
});

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  ...limiterOptions,
  message: { error: 'Demasiados intentos de login. Espera un minuto.' },
});
