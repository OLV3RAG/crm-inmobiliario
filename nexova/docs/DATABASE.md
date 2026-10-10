# NEXOVA — Base de datos

## Esquema

- **Motor:** MySQL 8.0+
- **Base:** `nexova_db`
- **Charset:** `utf8mb4_unicode_ci`

## Migración

```bash
cd backend
npm run migrate
```

Archivo: `backend/migrations/001_initial_schema.sql`

## Tablas (18 + password_reset)

1. businesses
2. users
3. asesores
4. users_roles
5. properties
6. leads
7. conversations
8. messages
9. conversation_scores
10. lead_assignments
11. coaching_insights
12. playbooks
13. marketing_campaigns
14. revenue
15. expenses
16. audit_log
17. notifications
18. refresh_tokens
19. password_reset_tokens

## Scope por rol (sin RLS)

| Rol | Filtro |
|-----|--------|
| owner | Sin filtro business_id |
| admin | `business_id = usuario.businessId` |
| asesor | business_id + leads en `lead_assignments` |

Implementado en `backend/src/middlewares/scopeFilter.js`.

## Seed (solo primer despliegue)

```bash
# PowerShell
$env:SEED_PASSWORD="TuContraseñaSegura12+"
npm run seed
```

Crea los negocios Gareva Zenith y VNA World, más usuarios owner/admin/asesor. No inserta datos ficticios de campañas ni propiedades.
