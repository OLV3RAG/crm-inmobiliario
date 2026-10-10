/**
 * Crear un usuario owner (administrador global del CRM).
 *
 * Uso en el servidor:
 *   cd C:\Proyectos\nexova\backend
 *   node scripts/create-owner.js --email owner@nexova.com --name "Jorge Owner" --password "TuClaveSegura123"
 *
 * Listar owners existentes:
 *   node scripts/create-owner.js --list-owners
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectDatabase, sequelize } from '../src/config/database.js';
import { User, UserRole } from '../src/models/index.js';

function generateId() {
  return crypto.randomUUID();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    listOwners: false,
    email: '',
    name: '',
    password: '',
  };

  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--list-owners') opts.listOwners = true;
    else if (key === '--email' && args[i + 1]) opts.email = args[++i].trim().toLowerCase();
    else if (key === '--name' && args[i + 1]) opts.name = args[++i].trim();
    else if (key === '--password' && args[i + 1]) opts.password = args[++i];
  }

  return opts;
}

async function main() {
  const opts = parseArgs();
  await connectDatabase();

  if (opts.listOwners) {
    const ownerRoles = await UserRole.findAll({
      where: { role: 'owner' },
      include: [{ model: User, attributes: ['email', 'full_name', 'status'] }],
      order: [[{ model: User }, 'email', 'ASC']],
    });

    console.log('\nUsuarios owner registrados:\n');
    if (!ownerRoles.length) {
      console.log('  (ninguno)\n');
    } else {
      ownerRoles.forEach((r) => {
        const u = r.user;
        console.log(`  ${u?.email || '?'}  →  ${u?.full_name || '?'}  (${u?.status || '?'})`);
      });
      console.log('');
    }

    await sequelize.close();
    return;
  }

  if (!opts.email || !opts.name || !opts.password) {
    console.error(`
Faltan datos. Ejemplo:

  node scripts/create-owner.js \\
    --email owner@nexova.com \\
    --name "Jorge Owner" \\
    --password "ClaveTemporal123"

Lista de owners:
  node scripts/create-owner.js --list-owners
`);
    process.exit(1);
  }

  if (opts.password.length < 8) {
    console.error('La contraseña debe tener al menos 8 caracteres.');
    process.exit(1);
  }

  const existing = await User.findOne({ where: { email: opts.email } });
  if (existing) {
    const ownerRole = await UserRole.findOne({
      where: { user_id: existing.id, role: 'owner' },
    });
    if (ownerRole) {
      console.error(`El correo ${opts.email} ya es owner.`);
      process.exit(1);
    }

    await UserRole.create({
      id: generateId(),
      user_id: existing.id,
      business_id: null,
      role: 'owner',
    });

    console.log(`\nOK — ${opts.email} ahora también es owner.`);
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
    business_id: null,
    role: 'owner',
  });

  console.log('\nOwner creado correctamente.\n');
  console.log(`  Nombre:   ${opts.name}`);
  console.log(`  Correo:   ${opts.email}`);
  console.log(`  Rol:      owner (acceso a todas las empresas)`);
  console.log(`  CRM:      https://crm.novaarctech.com.mx/login`);
  console.log('\nEn el primer acceso deberá configurar MFA (Google/Microsoft Authenticator).\n');

  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
