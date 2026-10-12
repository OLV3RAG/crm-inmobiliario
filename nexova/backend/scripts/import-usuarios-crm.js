/**
 * Importa usuarios del Excel de Gareva (Nombre, Celular, Usuario, Perfil, Contraseña).
 * Cada fila entra con su propia contraseña. Asesor, admin y owner.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase, sequelize } from '../src/config/database.js';
import { Asesor, User, UserRole, Business } from '../src/models/index.js';
import { generateId } from '../src/utils/uuid.js';

const FILE = process.argv[2] || 'C:/Users/DAY-V/Desktop/GZ/Usuarios.xlsx';

function cellText(cell) {
  const value = cell?.text ?? cell?.value ?? '';
  if (value && typeof value === 'object') {
    if (value.richText) return value.richText.map((part) => part.text).join('').trim();
    if (value.text) return String(value.text).trim();
    if (value.result != null) return String(value.result).trim();
  }
  return String(value ?? '').trim();
}

function mapRole(perfil) {
  const value = perfil.toLowerCase();
  if (value === 'owner') return 'owner';
  if (value === 'admin' || value === 'administrador') return 'admin';
  if (value === 'asesor') return 'asesor';
  return null;
}

async function readSheet(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 3) return;
    const name = cellText(row.getCell(2));
    const phone = cellText(row.getCell(3)).replace(/\s/g, '');
    const email = cellText(row.getCell(4)).toLowerCase();
    const perfil = cellText(row.getCell(5));
    const password = cellText(row.getCell(6));
    if (!email || !password) return;
    const role = mapRole(perfil);
    if (!role) throw new Error(`Perfil no reconocido en fila ${rowNumber}: ${perfil}`);
    rows.push({ name, phone: phone || '0000000000', email, role, password, rowNumber });
  });
  return rows;
}

async function main() {
  const rows = await readSheet(FILE);
  await connectDatabase();

  let business = await Business.findOne({ where: { slug: 'gareva-zenith' } });
  if (!business) {
    business = await Business.create({
      id: generateId(),
      name: 'Gareva Zenith',
      slug: 'gareva-zenith',
      industry: 'inmobiliaria',
      contact_email: 'garevazenith@gmail.com',
      plan: 'premium',
      status: 'active',
    });
  }

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    let user = await User.findOne({ where: { email: row.email } });
    const passwordHash = await bcrypt.hash(row.password, 12);
    if (!user) {
      user = await User.create({
        id: generateId(),
        email: row.email,
        password_hash: passwordHash,
        full_name: row.name || row.email,
        phone: row.phone,
        mfa_enabled: false,
        status: 'active',
      });
      created += 1;
    } else {
      await user.update({
        password_hash: passwordHash,
        full_name: row.name || user.full_name,
        phone: row.phone,
        mfa_enabled: false,
        status: 'active',
      });
      updated += 1;
    }

    let asesor = null;
    if (row.role === 'asesor') {
      asesor = await Asesor.findOne({ where: { user_id: user.id } });
      if (!asesor) {
        asesor = await Asesor.create({
          id: generateId(),
          business_id: business.id,
          user_id: user.id,
          name: row.name || row.email,
          phone: row.phone,
          email: row.email,
          status: 'disponible',
          active: true,
        });
      } else {
        await asesor.update({
          business_id: business.id,
          name: row.name || asesor.name,
          phone: row.phone,
          email: row.email,
          active: true,
        });
      }
    }

    await UserRole.destroy({ where: { user_id: user.id } });
    await UserRole.create({
      id: generateId(),
      user_id: user.id,
      business_id: row.role === 'owner' ? null : business.id,
      role: row.role,
      asesor_id: asesor?.id || null,
    });

    console.log(`${row.role.padEnd(6)} ${row.email}`);
  }

  console.log(`\nListo. Creados: ${created}. Actualizados: ${updated}. Total: ${rows.length}.`);
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try { await sequelize.close(); } catch { /* ignore */ }
  process.exit(1);
});
