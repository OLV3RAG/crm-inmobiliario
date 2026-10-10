import { env } from '../config/env.js';

function parseOrigin(origin) {
  try {
    const u = new URL(origin);
    const hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    return { origin: u.origin, hostname, protocol: u.protocol, port: u.port };
  } catch {
    return null;
  }
}

/** Orígenes explícitos + variantes www/http/https de FRONTEND_URL y CORS_ORIGINS */
export function buildAllowedOrigins() {
  const origins = new Set([
    'http://localhost:5173',
    'http://localhost',
    'http://127.0.0.1',
    'http://localhost:80',
    'http://127.0.0.1:80',
  ]);

  const allowedHosts = new Set();

  const register = (raw) => {
    const value = raw?.trim();
    if (!value) return;
    origins.add(value.replace(/\/$/, ''));
    const parsed = parseOrigin(value);
    if (!parsed) return;
    allowedHosts.add(parsed.hostname);
    origins.add(parsed.origin);
    const withWww = parsed.hostname.startsWith('www.')
      ? parsed.hostname.slice(4)
      : `www.${parsed.hostname}`;
    allowedHosts.add(withWww);
    origins.add(`${parsed.protocol}//${withWww}${parsed.port ? `:${parsed.port}` : ''}`);
    const altProto = parsed.protocol === 'https:' ? 'http:' : 'https:';
    origins.add(`${altProto}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`);
    origins.add(`${altProto}//${withWww}${parsed.port ? `:${parsed.port}` : ''}`);

    // Si es subdominio (ej. crm.dominio.com.mx), permitir también el dominio raíz
    const labels = parsed.hostname.split('.');
    if (labels.length > 2) {
      const apex = labels.slice(1).join('.');
      allowedHosts.add(apex);
      allowedHosts.add(`www.${apex}`);
    }
  };

  register(env.frontendUrl);
  env.corsOrigins.split(',').forEach(register);

  return { origins, allowedHosts };
}

export function isCorsOriginAllowed(origin) {
  if (!origin) return true;

  const { origins, allowedHosts: hosts } = buildAllowedOrigins();

  if (origins.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(origin)) return true;

  const parsed = parseOrigin(origin);
  if (parsed && hosts.has(parsed.hostname)) return true;

  return false;
}

export function getCorsOriginList() {
  return [...buildAllowedOrigins().origins];
}

export function corsOriginCallback(origin, callback) {
  if (isCorsOriginAllowed(origin)) {
    return callback(null, true);
  }
  console.warn(`[CORS] Origen no permitido: ${origin}`);
  callback(null, false);
}
