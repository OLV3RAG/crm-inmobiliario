/**
 * Importar propiedades desde Excel (.xlsx, .xlsm) o CSV.
 *
 * Columnas mínimas (fila 1 = encabezados):
 *   estado | municipio | colonia | direccion | costo total
 *
 * Columnas opcionales:
 *   titulo, tipo, descripcion, recamaras, banos, m2_construccion, m2_terreno,
 *   estacionamientos, estatus
 *
 * Uso:
 *   cd C:\Proyectos\nexova\backend
 *   node scripts/import-properties.js --file "C:\ruta\propiedades.xlsx" --slug gareva-zenith --admin-id UUID-GERENTE
 *
 * Simular sin guardar:
 *   node scripts/import-properties.js --file propiedades.xlsx --slug gareva-zenith --admin-id UUID --dry-run
 *
 * Plantilla Excel:
 *   node scripts/import-properties.js --generate-template
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase, sequelize } from '../src/config/database.js';
import { Property, UserRole, Business, User } from '../src/models/index.js';
import { generateId } from '../src/utils/uuid.js';
import { resolveMexicoLocation, normalizeLocationKey } from '../src/data/mexicoLocations.js';

const PROPERTY_TYPES = ['casa', 'depa', 'terreno', 'local', 'oficina', 'bodega', 'preventa'];
const STATUSES = ['disponible', 'reservada', 'vendida', 'pausada'];

const HEADER_ALIASES = {
  estado: 'state',
  state: 'state',
  municipio: 'municipality',
  minicipio: 'municipality',
  municipality: 'municipality',
  ciudad: 'city',
  city: 'city',
  localidad: 'city',
  colonia: 'colonia',
  neighborhood: 'colonia',
  direccion: 'address',
  dirección: 'address',
  address: 'address',
  domicilio: 'address',
  'costo total': 'price',
  costo_total: 'price',
  costototal: 'price',
  precio: 'price',
  price: 'price',
  costo: 'price',
  titulo: 'title',
  título: 'title',
  title: 'title',
  nombre: 'title',
  tipo: 'property_type',
  type: 'property_type',
  property_type: 'property_type',
  descripcion: 'description',
  descripción: 'description',
  description: 'description',
  recamaras: 'bedrooms',
  recámaras: 'bedrooms',
  bedrooms: 'bedrooms',
  banos: 'bathrooms',
  baños: 'bathrooms',
  bathrooms: 'bathrooms',
  m2_construccion: 'm2_construccion',
  'm2 construccion': 'm2_construccion',
  m2_terreno: 'm2_terreno',
  'm2 terreno': 'm2_terreno',
  estacionamientos: 'parking',
  parking: 'parking',
  estatus: 'status',
  status: 'status',
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    file: '',
    slug: 'gareva-zenith',
    adminId: '',
    gerenteEmail: '',
    defaultType: 'terreno',
    dryRun: false,
    generateTemplate: false,
    listGerentes: false,
    update: false,
  };

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--file' && args[i + 1]) opts.file = args[++i];
    else if (key === '--slug' && args[i + 1]) opts.slug = args[++i];
    else if (key === '--admin-id' && args[i + 1]) opts.adminId = args[++i];
    else if (key === '--gerente-email' && args[i + 1]) opts.gerenteEmail = args[++i];
    else if (key === '--tipo' && args[i + 1]) opts.defaultType = args[++i];
    else if (key === '--dry-run') opts.dryRun = true;
    else if (key === '--update' || key === '--update-prices') opts.update = true;
    else if (key === '--generate-template') opts.generateTemplate = true;
    else if (key === '--list-gerentes') opts.listGerentes = true;
  }

  return opts;
}

function cellText(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'object') {
    if (value.richText) return value.richText.map((p) => p.text).join('').trim();
    if (value.text != null) return String(value.text).trim();
    if (value.result != null) return String(value.result).trim();
  }
  return String(value).trim();
}

function parsePrice(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  let s = cellText(value);
  if (!s) return null;

  s = s.replace(/[$\sMXNmxn]/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

function numOrNull(value, parser = parseFloat) {
  const s = cellText(value);
  if (!s) return null;
  const n = parser(s.replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

function buildTitle(row) {
  if (row.title?.trim()) return row.title.trim();

  const parts = [];
  if (row.colonia) parts.push(`Col. ${row.colonia}`);
  if (row.municipality) parts.push(row.municipality);
  if (row.city && row.city !== row.municipality) parts.push(row.city);
  if (row.state) parts.push(row.state);

  if (parts.length) return `Propiedad en ${parts.join(', ')}`;
  if (row.address) return `Propiedad — ${row.address}`;
  return 'Propiedad importada';
}

function buildAddress(row) {
  const colonia = row.colonia?.trim();
  const address = row.address?.trim();

  if (colonia && address) {
    const addrLower = address.toLowerCase();
    const colLower = colonia.toLowerCase();
    if (addrLower.includes(colLower)) return address;
    return `Col. ${colonia}, ${address}`;
  }
  if (address) return address;
  if (colonia) return `Col. ${colonia}`;
  return null;
}

async function readRowsFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const workbook = new ExcelJS.Workbook();

  if (ext === '.csv') {
    await workbook.csv.readFile(filePath);
  } else if (ext === '.xlsm' || ext === '.xlsx' || ext === '.xls') {
    await workbook.xlsx.readFile(filePath);
  } else {
    throw new Error(`Formato no soportado: ${ext}. Usa .xlsx, .xlsm o .csv`);
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('El archivo no tiene hojas');

  const headerRow = sheet.getRow(1);
  const columnMap = {};

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const normalized = normalizeHeader(cell.text || cell.value);
    const field = HEADER_ALIASES[normalized];
    if (field) columnMap[field] = colNumber;
  });

  const required = ['state', 'municipality', 'price'];
  const missing = required.filter((f) => !columnMap[f]);
  if (missing.length) {
    const labels = {
      state: 'estado',
      municipality: 'municipio',
      price: 'costo total (o precio)',
    };
    throw new Error(
      `Faltan columnas en la fila 1: ${missing.map((f) => labels[f] || f).join(', ')}. `
      + 'Ejecuta --generate-template para ver la plantilla.',
    );
  }

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (field) => {
      const col = columnMap[field];
      if (!col) return '';
      return cellText(row.getCell(col).value);
    };

    const record = {
      state: get('state'),
      municipality: get('municipality'),
      city: get('city') || get('municipality') || null,
      colonia: get('colonia') || null,
      address: get('address') || null,
      price: parsePrice(columnMap.price ? row.getCell(columnMap.price).value : ''),
      title: get('title') || null,
      property_type: get('property_type') || null,
      description: get('description') || null,
      bedrooms: numOrNull(columnMap.bedrooms ? row.getCell(columnMap.bedrooms).value : '', parseInt),
      bathrooms: numOrNull(columnMap.bathrooms ? row.getCell(columnMap.bathrooms).value : '', parseFloat),
      m2_construccion: numOrNull(columnMap.m2_construccion ? row.getCell(columnMap.m2_construccion).value : ''),
      m2_terreno: numOrNull(columnMap.m2_terreno ? row.getCell(columnMap.m2_terreno).value : ''),
      parking: numOrNull(columnMap.parking ? row.getCell(columnMap.parking).value : '', parseInt),
      status: get('status') || 'disponible',
      rowNumber,
    };

    if (!record.state && !record.municipality && !record.price && !record.address) return;
    rows.push(record);
  });

  return rows;
}

async function resolveAdminId(businessId, adminId) {
  if (!adminId) {
    throw new Error('Indica --admin-id con el UUID del gerente responsable');
  }
  const role = await UserRole.findOne({
    where: { user_id: adminId, business_id: businessId, role: 'admin' },
  });
  if (!role) {
    throw new Error(`Gerente no válido para esta empresa: ${adminId}`);
  }
  return adminId;
}

function validateRow(row, defaultType) {
  const errors = [];
  const warnings = [];
  if (!row.state?.trim()) errors.push('falta estado');
  if (row.price == null || row.price <= 0) errors.push('costo total inválido');

  const propertyType = (row.property_type || defaultType).toLowerCase();
  if (!PROPERTY_TYPES.includes(propertyType)) {
    errors.push(`tipo inválido "${row.property_type}" (usa: ${PROPERTY_TYPES.join(', ')})`);
  }

  const status = (row.status || 'disponible').toLowerCase();
  if (!STATUSES.includes(status)) {
    errors.push(`estatus inválido "${row.status}"`);
  }

  const resolved = resolveMexicoLocation(row.state, row.municipality);
  if (!resolved.state) {
    errors.push(resolved.warnings[0] || `estado no reconocido: "${row.state}"`);
  }
  if (resolved.state && !resolved.municipality && row.municipality?.trim()) {
    warnings.push(`municipio "${row.municipality}" sin coincidencia — quedará vacío para captura manual`);
  }

  const location = {
    state: resolved.state,
    municipality: resolved.municipality || null,
  };

  return { errors, warnings, propertyType, status, location };
}

function rowFingerprint(businessId, adminId, row, location) {
  const address = buildAddress(row);
  return [
    businessId,
    adminId,
    location.state,
    location.municipality || '',
    normalizeLocationKey(row.city || row.municipality || ''),
    normalizeLocationKey(address || ''),
  ].join('|');
}

function fingerprintFromProperty(property) {
  return [
    property.business_id,
    property.admin_id,
    property.state || '',
    property.municipality || '',
    normalizeLocationKey(property.city || ''),
    normalizeLocationKey(property.address || ''),
  ].join('|');
}

async function loadExistingByFingerprint(businessId, adminId) {
  const properties = await Property.findAll({
    where: { business_id: businessId, admin_id: adminId },
  });
  const byFingerprint = new Map();
  const byAddress = new Map();
  for (const property of properties) {
    byFingerprint.set(fingerprintFromProperty(property), property);
    const addrKey = normalizeLocationKey(property.address || '');
    if (addrKey && !byAddress.has(addrKey)) byAddress.set(addrKey, property);
  }
  return { byFingerprint, byAddress };
}

function findExisting(existingMaps, businessId, adminId, row, location) {
  const fp = rowFingerprint(businessId, adminId, row, location);
  if (existingMaps.byFingerprint.has(fp)) {
    return existingMaps.byFingerprint.get(fp);
  }
  const address = normalizeLocationKey(buildAddress(row) || '');
  if (address && existingMaps.byAddress.has(address)) {
    return existingMaps.byAddress.get(address);
  }
  return null;
}

async function upsertPropertyRecord({ businessId, adminId, row, defaultType, update, existingMap }) {
  const { errors, warnings, propertyType, status, location } = validateRow(row, defaultType);
  if (errors.length) throw new Error(errors.join('; '));

  const title = buildTitle(row);
  const address = buildAddress(row);
  const state = location.state;
  const municipality = location.municipality || null;

  const payload = {
    title,
    property_type: propertyType,
    state,
    municipality,
    city: row.city?.trim() || null,
    zone: state,
    address,
    price: row.price,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    m2_construccion: row.m2_construccion,
    m2_terreno: row.m2_terreno,
    parking: row.parking,
    description: row.description?.trim() || null,
    status,
  };

  if (update) {
    const existing = findExisting(existingMap, businessId, adminId, row, location);
    if (!existing) {
      throw new Error('no encontrada en el sistema (usa importación sin --update para crearla)');
    }
    const oldPrice = Number(existing.price);
    await existing.update(payload);
    return { title, price: row.price, state, municipality, action: 'updated', oldPrice, warnings };
  }

  await Property.create({
    id: generateId(),
    business_id: businessId,
    admin_id: adminId,
    ...payload,
    currency: 'MXN',
    images: null,
    asesor_id: null,
  });

  return { title, price: row.price, state, municipality, action: 'created', warnings };
}

async function generateTemplate() {
  const outPath = path.join(__dirname, 'templates', 'propiedades-plantilla.xlsx');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Propiedades');

  sheet.columns = [
    { header: 'estado', key: 'estado', width: 22 },
    { header: 'municipio', key: 'municipio', width: 22 },
    { header: 'ciudad', key: 'ciudad', width: 22 },
    { header: 'colonia', key: 'colonia', width: 24 },
    { header: 'direccion', key: 'direccion', width: 36 },
    { header: 'costo total', key: 'costo_total', width: 16 },
    { header: 'titulo', key: 'titulo', width: 32 },
    { header: 'tipo', key: 'tipo', width: 12 },
  ];

  sheet.addRow({
    estado: 'Chihuahua',
    municipio: 'Chihuahua',
    colonia: 'Praderas del Sol',
    direccion: 'Calle Roble 123',
    costo_total: 850000,
    titulo: '',
    tipo: 'terreno',
  });
  sheet.addRow({
    estado: 'Chihuahua',
    municipio: 'Delicias',
    colonia: 'Centro',
    direccion: 'Av. Principal 456',
    costo_total: 1250000,
    titulo: 'Casa en Delicias',
    tipo: 'casa',
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getColumn('costo_total').numFmt = '#,##0';

  await workbook.xlsx.writeFile(outPath);
  console.log(`\nPlantilla creada: ${outPath}\n`);
}

async function listGerentes(businessId) {
  const roles = await UserRole.findAll({
    where: { business_id: businessId, role: 'admin' },
    include: [{ model: User, attributes: ['id', 'full_name', 'email'] }],
    order: [[User, 'full_name', 'ASC']],
  });
  return roles.map((r) => ({
    id: r.user_id,
    name: r.user?.full_name || '(sin nombre)',
    email: r.user?.email || '',
  }));
}

function printGerentes(gerentes, business) {
  console.log(`\nGerentes de ${business.name} (${business.slug}):\n`);
  gerentes.forEach((g, i) => {
    console.log(`  ${i + 1}. ${g.name}`);
    console.log(`     ${g.email}`);
    console.log(`     --admin-id ${g.id}`);
    console.log(`     --gerente-email ${g.email}\n`);
  });
}

async function resolveAdminIdFromOpts(businessId, opts) {
  if (opts.gerenteEmail) {
    const email = opts.gerenteEmail.trim().toLowerCase();
    const gerentes = await listGerentes(businessId);
    const match = gerentes.find((g) => g.email.toLowerCase() === email);
    if (!match) {
      throw new Error(`No hay gerente con correo: ${opts.gerenteEmail}`);
    }
    return match.id;
  }
  if (opts.adminId) {
    return resolveAdminId(businessId, opts.adminId);
  }
  const gerentes = await listGerentes(businessId);
  if (gerentes.length === 1) {
    console.log(`Usando único gerente: ${gerentes[0].name} (${gerentes[0].email})`);
    return gerentes[0].id;
  }
  return null;
}

async function main() {
  const opts = parseArgs();

  if (opts.generateTemplate) {
    await generateTemplate();
    return;
  }

  await connectDatabase();

  const business = await Business.findOne({ where: { slug: opts.slug } });
  if (!business) {
    console.error(`Empresa no encontrada: ${opts.slug}`);
    process.exit(1);
  }

  if (opts.listGerentes) {
    printGerentes(await listGerentes(business.id), business);
    await sequelize.close();
    return;
  }

  if (!opts.file) {
    console.error(`
Importar propiedades desde Excel o CSV.

  node scripts/import-properties.js --file "C:\\ruta\\propiedades.xlsx" --slug gareva-zenith --gerente-email gerente@empresa.mx

Opciones:
  --list-gerentes        Lista gerentes con nombre, correo y UUID
  --gerente-email        Correo del gerente (más fácil que el UUID)
  --admin-id             UUID del gerente responsable
  --dry-run              Solo muestra qué se importaría
  --update               Actualiza propiedades existentes (precio y datos), sin duplicar
  --generate-template    Crea scripts/templates/propiedades-plantilla.xlsx
  --tipo terreno         Tipo por defecto si la columna "tipo" está vacía (terreno, casa, depa, ...)

Columnas obligatorias: estado, municipio, costo total
Recomendadas: colonia, direccion
Opcionales: titulo, tipo, descripcion, recamaras, banos, m2_terreno, estatus

Las fotos y publicación en Facebook se agregan después desde el CRM.
`);
    process.exit(1);
  }

  if (!PROPERTY_TYPES.includes(opts.defaultType)) {
    console.error(`Tipo por defecto inválido: ${opts.defaultType}`);
    process.exit(1);
  }

  const filePath = path.resolve(opts.file);
  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    process.exit(1);
  }

  let adminId;
  try {
    adminId = await resolveAdminIdFromOpts(business.id, opts);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  if (!adminId) {
    console.error('Hay varios gerentes. Indica cuál es responsable de estas propiedades:\n');
    printGerentes(await listGerentes(business.id), business);
    console.error('Ejemplo:');
    console.error('  --gerente-email correo@empresa.mx');
    console.error('  --admin-id UUID-del-gerente\n');
    process.exit(1);
  }

  const rows = await readRowsFromFile(filePath);
  if (!rows.length) {
    console.error('No hay filas de datos (solo encabezados o archivo vacío).');
    process.exit(1);
  }

  console.log(`\nEmpresa: ${business.name} (${business.slug})`);
  const gerenteInfo = (await listGerentes(business.id)).find((g) => g.id === adminId);
  console.log(`Gerente: ${gerenteInfo?.name || adminId}${gerenteInfo?.email ? ` (${gerenteInfo.email})` : ''}`);
  console.log(`Filas a procesar: ${rows.length}`);
  if (opts.update) console.log('MODO ACTUALIZACIÓN — corrige precios/datos sin crear duplicados');
  if (opts.dryRun) console.log('MODO SIMULACIÓN — no se guardará nada\n');

  const existingMap = opts.update
    ? await loadExistingByFingerprint(business.id, adminId)
    : null;

  let ok = 0;
  let failed = 0;
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const previewTitle = buildTitle(row);
    const label = `Fila ${row.rowNumber}: ${previewTitle}`;

    if (opts.dryRun) {
      const { errors, warnings, propertyType, location } = validateRow(row, opts.defaultType);
      if (errors.length) {
        console.log(`  ✗ ${label} — ${errors.join('; ')}`);
        failed += 1;
        continue;
      }
      const munNote = location.municipality ? location.municipality : '(municipio vacío)';
      if (opts.update) {
        const exists = findExisting(existingMap, business.id, adminId, row, location);
        console.log(`  ${exists ? '↻' : '✗'} ${label} — $${row.price?.toLocaleString('es-MX')} | ${munNote} (${exists ? 'actualizaría' : 'no encontrada'})`);
        warnings.forEach((w) => console.log(`      ⚠ ${w}`));
        if (exists) updated += 1;
        else failed += 1;
      } else {
        console.log(`  ○ ${label} — $${row.price?.toLocaleString('es-MX')} (${propertyType}) | ${munNote}`);
        warnings.forEach((w) => console.log(`      ⚠ ${w}`));
        ok += 1;
      }
      continue;
    }

    try {
      const result = await upsertPropertyRecord({
        businessId: business.id,
        adminId,
        row,
        defaultType: opts.defaultType,
        update: opts.update,
        existingMap,
      });
      if (result.action === 'updated') {
        const diff = result.oldPrice !== result.price
          ? ` (antes $${result.oldPrice.toLocaleString('es-MX')})`
          : '';
        const munNote = result.municipality ? result.municipality : '(municipio vacío)';
        console.log(`  ↻ ${label} — $${result.price.toLocaleString('es-MX')}${diff} | ${munNote}`);
        result.warnings?.forEach((w) => console.log(`      ⚠ ${w}`));
        updated += 1;
      } else {
        const munNote = result.municipality ? result.municipality : '(municipio vacío)';
        console.log(`  ✓ ${label} — $${result.price.toLocaleString('es-MX')} | ${munNote}`);
        result.warnings?.forEach((w) => console.log(`      ⚠ ${w}`));
        created += 1;
      }
      ok += 1;
    } catch (err) {
      console.log(`  ✗ ${label} — ${err.message}`);
      failed += 1;
    }
  }

  console.log(`\nListo: ${ok} correctas, ${failed} con error.`);
  if (opts.update) {
    console.log(`  Actualizadas: ${updated}`);
    if (!opts.dryRun && created) console.log(`  Creadas: ${created}`);
  } else if (!opts.dryRun && created) {
    console.log(`  Creadas: ${created}`);
  }
  if (!opts.dryRun && !opts.update && ok > 0) {
    console.log('\nSiguiente paso: entra al CRM → Propiedades → agrega fotos y marca Facebook al guardar.\n');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
