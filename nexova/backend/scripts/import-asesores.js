/**
 * Importar asesores desde Excel (.xlsx) o CSV.
 *
 * Plantilla de columnas (fila 1 = encabezados):
 *   nombre | telefono | email | zona | especialidades | max_leads
 *
 * También acepta: name, phone, correo, zone, specialties, max_concurrent_leads
 *
 * Uso:
 *   cd C:\Proyectos\nexova\backend
 *   node scripts/import-asesores.js --file "C:\ruta\asesores.xlsx" --slug gareva-zenith --password "Temp2026!Asesor"
 *
 * Simular sin guardar:
 *   node scripts/import-asesores.js --file asesores.xlsx --slug gareva-zenith --password "Temp2026!Asesor" --dry-run
 *
 * Generar plantilla Excel:
 *   node scripts/import-asesores.js --generate-template
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase, sequelize } from '../src/config/database.js';
import { Asesor, User, UserRole, Business } from '../src/models/index.js';
import { generateId } from '../src/utils/uuid.js';

const BCRYPT_ROUNDS = 12;

const HEADER_ALIASES = {
  nombre: 'name',
  name: 'name',
  telefono: 'phone',
  teléfono: 'phone',
  phone: 'phone',
  celular: 'phone',
  email: 'email',
  correo: 'email',
  'e-mail': 'email',
  zona: 'zone',
  zone: 'zone',
  especialidades: 'specialties',
  specialties: 'specialties',
  max_leads: 'max_concurrent_leads',
  max_concurrent_leads: 'max_concurrent_leads',
  leads_max: 'max_concurrent_leads',
};

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Evita 5.25665E+11 cuando Excel guarda el teléfono como número. */
function normalizePhoneCell(value) {
  if (value == null || value === '') return '';

  let raw = value;
  if (typeof value === 'object') {
    if (value.richText) raw = value.richText.map((p) => p.text).join('');
    else if (value.text != null) raw = value.text;
    else if (value.result != null) raw = value.result;
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return '';
    return formatPhoneDigits(String(Math.trunc(raw)));
  }

  let s = String(raw).trim();
  if (!s) return '';

  if (/^[+\-]?\d*\.?\d+[eE][+\-]?\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) s = String(Math.trunc(n));
  }

  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, '');

  return formatPhoneDigits(s);
}

