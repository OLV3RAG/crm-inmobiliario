/**
 * Verifica token y permisos de Facebook para publicar en la página.
 *
 * Uso:
 *   cd C:\Proyectos\nexova\backend
 *   node scripts/test-facebook.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { isFacebookConfigured, verifyFacebookPageAccess } from '../src/services/facebook.service.js';
import { env } from '../src/config/env.js';

async function main() {
  console.log('\n--- Prueba de Facebook ---\n');
  console.log(`FACEBOOK_ENABLED: ${env.facebook.enabled}`);
  console.log(`FACEBOOK_PAGE_ID: ${env.facebook.pageId || '(vacío)'}`);
  console.log(`PUBLIC_URL: ${env.publicUrl}`);
  console.log(`Token configurado: ${env.facebook.pageAccessToken ? 'sí' : 'no'}\n`);

  if (!isFacebookConfigured()) {
    console.error('Configura FACEBOOK_PAGE_ID y FACEBOOK_PAGE_ACCESS_TOKEN en .env\n');
    process.exit(1);
  }

  const result = await verifyFacebookPageAccess();

  if (result.pageName) {
    console.log(`Página: ${result.pageName} (id: ${result.pageId})`);
  }
  if (result.scopes?.length) {
    console.log(`Permisos del token: ${result.scopes.join(', ')}`);
  }

  if (result.ok) {
    console.log('\n✓ Token listo para publicar propiedades.\n');
    process.exit(0);
  }

  console.error(`\n✗ ${result.error}\n`);
  console.log(`Pasos:
1. Entra a https://developers.facebook.com/tools/explorer/
2. Selecciona tu app → "Get User Access Token"
3. Marca: pages_show_list, pages_read_engagement, pages_manage_posts
4. Genera el token y ejecuta en Graph API Explorer:
   GET /me/accounts
5. Copia el "access_token" de TU página (no el token de usuario)
6. Pégalo en .env como FACEBOOK_PAGE_ACCESS_TOKEN
7. Copia el "id" de la página en FACEBOOK_PAGE_ID
8. pm2 restart nexova-api --update-env
`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
