# Manual de usuario — NEXOVA CRM

**Versión:** 1.0  
**Acceso:** https://crm.novaarctech.com.mx  
**Catálogo público (sin login):** https://crm.novaarctech.com.mx/catalogo

---

## 1. ¿Qué es NEXOVA?

NEXOVA es un CRM inmobiliario que centraliza:

- Leads que llegan por **WhatsApp** (bot con inteligencia artificial).
- Conversaciones en tiempo real con clientes.
- Asignación de leads a asesores.
- Pipeline visual por temperatura (frío → hirviendo).
- Cierre de ventas, propiedades y reportes.

El bot atiende el WhatsApp de la empresa las 24 h. Cuando un lead pide un asesor o califica como prioritario, el sistema puede **pausar el bot** y **asignar un asesor humano**.

---

## 2. Roles en el sistema

| Rol | Descripción | Acceso principal |
|-----|-------------|------------------|
| **Owner** | Administrador global de NEXOVA (todas las empresas) | Finanzas, marketing global, todas las empresas |
| **Admin** | Administrador de **una empresa** | Dashboard, leads, CRM, asesores, propiedades |
| **Asesor** | Vendedor que atiende leads asignados | Mis leads, CRM, coaching |

Cada usuario entra con **correo y contraseña**. Owner y Admin deben usar **MFA** (autenticación en dos pasos).

---

## 3. Primer acceso e inicio de sesión

### 3.1 Entrar al CRM

1. Abre https://crm.novaarctech.com.mx  
2. Ingresa tu **correo** y **contraseña**.  
3. Si eres **Owner o Admin** y es tu primer acceso:
   - Te pedirá configurar **MFA** (Google Authenticator, Microsoft Authenticator o Authy).
   - Escanea el **código QR** en **Configuración → Seguridad MFA**.
   - Ingresa el código de 6 dígitos y pulsa **Activar MFA y continuar**.
4. En accesos siguientes, después de correo y contraseña, ingresa el **código MFA** de 6 dígitos.

### 3.2 Cambiar contraseña

Menú **Configuración → Cambiar contraseña**:

- Contraseña actual  
- Nueva contraseña (mínimo 8 caracteres)  
- Confirmación  
- Si tienes MFA activo, también el código de 6 dígitos  

---

## 4. Manual para Admin (administrador de empresa)

El **Admin** gestiona el día a día de su inmobiliaria: leads, WhatsApp, asesores y propiedades.

### 4.1 Menú disponible

| Sección | Para qué sirve |
|---------|----------------|
| **Dashboard** | Resumen: leads, cierres, conversión, ingresos, embudo, conversaciones calientes |
| **Leads** | Lista completa de contactos; buscar, exportar Excel, cerrar venta |
| **CRM** | Chat WhatsApp en tiempo real |
| **Pipeline** | Vista Kanban por temperatura (frío, tibio, caliente, hirviendo) |
| **Asesores** | Crear y editar asesores de venta |
| **Coaching** | Retroalimentación IA sobre conversaciones |
| **Propiedades** | Catálogo de inmuebles (disponibles / vendidas) |
| **Configuración** | Perfil, contraseña y MFA |

### 4.2 Dashboard

- Filtra por **7, 30 o 90 días**.
- Métricas: total de leads, cierres, tasa de conversión, ingresos.
- **Embudo de ventas:** etapas del lead (nuevo → cierre).
- **Conversaciones calientes:** leads con mayor score IA.
- **Top 5 asesores:** rendimiento del equipo.

### 4.3 Leads

- **Buscar** por nombre, teléfono o zona.
- **Exportar Excel** para reportes externos.
- Columnas: nombre, teléfono, zona, estado, campaña UTM, fecha.
- **Cerrar venta** o **Marcar perdido** desde la columna Acciones (ver sección 4.8).
- **Eliminar lead** (solo Admin/Owner): borra el contacto y su historial de WhatsApp.

### 4.4 CRM WhatsApp

#### Lista de conversaciones (izquierda)

- Ordenadas por **score IA** (más calientes arriba).
- Indicador **En tiempo real** cuando la conexión está activa.
- Badge con número de **notificaciones** sin leer.
- Contador violeta en cada conversación con mensajes pendientes.

#### Al abrir una conversación

- El chat **baja automáticamente** al último mensaje.
- Al leer, el contador de no leídos **se borra** sin recargar la página.
- **Fotos** enviadas por el cliente se muestran en el chat (clic para ampliar).

#### Colores de mensajes

| Color | Quién envió |
|-------|-------------|
| Gris (izquierda) | Lead / cliente |
| Violeta (derecha) | Asesor |
| Verde (derecha) | Admin |
| Azul (derecha) | Bot IA |

#### Acciones en el CRM

| Botón | Función |
|-------|---------|
| **Cerrar venta** | Registra venta, monto, comisión, propiedad vendida |
| **Perdido** | Marca lead como perdido con motivo |
| **Asignar / Reasignar asesor** | Elige asesor o deja en automático |
| **Pausar bot** | El bot deja de responder; solo humanos contestan |
| **Devolver al bot** | Reactiva respuestas automáticas del bot |
| **Eliminar lead** | Borra lead y conversación (irreversible) |