function formatPhoneDigits(s) {
  const digits = s.replace(/\D/g, '');
  if (!digits) return s.trim();

  if (digits.length === 10) return `+52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return digits;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    file: '',
    slug: '',
    password: '',
    dryRun: false,
    generateTemplate: false,
  };

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--file' && args[i + 1]) opts.file = args[++i];
    else if (key === '--slug' && args[i + 1]) opts.slug = args[++i];
    else if (key === '--password' && args[i + 1]) opts.password = args[++i];
    else if (key === '--dry-run') opts.dryRun = true;
    else if (key === '--generate-template') opts.generateTemplate = true;
  }

  return opts;
}

async function readRowsFromFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const workbook = new ExcelJS.Workbook();

  if (ext === '.csv') {
    await workbook.csv.readFile(filePath);
  } else {
    await workbook.xlsx.readFile(filePath);
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

  const required = ['name', 'phone', 'email'];
  const missing = required.filter((f) => !columnMap[f]);
  if (missing.length) {
    throw new Error(
      `Faltan columnas obligatorias en la fila 1: ${missing.join(', ')}. `
      + 'Usa: nombre, telefono, email (ver plantilla).',
    );
  }

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const get = (field) => {
      const col = columnMap[field];
      if (!col) return '';
      const cell = row.getCell(col);
      const value = cell.value ?? cell.text;
      if (value == null) return '';
      if (typeof value === 'object' && value.richText) {
        return value.richText.map((p) => p.text).join('').trim();
      }
      return String(value).trim();
    };

    const record = {
      name: get('name'),
      phone: normalizePhoneCell(row.getCell(columnMap.phone).value ?? get('phone')),
      email: get('email').toLowerCase(),
      zone: get('zone') || null,
      specialties: get('specialties') || '',
      max_concurrent_leads: get('max_concurrent_leads') || '15',
      rowNumber,
    };

    if (!record.name && !record.email && !record.phone) return;
    rows.push(record);
  });

  return rows;
}

function parseSpecialties(raw) {
  if (!raw) return null;
  const specs = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  return specs.length ? specs : null;
}

async function createAsesorRecord({ businessId, row, password }) {
  const normalizedEmail = row.email.trim().toLowerCase();

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new Error(`Correo ya registrado: ${normalizedEmail}`);
  }

  const userId = generateId();
  const asesorId = generateId();
  const roleId = generateId();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const specs = parseSpecialties(row.specialties);
  const maxLeads = parseInt(row.max_concurrent_leads, 10) || 15;

  const t = await sequelize.transaction();
  try {
    await User.create({
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: row.name.trim(),
      phone: row.phone.trim(),
      mfa_enabled: false,
      status: 'active',
    }, { transaction: t });

    await Asesor.create({
      id: asesorId,
      business_id: businessId,
      user_id: userId,
      name: row.name.trim(),
      phone: row.phone.trim(),
      email: normalizedEmail,
      zone: row.zone?.trim() || null,
      specialties: specs,
      max_concurrent_leads: maxLeads,
      status: 'disponible',
      active: true,
    }, { transaction: t });

    await UserRole.create({
      id: roleId,
      user_id: userId,
      business_id: businessId,
      role: 'asesor',
      asesor_id: asesorId,
    }, { transaction: t });

    await t.commit();
    return { email: normalizedEmail, name: row.name.trim() };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

async function generateTemplate() {
  const outPath = path.join(__dirname, 'templates', 'asesores-plantilla.xlsx');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Asesores');

  sheet.columns = [
    { header: 'nombre', key: 'nombre', width: 28 },
    { header: 'telefono', key: 'telefono', width: 18 },
    { header: 'email', key: 'email', width: 32 },
    { header: 'zona', key: 'zona', width: 16 },
    { header: 'especialidades', key: 'especialidades', width: 24 },
    { header: 'max_leads', key: 'max_leads', width: 12 },
  ];

  sheet.addRow({
    nombre: 'Juan Pérez',
    telefono: '+526141234567',
    email: 'juan.perez@empresa.mx',
    zona: 'Zona Norte',
    especialidades: 'casa, depa',
    max_leads: 15,
  });
  sheet.addRow({
    nombre: 'María López',
    telefono: '+526149876543',
    email: 'maria.lopez@empresa.mx',
    zona: 'Centro',
    especialidades: 'terreno',
    max_leads: 20,
  });

  sheet.getRow(1).font = { bold: true };

  const phoneCol = sheet.getColumn('telefono');
  phoneCol.numFmt = '@';
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const cell = sheet.getCell(`B${r}`);
    cell.value = String(cell.value ?? '');
    cell.numFmt = '@';
  }

  await workbook.xlsx.writeFile(outPath);
  console.log(`\nPlantilla creada: ${outPath}`);
  console.log('La columna telefono está como texto: escribe +52 y los 10 dígitos (ej. +526141234567).\n');
}

async function main() {
  const opts = parseArgs();

  if (opts.generateTemplate) {
    await generateTemplate();
    return;
  }

  if (!opts.file || !opts.slug || !opts.password) {
    console.error(`
Importar asesores desde Excel o CSV.

  node scripts/import-asesores.js --file "C:\\ruta\\asesores.xlsx" --slug gareva-zenith --password "ClaveTemporal123"

Opciones:
  --dry-run              Solo muestra qué se importaría
  --generate-template    Crea scripts/templates/asesores-plantilla.xlsx

Columnas (fila 1): nombre, telefono, email, zona, especialidades, max_leads
`);
    process.exit(1);
  }

  if (opts.password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const filePath = path.resolve(opts.file);
  if (!fs.existsSync(filePath)) {
    console.error(`No existe el archivo: ${filePath}`);
    process.exit(1);
  }

  await connectDatabase();

  const business = await Business.findOne({ where: { slug: opts.slug } });
  if (!business) {
    console.error(`Empresa no encontrada: ${opts.slug}`);
    process.exit(1);
  }

  const rows = await readRowsFromFile(filePath);
  if (!rows.length) {
    console.error('No hay filas de datos (solo encabezados o archivo vacío).');
    process.exit(1);
  }

  console.log(`\nEmpresa: ${business.name} (${business.slug})`);
  console.log(`Filas a procesar: ${rows.length}`);
  if (opts.dryRun) console.log('MODO SIMULACIÓN — no se guardará nada\n');

  let ok = 0;
  let failed = 0;

  for (const row of rows) {
    const label = `Fila ${row.rowNumber}: ${row.name || row.email}`;

    if (!row.name?.trim() || !row.phone?.trim() || !row.email?.trim()) {
      console.log(`  ✗ ${label} — faltan nombre, teléfono o email`);
      failed += 1;
      continue;
    }

    if (opts.dryRun) {
      console.log(`  ○ ${label} — ${row.email} (${row.phone})`);
      ok += 1;
      continue;
    }

    try {
      await createAsesorRecord({ businessId: business.id, row, password: opts.password });
      console.log(`  ✓ ${label}`);
      ok += 1;
    } catch (err) {
      console.log(`  ✗ ${label} — ${err.message}`);
      failed += 1;
    }
  }

  console.log(`\nListo: ${ok} correctos, ${failed} con error.`);
  if (!opts.dryRun && ok > 0) {
    console.log(`\nTodos usan la contraseña que indicaste con --password.`);
    console.log('Pídeles que entren al CRM y la cambien en Configuración.\n');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
