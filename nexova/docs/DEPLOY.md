# NEXOVA — Deploy en servidor propio (sin Railway / sin Vercel)

Guía para publicar **backend + frontend + MySQL** en un **VPS** (DigitalOcean, Hetzner, AWS EC2, Azure VM, Linode, etc.) o en tu infraestructura. Cuando tengas dominio, solo ajustas DNS, Nginx y variables.

## Arquitectura recomendada

| Componente | Dónde |
|------------|--------|
| MySQL 8 | Mismo VPS o base **managed** (RDS, DO Managed, etc.) |
| Node (API + Socket.io) | VPS, puerto local `3001` (solo `127.0.0.1`) |
| Estáticos (Vite `dist/`) | Nginx sirve archivos |
| HTTPS | **Let’s Encrypt** (Certbot) + Nginx |

El navegador habla con **un solo dominio** (ej. `https://crm.tudominio.com`). Nginx enruta:

- `/` → archivos estáticos del frontend (`dist/`)
- `/api/` → `http://127.0.0.1:3001`
- `/socket.io/` → `http://127.0.0.1:3001` (WebSockets)

Así evitas CORS complejo: el backend usa `FRONTEND_URL=https://crm.tudominio.com`.

## Requisitos del servidor

- Ubuntu 22.04 LTS (o similar)
- 2 vCPU / 4 GB RAM mínimo recomendado para producción pequeña
- Node.js **20+** y npm

## 1) MySQL

Instala MySQL 8 o usa una instancia managed. Crea usuario y base:

```sql
CREATE DATABASE IF NOT EXISTS nexova_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nexova'@'localhost' IDENTIFIED BY 'CONTRASEÑA_FUERTE';
GRANT ALL PRIVILEGES ON nexova_db.* TO 'nexova'@'localhost';
FLUSH PRIVILEGES;
```

Si MySQL está en **otro host**, sustituye `localhost` por `%` o IP del VPS y abre firewall solo hacia tu backend.

Aplica migraciones desde tu máquina o desde el servidor (con `mysql` client y el archivo `backend/migrations/001_initial_schema.sql`), o:

```bash
cd backend
# .env con credenciales de producción
npm run migrate
```

Primer despliegue: `SEED_PASSWORD=... npm run seed` (ver `DATABASE.md`)

## 2) Backend (Node + PM2)

En el VPS:

```bash
sudo mkdir -p /var/www/nexova
# Copia la carpeta backend (scp, rsync, tarball, etc.)
cd /var/www/nexova/backend
npm ci --omit=dev
```

Crea `/var/www/nexova/backend/.env` (no lo subas a repos públicos). Mínimo:

- `NODE_ENV=production`
- `PORT=3001`
- `FRONTEND_URL=https://crm.tudominio.com` (tu URL real o IP temporal si pruebas sin dominio)
- `DB_*` apuntando a MySQL
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`
- `ANTHROPIC_*`, `TWILIO_*`, `SMTP_*` cuando toque

Arranque con **PM2**:

```bash
sudo npm i -g pm2
cd /var/www/nexova/backend
pm2 start src/index.js --name nexova-api
pm2 save
pm2 startup   # sigue las instrucciones que imprime
```

Comprueba en el servidor:

```bash
curl -s http://127.0.0.1:3001/health
```

## 3) Frontend (build estático)

En tu PC o en el servidor:

```bash
cd frontend
```

Crea `.env.production` (o exporta variables) **antes del build**:

```env
VITE_API_URL=https://crm.tudominio.com/api
VITE_SOCKET_URL=https://crm.tudominio.com
```

```bash
npm ci
npm run build
```

Sube la carpeta `dist/` al VPS, por ejemplo:

```bash
/var/www/nexova/frontend/dist/
```

## 4) Nginx (reverse proxy + estáticos)

Ejemplo de sitio: `/etc/nginx/sites-available/nexova` → enlace en `sites-enabled`.

Sustituye `crm.tudominio.com` por tu dominio (o nombre temporal). Para prueba **solo con IP**, necesitas certificado autofirmado o HTTP; Twilio y navegadores exigen **HTTPS** en producción real.

```nginx
server {
    listen 80;
    server_name crm.tudominio.com;
    root /var/www/nexova/frontend/dist;
    index index.html;

    # Frontend SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health (el backend expone GET /health en la raíz del proceso, no bajo /api)
    location = /health {
        proxy_pass http://127.0.0.1:3001/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5) HTTPS (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d crm.tudominio.com
```

Certbot suele añadir `listen 443 ssl` y redirección HTTP→HTTPS.

## 6) Twilio (webhook)

Cuando el dominio resuelva a tu VPS:

```
https://crm.tudominio.com/api/webhooks/twilio?business=gareva-zenith
```

El backend valida firma si `TWILIO_AUTH_TOKEN` está configurado.

## 7) Firewall

Abre solo **80** y **443** al mundo. MySQL y el puerto `3001` deben quedar **cerrados** hacia internet si el Node escucha en `127.0.0.1`.

## 8) Monitoreo y backups

- Health externo: `GET https://crm.tudominio.com/health` (con el bloque `location = /health` del ejemplo de Nginx).
- Backups: cron del proyecto (`backend/src/jobs`) + script `scripts/restore.sh` y almacenamiento S3/B2 según tu spec.

## Variables que deben alinearse

| Variable | Valor típico |
|----------|----------------|
| Backend `FRONTEND_URL` | `https://crm.tudominio.com` |
| Build `VITE_API_URL` | `https://crm.tudominio.com/api` |
| Build `VITE_SOCKET_URL` | `https://crm.tudominio.com` |

Tras cambiar dominio o URL: **rebuild del frontend** y **reinicio PM2** del backend.

## Deploy manual sin Git en el servidor

Puedes subir un `.zip` o usar `rsync`/`scp` desde tu PC. No hace falta Git en el VPS si despliegas artefactos ya construidos (`dist/` + `backend/` con `node_modules` generados en servidor con `npm ci --omit=dev`).

---

## Alternativa: Docker (opcional)

Si prefieres contenedores, el mismo esquema aplica: un contenedor Node (API), uno MySQL (o externo), Nginx delante o Traefik/Caddy con TLS. No está incluido en este repo como `docker-compose.yml`; se puede añadir si lo necesitas.