#### Responder al cliente

1. Escribe en el cuadro inferior y pulsa **Enter** o **Enviar**.  
2. El mensaje se envía por WhatsApp al número del lead.  
3. El texto se limpia al instante; verás “enviando…” hasta confirmar.

#### Notificaciones

- Toast abajo a la derecha cuando llega un mensaje nuevo.
- Notificación del navegador si la permitiste (Configuración / permisos del sitio).
- Clic en la notificación abre la conversación.

#### Handoff (pasar a asesor humano)

El lead puede escribir en WhatsApp: *“quiero hablar con un asesor”*, *“agente”*, etc.  
El sistema:

1. Pausa el bot.  
2. Asigna un asesor disponible.  
3. Notifica al asesor por WhatsApp con enlace al CRM.  

**Importante:** el asesor debe **responder manualmente desde el CRM**; el bot no contesta por él.

### 4.5 Pipeline

Vista en **4 columnas** según temperatura IA:

- **Frío** — interés bajo  
- **Tibio** — interés medio  
- **Caliente** — interés alto  
- **Hirviendo** — máxima prioridad  

Cada tarjeta muestra nombre, zona y score. Úsalo para priorizar seguimiento.

### 4.6 Asesores

#### Crear asesor

1. **Asesores → Nuevo asesor**  
2. Completa: nombre, teléfono, correo, contraseña inicial, zona, especialidades.  
3. **Máximo de leads concurrentes** (default 15): cuántos leads activos puede tener a la vez.  
4. El asesor recibe acceso al CRM con su correo y contraseña.

#### Editar / desactivar

- **Editar:** cambiar datos, zona, límite de leads o contraseña.  
- **Desactivar:** el asesor deja de recibir asignaciones automáticas.  

#### Asignación automática

El sistema elige al asesor con mejor score, zona compatible y cupo disponible. Si todos están llenos, el lead queda sin asignar hasta que haya capacidad.

### 4.7 Propiedades

- Alta de inmuebles: título, zona, precio, tipo, terreno, estacionamientos, fotos.  
- Estados: **disponible** o **vendida**.  
- Al **cerrar una venta** en el CRM puedes vincular la propiedad; pasa a **vendida** y desaparece del catálogo público.  
- Catálogo web: https://crm.novaarctech.com.mx/catalogo  

### 4.8 Cerrar venta o marcar perdido

Disponible en **Leads** y en **CRM** (botones en la conversación).

**Cerrar venta (ganada):**

- Monto de venta y comisión  
- Forma de pago (transferencia, crédito, INFONAVIT, etc.)  
- Propiedad del catálogo (opcional)  
- Notas  

El ingreso se refleja en reportes de finanzas (Owner).

**Marcar perdido:**

- Motivo: precio, zona, timing, competencia, sin respuesta, otro  
- Notas opcionales  

Tras cerrar (ganada o perdida), el cuadro de envío de WhatsApp se desactiva para esa conversación.

### 4.9 Coaching

La IA analiza conversaciones y genera:

- **Fortalezas** del asesor  
- **Errores** detectados  
- **Sugerencias** de mejora  

Revisa los insights y marca **Marcar revisado** cuando los hayas leído.

### 4.10 Configuración (Admin)

- Ver perfil (nombre, correo, rol).  
- Cambiar contraseña.  
- Configurar o regenerar MFA.  

---

## 5. Manual para Owner (administrador global)

El **Owner** ve **todas las empresas** y tiene las funciones del Admin, más módulos globales.

### 5.1 Menú adicional

| Sección | Función |
|---------|---------|
| **NEXOVA Global** | Dashboard multi-empresa |
| **Finanzas** | Ingresos, utilidad, ventas registradas, exportar PDF |
| **Marketing** | ROI por canal, campañas, UTMs |

Al crear asesores, el Owner debe **seleccionar la empresa** a la que pertenece.

### 5.2 NEXOVA Global

- Ingreso, gasto y utilidad del mes.  
- Clientes activos y MRR.  
- Gráfica de ingresos diarios (30 días).  
- Tabla por empresa: asesores, leads del mes, cierres, ingreso, plan.

### 5.3 Finanzas

- Ingresos del mes, utilidad, margen, gastos.  
- Lista de **ventas registradas** (desde cierres en CRM).  
- Gráficas de ingresos.  
- Exportar reporte PDF.

### 5.4 Marketing

- **ROI por canal:** inversión, leads, costo por lead, cierres, ROAS.  
- **Campañas activas:** pausar o reactivar.  
- **Embudo UTM:** de dónde vienen los leads (Sankey).

---

## 6. Manual para Asesor

El **Asesor** atiende solo **sus leads asignados**.

### 6.1 Menú disponible

| Sección | Función |
|---------|---------|
| **Mis Leads** | Dashboard personal |
| **CRM** | WhatsApp de sus conversaciones |
| **Mi Coaching** | Feedback IA |
| **Configuración** | Contraseña y perfil |

