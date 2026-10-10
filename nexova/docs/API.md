# NEXOVA API

Base URL: `https://api.nexova.com/api` (producción) · `http://localhost:3001/api` (local)

## Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/login` | Login (rate limit 5/min) |
| POST | `/auth/refresh` | Rotar refresh token |
| POST | `/auth/logout` | Revocar refresh |
| GET | `/auth/me` | Usuario actual |
| POST | `/auth/mfa/setup` | Generar QR TOTP |
| POST | `/auth/mfa/enable` | Activar MFA |
| POST | `/auth/forgot-password` | Solicitar reset |
| POST | `/auth/reset-password` | Cambiar password |

Header: `Authorization: Bearer <accessToken>`

## Dashboards

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/dashboard/admin?days=30` | admin, owner |
| GET | `/dashboard/owner` | owner |
| GET | `/dashboard/asesor` | asesor |

## Leads

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/leads` | Listar (scope por rol) |
| GET | `/leads/:id` | Detalle |
| PATCH | `/leads/:id` | Actualizar status |
| POST | `/leads/:id/pause-bot` | Pausar bot |
| POST | `/leads/:id/resume-bot` | Reactivar bot |
| POST | `/leads/:id/assign` | Asignar a asesor (admin/owner). Body opcional: `{ "asesor_id": "..." }` |

## Conversaciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/conversations` | Lista ordenada por score |
| GET | `/conversations/:id/messages` | Mensajes |
| POST | `/conversations/:id/messages` | Enviar (Twilio) |
| POST | `/conversations/:id/take` | Tomar conversación |

## Finanzas (owner)

| Método | Ruta |
|--------|------|
| GET | `/finances` |
| GET | `/finances/revenue` |
| GET | `/finances/expenses` |
| POST | `/finances/expenses` |

## Marketing (owner)

| Método | Ruta |
|--------|------|
| GET | `/marketing` |
| GET | `/marketing/campaigns` |
| PATCH | `/marketing/campaigns/:id` |
| GET | `/marketing/utms` |

## Webhooks

| Método | Ruta | Auth |
|--------|------|------|
| POST | `/webhooks/twilio` | Firma Twilio |

## Socket.io eventos

- `conversation:new_message`
- `conversation:scored`
- `lead:assigned`
- `lead:hot`
- `lead:status_changed`
- `notification:new`

## Health

`GET /health` — estado BD, Twilio, Claude
