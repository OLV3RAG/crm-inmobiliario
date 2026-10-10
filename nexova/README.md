# NEXOVA CRM Premium

CRM inmobiliario con IA para captura de leads vía WhatsApp 24/7, calificación con Claude, asignación inteligente y embudo de ventas completo.

**Clientes:** Gareva Zenith · VNA World Company (Chihuahua, México)

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18, Vite, Tailwind, Recharts, Socket.io-client |
| Backend | Node.js, Express, Sequelize, MySQL 8 |
| IA | Anthropic Claude |
| Mensajería | Twilio WhatsApp |
| Deploy | Servidor propio (Nginx + PM2) · MySQL 8 (local o managed) |

## Inicio rápido

### 1. Base de datos

```bash
cd backend
cp .env.example .env
# Editar credenciales MySQL
npm run migrate
# Solo en el primer despliegue (define una contraseña segura):
# PowerShell: $env:SEED_PASSWORD="TuContraseñaSegura12+"; npm run seed
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
# API: http://localhost:3001
# Health: http://localhost:3001/health
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# UI: http://localhost:5173
```

## Primer acceso

Tras `npm run seed`, inicia sesión con los correos configurados en `SEED_OWNER_EMAIL`, `SEED_ADMIN_EMAIL` y `SEED_ASESOR_EMAIL` (valores por defecto en `backend/.env.example`). La contraseña es la que definiste en `SEED_PASSWORD`. Cambia contraseñas y activa MFA en **Configuración**.

## Estructura

```
nexova/
├── frontend/     # React + Vite
├── backend/      # Express + Sequelize
└── docs/         # API, DATABASE, DEPLOY, SECURITY
```

## Webhook Twilio

Con tu dominio y Nginx (ver `docs/DEPLOY.md`):

```
POST https://crm.tudominio.com/api/webhooks/twilio?business=gareva-zenith&utm_source=meta
```

## Documentación

- [API.md](docs/API.md)
- [DATABASE.md](docs/DATABASE.md)
- [DEPLOY.md](docs/DEPLOY.md) — Linux / VPS
- [DEPLOY-WINDOWS.md](docs/DEPLOY-WINDOWS.md) — **Producción en Windows (IIS + PM2)**
- [SECURITY.md](docs/SECURITY.md)