### 6.2 Mis Leads (dashboard)

- Leads activos asignados.  
- Tasa de cierre y tiempo de respuesta.  
- Score de performance.  
- Coaching pendiente por revisar.  
- Cierres e ingresos del mes.

### 6.3 CRM (asesor)

- Ve conversaciones de **sus leads** (y puede **Tomar conversación** si no está asignada).  
- Responde por WhatsApp desde el CRM.  
- Mensajes propios aparecen en **violeta**.  
- Puede **Cerrar venta** o **Marcar perdido** en sus leads.  
- **Pausar bot / Devolver al bot** en conversaciones que atiende.

### 6.4 Tomar conversación

Si un lead no tiene asesor:

1. Abre la conversación en CRM.  
2. Pulsa **Tomar conversación**.  
3. El bot se pausa y el lead queda asignado a ti.

### 6.5 Notificaciones (asesor)

- Recibes aviso cuando te **asignan un lead** (WhatsApp + notificación en CRM).  
- Badge en menú **CRM** con mensajes nuevos.  
- Responde desde el CRM lo antes posible; el tiempo de respuesta afecta tu score.

---

## 7. Flujo típico de un lead (todos los roles)

```
WhatsApp del cliente
        ↓
   Bot IA responde (si no está pausado)
        ↓
   Score IA (frío → hirviendo)
        ↓
   ¿Pide asesor o score alto? → Asignación automática
        ↓
   Asesor/Admin responde en CRM
        ↓
   Seguimiento en Pipeline / Leads
        ↓
   Cierre venta o Perdido
        ↓
   Propiedad marcada vendida (opcional)
        ↓
   Ingreso en Finanzas (Owner)
```

---

## 8. Score IA y temperatura

Cada conversación recibe un **score** (0–100) y una **temperatura**:

| Temperatura | Significado |
|-------------|-------------|
| Frío | Poco interés o conversación inicial |
| Tibio | Interés moderado |
| Caliente | Buen prospecto |
| Hirviendo | Máxima prioridad — atender ya |

El círculo de color en CRM y Pipeline muestra score y temperatura.

---

## 9. Consejos y buenas prácticas

### Para Admin

- Revisa el **Dashboard** cada mañana (conversaciones calientes).  
- Mantén el **catálogo de propiedades** actualizado.  
- Crea asesores con **zona y especialidades** correctas para mejor asignación.  
- Usa **Pausar bot** cuando un asesor ya está atendiendo al cliente.  
- Cierra ventas con **monto y propiedad** para reportes correctos.

### Para Asesor

- Activa **notificaciones** del navegador para el CRM.  
- Responde rápido; el cliente viene de WhatsApp y espera inmediatez.  
- Si no entiendes el contexto, lee el historial antes de escribir.  
- Revisa **Coaching** semanalmente.  
- Al cerrar, confirma **monto** y **propiedad** con el Admin si aplica.

### Para Owner

- Revisa **NEXOVA Global** y **Finanzas** al cierre de mes.  
- Cruza **Marketing → ROI** con campañas reales.  
- Valida que cada empresa tenga Admin y asesores activos.

---

## 10. Problemas frecuentes

| Problema | Qué hacer |
|----------|-----------|
| No puedo entrar | Verifica correo/contraseña; Owner/Admin necesitan código MFA |
| “Sin tiempo real” en CRM | Recarga con Ctrl+F5; si persiste, avisa a soporte técnico |
| No llegan mensajes de WhatsApp | Verificar que el bot no esté pausado sin asesor activo |
| No veo fotos del cliente | Abre la conversación de nuevo tras actualizar; fotos muy antiguas pueden no estar en Twilio |
| El bot sigue respondiendo tras pedir asesor | Escribe de nuevo “asesor”; Admin puede pausar bot manualmente |
| No me asignan leads | Revisa que tu estado sea **disponible** y que no hayas llegado al máximo de leads |
| Olvidé contraseña | Contacta al Admin u Owner para restablecerla |

---

## 11. Soporte técnico

Para incidencias de servidor, WhatsApp o acceso:

- Contacta al responsable técnico de NEXOVA / Nova Arc Tech.  
- Indica: correo de usuario, rol, hora del problema y captura de pantalla si es posible.

---

## 12. Resumen rápido por rol

| Acción | Owner | Admin | Asesor |
|--------|:-----:|:-----:|:------:|
| Ver todas las empresas | ✅ | ❌ | ❌ |
| Finanzas / Marketing global | ✅ | ❌ | ❌ |
| Crear asesores | ✅ | ✅ | ❌ |
| Eliminar leads | ✅ | ✅ | ❌ |
| CRM WhatsApp | ✅ | ✅ | ✅ (sus leads) |
| Asignar asesores | ✅ | ✅ | ❌ |
| Cerrar venta | ✅ | ✅ | ✅ |
| Propiedades | ✅ | ✅ | ❌ |
| Configuración / contraseña | ✅ | ✅ | ✅ |

---

*Documento generado para NEXOVA CRM — Nova Arc Tech.*
