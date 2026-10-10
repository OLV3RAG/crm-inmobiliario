/**
 * Corrige estado y municipio de propiedades ya importadas
 * (normaliza MAYÚSCULAS y nombres de ciudad → catálogo INEGI).
 *
 * Uso:
 *   node scripts/fix-property-locations.js --dry-run
 *   node scripts/fix-property-locations.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase, sequelize } from '../src/config/database.js';
import { Property } from '../src/models/index.js';
import { resolveMexicoLocation } from '../src/data/mexicoLocations.js';

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const slug = process.argv.find((a, i) => process.argv[i - 1] === '--slug') || 'gareva-zenith';
  return { dryRun, slug };
}

async function main() {
  const { dryRun } = parseArgs();
  await connectDatabase();

  const properties = await Property.findAll({
    attributes: ['id', 'title', 'state', 'municipality', 'zone'],
    order: [['created_at', 'ASC']],
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\nPropiedades a revisar: ${properties.length}`);
  if (dryRun) console.log('MODO SIMULACIÓN\n');

  for (const property of properties) {
    const rawState = property.state || property.zone;
    const rawMun = property.municipality;
    if (!rawState && !rawMun) {
      skipped += 1;
      continue;
    }

    const location = resolveMexicoLocation(rawState, rawMun);
    if (!location.state) {
      console.log(`  ✗ ${property.title?.slice(0, 50)} — ${location.warnings.join('; ') || 'sin ubicación'}`);
      failed += 1;
      continue;
    }

    const nextMunicipality = location.municipality || null;
    const needsUpdate = property.state !== location.state
      || property.municipality !== nextMunicipality
      || property.zone !== location.state;

    if (!needsUpdate) {
      skipped += 1;
      continue;
    }

    if (dryRun) {
      console.log(`  ○ ${property.title?.slice(0, 45)}`);
      console.log(`      ${rawState} / ${rawMun || '—'} → ${location.state} / ${nextMunicipality || '(vacío)'}`);
      if (!nextMunicipality && rawMun) {
        console.log('      ⚠ municipio sin coincidencia — quedará vacío para captura manual');
      }
      updated += 1;
      continue;
    }

    await property.update({
      state: location.state,
      municipality: nextMunicipality,
      zone: location.state,
    });
    updated += 1;
  }

  console.log(`\nListo: ${updated} corregidas, ${skipped} ya correctas, ${failed} sin resolver.`);
  if (dryRun && updated > 0) {
    console.log('\nEjecuta sin --dry-run para aplicar los cambios.\n');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
