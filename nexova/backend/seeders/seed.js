import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { connectDatabase, sequelize } from '../src/config/database.js';
import {
  Business, User, UserRole, Asesor,
} from '../src/models/index.js';
import { generateId } from '../src/utils/uuid.js';

dotenv.config();

async function seed() {
  const seedPassword = process.env.SEED_PASSWORD?.trim();
  if (!seedPassword || seedPassword.length < 12) {
    console.error('Define SEED_PASSWORD (mínimo 12 caracteres) antes de ejecutar el seed.');
    process.exit(1);
  }

  await connectDatabase();

  const businesses = [
    { id: generateId(), name: 'Gareva Zenith', slug: 'gareva-zenith', contact_email: 'admin@gareva.mx', plan: 'premium' },
    { id: generateId(), name: 'VNA World Company', slug: 'vna-world', contact_email: 'admin@vna.mx', plan: 'premium' },
  ];
  for (const b of businesses) {
    await Business.findOrCreate({ where: { slug: b.slug }, defaults: b });
  }

  const gareva = await Business.findOne({ where: { slug: 'gareva-zenith' } });

  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const ownerEmail = process.env.SEED_OWNER_EMAIL?.trim() || 'jorge@nexova.com';
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@gareva.mx';
  const asesorEmail = process.env.SEED_ASESOR_EMAIL?.trim() || 'asesor@gareva.mx';

  const owner = await User.findOrCreate({
    where: { email: ownerEmail },
    defaults: {
      id: generateId(),
      email: ownerEmail,
      password_hash: passwordHash,
      full_name: process.env.SEED_OWNER_NAME?.trim() || 'Owner NEXOVA',
      mfa_enabled: false,
    },
  });
  await UserRole.findOrCreate({
    where: { user_id: owner[0].id, role: 'owner' },
    defaults: { id: generateId(), user_id: owner[0].id, business_id: null, role: 'owner' },
  });

  const adminGareva = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      id: generateId(),
      email: adminEmail,
      password_hash: passwordHash,
      full_name: process.env.SEED_ADMIN_NAME?.trim() || 'Administrador',
      mfa_enabled: false,
    },
  });
  await UserRole.findOrCreate({
    where: { user_id: adminGareva[0].id, business_id: gareva.id, role: 'admin' },
    defaults: { id: generateId(), user_id: adminGareva[0].id, business_id: gareva.id, role: 'admin' },
  });

  const asesorUser = await User.findOrCreate({
    where: { email: asesorEmail },
    defaults: {
      id: generateId(),
      email: asesorEmail,
      password_hash: passwordHash,
      full_name: process.env.SEED_ASESOR_NAME?.trim() || 'Asesor',
      mfa_enabled: false,
    },
  });

  const asesor = await Asesor.findOrCreate({
    where: { email: asesorEmail },
    defaults: {
      id: generateId(),
      business_id: gareva.id,
      user_id: asesorUser[0].id,
      name: process.env.SEED_ASESOR_NAME?.trim() || 'Asesor',
      phone: process.env.SEED_ASESOR_PHONE?.trim() || null,
      email: asesorEmail,
      zone: process.env.SEED_ASESOR_ZONE?.trim() || null,
      specialties: ['casa', 'depa'],
      performance_score: 0,
    },
  });

  await UserRole.findOrCreate({
    where: { user_id: asesorUser[0].id, business_id: gareva.id, role: 'asesor' },
    defaults: {
      id: generateId(),
      user_id: asesorUser[0].id,
      business_id: gareva.id,
      role: 'asesor',
      asesor_id: asesor[0].id,
    },
  });

  console.log('Seed completado: negocios y usuarios iniciales listos.');
  console.log('Cambia las contraseñas tras el primer acceso y configura MFA para admin/owner.');
  await sequelize.close();
}

seed().catch(console.error);
