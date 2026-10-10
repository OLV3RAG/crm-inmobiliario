# NEXOVA — Seguridad

## Autenticación

- JWT access: 15 min
- Refresh token: 7 días con rotación obligatoria
- bcrypt cost 12
- MFA TOTP obligatorio owner/admin (speakeasy + AES-256-GCM para secrets)
- Bloqueo: 5 intentos → 15 min

## Red

- Helmet + CSP en producción
- CORS estricto (solo FRONTEND_URL)
- Rate limit: 100 req/min general, 5 req/min login
- DOMPurify en inputs

## Datos

- Tokens Twilio/Claude solo en `.env`
- MFA secrets encriptados en BD
- Backups: gzip + GPG antes de S3/B2
- Audit log en acciones sensibles

## Scope manual (MySQL sin RLS)

Todo SELECT/UPDATE pasa por `scopeFilter.js`. Ningún controller debe consultar sin scope.

## OWASP checklist

- [x] Injection — Sequelize parametrizado + Joi
- [x] Broken Auth — JWT + MFA + lockout
- [x] XSS — DOMPurify
- [x] IDOR — scope por rol
- [x] Security misconfig — Helmet, env secrets
- [x] Logging — Winston + audit_log

## Pendiente producción

- Forzar MFA en primer login admin/owner
- WAF en Railway/Vercel
- Pen test externo recomendado
