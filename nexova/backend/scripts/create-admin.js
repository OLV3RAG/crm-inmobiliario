/**
 * Crear un usuario administrador de empresa (rol admin).
 *
 * Uso en el servidor:
 *   cd C:\Proyectos\nexova\backend
 *   node scripts/create-admin.js --email admin2@gareva.mx --name "María Admin" --password "TuClaveSegura123" --slug gareva-zenith
 *
 * Listar empresas disponibles:
 *   node scripts/create-admin.js --list-businesses
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase, sequelize } from '../src/config/database.js';
import { User, UserRole, Business } from '../src/models/index.js';

function generateId() {
  return crypto.randomUUID();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    listBusinesses: false,
    email: '',
    name: '',
    password: '',
    slug: '',
  };

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--list-businesses') opts.listBusinesses = true;
    else if (key === '--email' && args[i + 1]) opts.email = args[++i].trim().toLowerCase();
    else if (key === '--name' && args[i + 1]) opts.name = args[++i].trim();
    else if (key === '--password' && args[i + 1]) opts.password = args[++i];
    else if (key === '--slug' && args[i + 1]) opts.slug = args[++i].trim();
  }

  return opts;
}

async function main() {
  const opts = parseArgs();
  await connectDatabase();

  if (opts.listBusinesses) {
    const businesses = await Business.findAll({
      attributes: ['id', 'name', 'slug', 'status'],
      order: [['name', 'ASC']],
    });
    console.log('\nEmpresas registradas:\n');
    businesses.forEach((b) => {
      console.log(`  ${b.slug}  →  ${b.name}  (${b.status})  id=${b.id}`);
    });
    console.log('\nUsa --slug con el valor slug de la empresa.\n');
    await sequelize.close();
    return;
  }

  if (!opts.email || !opts.name || !opts.password || !opts.slug) {
    console.error(`
Faltan datos. Ejemplo:

  node scripts/create-admin.js \\
    --email admin2@gareva.mx \\
    --name "María García" \\
    --password "ClaveTemporal123" \\
    --slug gareva-zenith

Lista de empresas:
  node scripts/create-admin.js --list-businesses
`);
    process.exit(1);
  }

  if (opts.password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const business = await Business.findOne({ where: { slug: opts.slug } });
  if (!business) {
    console.error(`Empresa no encontrada con slug: ${opts.slug}`);
    console.error('Ejecuta: node scripts/create-admin.js --list-businesses');
    process.exit(1);
  }

  const existing = await User.findOne({ where: { email: opts.email } });
  if (existing) {
    const roles = await UserRole.findAll({ where: { user_id: existing.id } });
    const alreadyAdmin = roles.some(
      (r) => r.role === 'admin' && r.business_id === business.id,
    );
    if (alreadyAdmin) {
      console.error(`El correo ${opts.email} ya es admin de ${business.name}.`);
      process.exit(1);
    }
    await UserRole.create({
      id: generateId(),
      user_id: existing.id,
      business_id: business.id,
      role: 'admin',
    });
    console.log(`\nOK — ${opts.email} ahora también es admin de "${business.name}".`);
    console.log('Si ya tenía otra contraseña, no se cambió. Usa Configuración en el CRM para cambiarla.\n');
    await sequelize.close();
    return;
  }

  const passwordHash = await bcrypt.hash(opts.password, 12);
  const user = await User.create({
    id: generateId(),
    email: opts.email,
    password_hash: passwordHash,
    full_name: opts.name,
    mfa_enabled: false,
    status: 'active',
  });

  await UserRole.create({
    id: generateId(),
    user_id: user.id,
    business_id: business.id,
    role: 'admin',
  });

  console.log('\nAdministrador creado correctamente.\n');
  console.log(`  Empresa:  ${business.name} (${business.slug})`);
  console.log(`  Nombre:   ${opts.name}`);
  console.log(`  Correo:   ${opts.email}`);
  console.log(`  CRM:      https://crm.novaarctech.com.mx/login`);
  console.log('\nEn el primer acceso deberá configurar MFA (Google/Microsoft Authenticator).\n');

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
