# NEXOVA — Producción en Windows

Guía para publicar NEXOVA en **Windows Server** o **Windows 10/11** como servidor de producción, sin Railway ni Vercel.

Ruta de ejemplo: `C:\Proyectos\nexova`

## Arquitectura

| Pieza | Cómo corre en Windows |
|-------|------------------------|
| MySQL 8 | Servicio Windows (local o remoto) |
| API + Socket.io | Node en puerto **3001** (PM2 o servicio) |
| Frontend (React) | Carpeta `frontend\dist` servida por **IIS** |
| HTTPS | Certificado en IIS (Let's Encrypt con **win-acme**) |

El usuario entra por un solo sitio, por ejemplo `https://crm.tudominio.com`:

- `/` → archivos estáticos (Vite)
- `/api/*` → proxy a `http://127.0.0.1:3001`
- `/socket.io/*` → proxy WebSocket a `http://127.0.0.1:3001`
- `/health` → proxy a `http://127.0.0.1:3001/health`

---

## Requisitos

1. **Node.js 20 LTS** — https://nodejs.org (marca “Add to PATH”).
2. **MySQL 8.0+** — https://dev.mysql.com/downloads/installer/ (MySQL Installer).
3. **IIS** (recomendado en servidor) — “Activar o desactivar características de Windows”:
   - Internet Information Services
   - Application Development → **WebSocket Protocol**
   - (Para proxy) instalar **URL Rewrite** y **ARR** (ver sección IIS).

Comprueba en PowerShell:

```powershell
node -v    # v20.x o superior
npm -v
mysql --version
```

> En Windows **no uses `sudo`**. Si necesitas permisos elevados, abre **PowerShell como administrador**.

---

## Paso 1 — MySQL

### 1.1 Instalar y crear base

1. Instala MySQL con MySQL Installer.
2. Anota usuario `root` y contraseña.
3. Abre **MySQL Workbench** o línea de comandos:

```sql
CREATE DATABASE IF NOT EXISTS nexova_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'nexova'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA_FUERTE';
GRANT ALL PRIVILEGES ON nexova_db.* TO 'nexova'@'localhost';
FLUSH PRIVILEGES;
```

### 1.2 Migraciones

```powershell
cd C:\Proyectos\nexova\backend
copy .env.example .env
notepad .env
```

En `.env` (mínimo para migrar):

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexova_db
DB_USER=nexova
DB_PASSWORD=TU_CONTRASEÑA_FUERTE
DB_SSL=false
```

```powershell
npm install
npm run migrate
$env:SEED_PASSWORD="TuContraseñaSegura12+"
npm run seed
```

El seed crea negocios y usuarios iniciales. Usa la contraseña que definiste en `SEED_PASSWORD` para el primer acceso.

---

## Paso 2 — Backend (API)

### 2.1 Archivo `.env` de producción

Edita `C:\Proyectos\nexova\backend\.env`:

```env
PORT=3001
NODE_ENV=production

# URL pública del CRM (misma que usará el navegador)
FRONTEND_URL=https://crm.tudominio.com

DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexova_db
DB_USER=nexova
DB_PASSWORD=TU_CONTRASEÑA_FUERTE
DB_SSL=false

JWT_ACCESS_SECRET=genera-un-secreto-largo-min-32-caracteres
JWT_REFRESH_SECRET=otro-secreto-largo-diferente
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Opcional al inicio; obligatorio para bot WhatsApp / scoring IA
ANTHROPIC_API_KEY=
CLAUDE_MODEL=claude-sonnet-4-6
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@nexova.com

TZ=America/Chihuahua
```

Genera secretos seguros (PowerShell):

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 2.2 Probar manualmente

```powershell
cd C:\Proyectos\nexova\backend
npm install --omit=dev
npm start
```

En otra ventana:

```powershell
curl http://127.0.0.1:3001/health
```

Debe responder JSON con `"status":"healthy"` o `"degraded"` si falta BD.

Detén con `Ctrl+C` antes de poner PM2.

### 2.3 PM2 (proceso persistente)

**Opción recomendada:** PowerShell **como administrador**:

```powershell
npm install -g pm2
npm install -g pm2-windows-startup
```

Desde la carpeta backend:

```powershell
cd C:\Proyectos\nexova\backend
pm2 start ecosystem.config.cjs
pm2 save
pm2-startup install
```

Comandos útiles:

```powershell
pm2 status
pm2 logs nexova-api
pm2 restart nexova-api
```

**Sin permisos de administrador** (solo para pruebas):

```powershell
cd C:\Proyectos\nexova\backend
npm install pm2 --save-dev
npx pm2 start ecosystem.config.cjs
npx pm2 save
```

Para arranque automático al reiniciar Windows sin admin global, usa **Tarea programada** que ejecute `pm2 resurrect` al iniciar sesión del usuario de servicio.

---

## Paso 3 — Frontend (build)

Define la URL pública **antes** de compilar.

Crea `C:\Proyectos\nexova\frontend\.env.production`:

```env
VITE_API_URL=https://crm.tudominio.com/api
VITE_SOCKET_URL=https://crm.tudominio.com
```

Si aún no tienes dominio y pruebas en la LAN con IP:

```env
VITE_API_URL=http://192.168.1.50/api
VITE_SOCKET_URL=http://192.168.1.50
```

Y en backend: `FRONTEND_URL=http://192.168.1.50`

Build:

```powershell
cd C:\Proyectos\nexova\frontend
npm install
npm run build
```

La salida queda en `frontend\dist\`.

---

## Paso 4 — IIS (sitio público)

### 4.1 Instalar extensiones

1. **URL Rewrite** — https://www.iis.net/downloads/microsoft/url-rewrite  
2. **Application Request Routing (ARR)** — https://www.iis.net/downloads/microsoft/application-request-routing  

En IIS Manager → servidor → **Application Request Routing Cache** → **Server Proxy Settings** → marcar **Enable proxy**.

### 4.2 Crear sitio

1. Copia `frontend\dist` a una ruta fija, por ejemplo:  
   `C:\inetpub\nexova\wwwroot`
2. IIS → **Sites** → **Add Website**
   - Site name: `NEXOVA`
   - Physical path: `C:\inetpub\nexova\wwwroot`
   - Binding: puerto **80** (host `crm.tudominio.com` si ya tienes DNS)
3. Copia el archivo `deploy\windows\web.config` del repo a `C:\inetpub\nexova\wwwroot\web.config`  
   (reglas de SPA + proxy `/api`, `/socket.io`, `/health`).

### 4.3 Firewall Windows

Abre solo lo necesario (PowerShell como administrador):

```powershell
New-NetFirewallRule -DisplayName "NEXOVA HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "NEXOVA HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

No abras el puerto **3001** a internet; solo IIS debe ser público.

### 4.4 HTTPS

Con dominio apuntando al servidor:

1. Instala **win-acme** — https://www.win-acme.com/  
2. Genera certificado para `crm.tudominio.com` y enlázalo al sitio IIS.

O usa un certificado comercial / interno en el binding **https** del sitio.

---

## Paso 5 — Twilio (WhatsApp)

En **Twilio Console → Messaging → WhatsApp Sandbox** (o tu número aprobado), configura **When a message comes in**:

```
POST http://TU-IP-PUBLICA/api/webhooks/twilio?business=gareva-zenith
```

(o `https://crm.tudominio.com/...` si ya tienes HTTPS). Debe ser la **misma URL** que llega a IIS (no `localhost:3002`).

Variables en `backend\.env`:

| Variable | Ejemplo |
|----------|---------|
| `TWILIO_ACCOUNT_SID` | `AC...` |
| `TWILIO_AUTH_TOKEN` | token del panel |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` |
| `TWILIO_WEBHOOK_URL` | URL **idéntica** a la del panel Twilio (incluye `?business=...`) |

Tras editar `.env`:

```powershell
pm2 restart nexova-api --update-env
```

Comprueba: `http://TU-IP/health` → `"twilio":"configured"` y `"twilioWebhookUrlSet":true`.

**WhatsApp Sandbox:** el contacto debe enviar primero `join <código>` al número de Twilio desde su celular.

### El bot no responde por WhatsApp

1. Revisa `pm2 logs nexova-api` al enviar un mensaje. Si ves `Firma Twilio inválida`, agrega `TWILIO_WEBHOOK_URL` con la URL exacta del panel.
2. Confirma que Twilio puede alcanzar tu IP (firewall puerto 80/443).
3. `TWILIO_WHATSAPP_NUMBER` debe empezar con `whatsapp:`.

---

## Paso 6 — Verificación

| Prueba | URL / comando |
|--------|----------------|
| Health | `https://crm.tudominio.com/health` |
| API | Login desde `https://crm.tudominio.com` |
| PM2 | `pm2 status` → `nexova-api` online |
| MySQL | Workbench → tablas en `nexova_db` |

---

## Actualizar una nueva versión

```powershell
# 1. Detener o dejar PM2 recargar
cd C:\Proyectos\nexova\backend
git pull   # si usas git
npm install --omit=dev
pm2 restart nexova-api

# 2. Frontend
cd C:\Proyectos\nexova\frontend
npm install
npm run build
xcopy /E /Y dist\* C:\inetpub\nexova\wwwroot\
```

---

## Problemas frecuentes

### “Sudo está deshabilitado”
Normal en Windows. Usa PowerShell **como administrador** sin `sudo`, o `npx pm2` local.

### CORS / login falla
`FRONTEND_URL` en backend debe ser **exactamente** la URL del navegador (mismo `http`/`https`, sin barra final).

### Socket.io no conecta
- IIS: **WebSocket Protocol** instalado.  
- `web.config` con regla de upgrade para `/socket.io`.  
- `VITE_SOCKET_URL` = origen del sitio (sin `/api`).

### MySQL “Access denied”
Revisa usuario `nexova@localhost`, contraseña en `.env` y que el servicio MySQL esté **Running** en `services.msc`.

### Twilio: mensaje entrante pero sin respuesta

**Si `pm2 logs` no muestra `POST /webhooks/twilio` al enviar WhatsApp**, Twilio no está pegando al servidor (firewall, URL mal en consola, o IIS sin proxy).

Pruebas en el servidor (PowerShell; usa `curl.exe`, no el alias `curl`):

```powershell
# 1) Node directo — debe aparecer en pm2 logs
curl.exe -s "http://127.0.0.1:3002/api/webhooks/twilio/ping"

# 2) Misma ruta vía IIS (cambia la IP por la tuya)
curl.exe -s "http://198.71.63.169/api/webhooks/twilio/ping"

# 3) Simular mensaje (firma inválida → 403, pero SÍ debe loguear POST /webhooks/twilio)
curl.exe -s -X POST "http://127.0.0.1:3002/api/webhooks/twilio?business=gareva-zenith" ^
  -H "Content-Type: application/x-www-form-urlencoded" ^
  -d "From=whatsapp%%2B521234567890&Body=Hola&MessageSid=SMtest"
```

En **Twilio Console → Monitor → Logs → Errors**, revisa si el POST al webhook falla (timeout, 403, 404).

Configura el webhook en **Messaging → Try it out → Send a WhatsApp message → Sandbox settings** (no solo en el número de voz).

- Logs: `Invalid signature` → `TWILIO_WEBHOOK_URL` idéntica al panel + `pm2 restart --update-env`.
- Logs: `POST /webhooks/twilio` pero sin `Webhook Twilio recibido` → firma rechazada (403).
- Logs: error `21608` / sandbox → el usuario debe enviar `join <código>` al número Twilio.
- `health` muestra `twilio: not_configured` → faltan variables o no se reinició con `--update-env`.

### Puerto 3001 en uso
```powershell
netstat -ano | findstr :3001
taskkill /PID <pid> /F
pm2 restart nexova-api
```

---

## Alternativa sin IIS

Puedes usar **nginx para Windows** con la misma lógica que Linux (`docs/DEPLOY.md`), o exponer solo el backend en LAN para pruebas (no recomendado en internet sin proxy).

---

## Checklist rápido

- [ ] Node 20+ instalado  
- [ ] MySQL con `nexova_db` y migración aplicada  
- [ ] `backend\.env` completo  
- [ ] `pm2 status` → online  
- [ ] `frontend\.env.production` + `npm run build`  
- [ ] IIS con `web.config` y ARR habilitado  
- [ ] HTTPS en dominio  
- [ ] `FRONTEND_URL` alineado con URL pública  
- [ ] Twilio webhook configurado  
