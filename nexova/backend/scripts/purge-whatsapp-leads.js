/**
 * Elimina leads de WhatsApp en lote (y sus chats/mensajes en cascada).
 *
 * Ver antes de borrar:
 *   node scripts/purge-whatsapp-leads.js --list
 *
 * Borrar todos los de WhatsApp del negocio:
 *   node scripts/purge-whatsapp-leads.js --all --slug gareva-zenith
 *
 * Borrar teléfonos concretos:
 *   node scripts/purge-whatsapp-leads.js --phones +5216142156467,+5216141128659 --slug gareva-zenith
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase } from '../src/config/database.js';
import { Lead, Business } from '../src/models/index.js';
import { purgeWhatsAppLeads, resolveBusinessId } from '../src/services/leadCleanup.service.js';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { list: false, all: false, phones: [], slug: 'gareva-zenith' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--list') opts.list = true;
    else if (args[i] === '--all') opts.all = true;
    else if (args[i] === '--slug' && args[i + 1]) opts.slug = args[++i];
    else if (args[i] === '--phones' && args[i + 1]) {
      opts.phones = args[++i].split(',').map((p) => p.trim()).filter(Boolean);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  await connectDatabase();

  const businessId = await resolveBusinessId({ businessSlug: opts.slug });
  if (!businessId) {
    console.error(`Negocio no encontrado: ${opts.slug}`);
    process.exit(1);
  }

  const leads = await Lead.findAll({
    where: { business_id: businessId, source: 'whatsapp' },
    attributes: ['id', 'phone', 'full_name', 'created_at'],
    order: [['created_at', 'DESC']],
  });

  if (opts.list) {
    console.log(`Leads WhatsApp (${opts.slug}): ${leads.length}`);
    leads.forEach((l) => {
      console.log(`  ${l.phone}  ${l.full_name || '(sin nombre)'}  ${l.id}`);
    });
    process.exit(0);
  }

  if (!opts.all && !opts.phones.length) {
    console.error('Usa --all o --phones +52...,+52...  (o --list para ver)');
    process.exit(1);
  }

  const deleted = await purgeWhatsAppLeads({
    businessId,
    phones: opts.phones.length ? opts.phones : undefined,
    allWhatsapp: opts.all,
  });

  console.log(`Eliminados: ${deleted.length}`);
  deleted.forEach((l) => console.log(`  ✓ ${l.phone}`));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
