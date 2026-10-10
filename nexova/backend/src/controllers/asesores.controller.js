import bcrypt from 'bcrypt';
import { Asesor, User, UserRole, Business } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { buildAsesorWhere } from '../middlewares/scopeFilter.js';
import { generateId } from '../utils/uuid.js';
import { logAudit } from '../middlewares/auditLogger.js';

const BCRYPT_ROUNDS = 12;

export async function listAsesores(req, res) {
  const where = buildAsesorWhere(req);
  const asesores = await Asesor.findAll({
    where,
    include: [{
      model: User,
      as: 'gerente',
      attributes: ['id', 'full_name', 'email'],
      required: false,
    }],
    order: [['performance_score', 'DESC']],
  });
  res.json({ data: asesores });
}

export async function listBusinessOptions(req, res) {
  if (req.user.role === 'owner') {
    const businesses = await Business.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'slug'],
      order: [['name', 'ASC']],
    });
    return res.json({ data: businesses });
  }
  if (!req.user.businessId) return res.json({ data: [] });
  const business = await Business.findByPk(req.user.businessId, {
    attributes: ['id', 'name', 'slug'],
  });
  return res.json({ data: business ? [business] : [] });
}

async function resolveAdminId(req, { admin_id: bodyAdminId, businessId }) {
  if (req.user.role === 'admin') {
    return req.user.id;
  }
  if (req.user.role === 'owner') {
    if (!bodyAdminId) {
      return { error: 'Selecciona el gerente responsable' };
    }
    const gerenteRole = await UserRole.findOne({
      where: { user_id: bodyAdminId, business_id: businessId, role: 'admin' },
    });
    if (!gerenteRole) {
      return { error: 'Gerente no válido para esta empresa' };
    }
    return bodyAdminId;
  }
  return null;
}

export async function createAsesor(req, res) {
  const {
    name,
    phone,
    email,
    password,
    zone,
    specialties,
    max_concurrent_leads,
    business_id: bodyBusinessId,
    admin_id: bodyAdminId,
  } = req.body;

  if (!name?.trim() || !phone?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Nombre, teléfono, email y contraseña son obligatorios' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  let businessId = req.user.businessId;
  if (req.user.role === 'owner') {
    businessId = bodyBusinessId;
    if (!businessId) return res.status(400).json({ error: 'Selecciona la empresa' });
    const business = await Business.findByPk(businessId);
    if (!business) return res.status(400).json({ error: 'Empresa no válida' });
  } else if (!businessId) {
    return res.status(400).json({ error: 'Tu usuario no tiene empresa asignada' });
  }

  const adminIdResult = await resolveAdminId(req, { admin_id: bodyAdminId, businessId });
  if (adminIdResult?.error) return res.status(400).json({ error: adminIdResult.error });
  const adminId = adminIdResult;

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }

  let specs = specialties;
  if (typeof specialties === 'string') {
    specs = specialties.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(specialties)) {
    specs = specialties.map((s) => String(s).trim()).filter(Boolean);
  }

  const userId = generateId();
  const asesorId = generateId();
  const roleId = generateId();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const t = await sequelize.transaction();
  try {
    await User.create(
      {
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        full_name: name.trim(),
        phone: phone.trim(),
        mfa_enabled: false,
        status: 'active',
      },
      { transaction: t },
    );

    const asesor = await Asesor.create(
      {
        id: asesorId,
        business_id: businessId,
        admin_id: adminId,
        user_id: userId,
        name: name.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        zone: zone?.trim() || null,
        specialties: specs?.length ? specs : null,
        max_concurrent_leads: max_concurrent_leads ? parseInt(max_concurrent_leads, 10) : 15,
        status: 'disponible',
        active: true,
      },
      { transaction: t },
    );

    await UserRole.create(
      {
        id: roleId,
        user_id: userId,
        business_id: businessId,
        role: 'asesor',
        asesor_id: asesorId,
      },
      { transaction: t },
    );

    await t.commit();

    await logAudit({
      userId: req.user.id,
      businessId,
      action: 'asesor_created',
      resourceType: 'asesor',
      resourceId: asesorId,
      ip: req.ip,
    });

    res.status(201).json({
      data: asesor,
      user: { id: userId, email: normalizedEmail, full_name: name.trim() },
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

function parseSpecialties(specialties) {
  if (specialties === undefined) return undefined;
  if (typeof specialties === 'string') {
    const specs = specialties.split(',').map((s) => s.trim()).filter(Boolean);
    return specs.length ? specs : null;
  }
  if (Array.isArray(specialties)) {
    const specs = specialties.map((s) => String(s).trim()).filter(Boolean);
    return specs.length ? specs : null;
  }
  return null;
}

export async function updateAsesor(req, res) {
  const where = buildAsesorWhere(req, { id: req.params.id });
  const asesor = await Asesor.findOne({ where });
  if (!asesor) return res.status(404).json({ error: 'Asesor no encontrado' });

  const {
    name,
    phone,
    email,
    zone,
    specialties,
    status,
    active,
    max_concurrent_leads,
    password,
    admin_id: bodyAdminId,
  } = req.body;

  if (password && password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const specs = parseSpecialties(specialties);
  const asesorUpdates = {};

  if (name !== undefined) {
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    asesorUpdates.name = name.trim();
  }
  if (phone !== undefined) {
    if (!phone?.trim()) return res.status(400).json({ error: 'El teléfono es obligatorio' });
    asesorUpdates.phone = phone.trim();
  }
  if (email !== undefined) {
    if (!email?.trim()) return res.status(400).json({ error: 'El correo es obligatorio' });
    asesorUpdates.email = email.trim().toLowerCase();
  }
  if (zone !== undefined) asesorUpdates.zone = zone?.trim() || null;
  if (specs !== undefined) asesorUpdates.specialties = specs;
  if (max_concurrent_leads !== undefined) {
    asesorUpdates.max_concurrent_leads = parseInt(max_concurrent_leads, 10) || asesor.max_concurrent_leads;
  }

  if (req.user.role === 'owner' && bodyAdminId !== undefined) {
    const gerenteRole = await UserRole.findOne({
      where: { user_id: bodyAdminId, business_id: asesor.business_id, role: 'admin' },
    });
    if (!gerenteRole) {
      return res.status(400).json({ error: 'Gerente no válido para esta empresa' });
    }
    asesorUpdates.admin_id = bodyAdminId;
  }

  if (active === false) {
    asesorUpdates.active = false;
    asesorUpdates.status = 'inactivo';
  } else if (active === true) {
    asesorUpdates.active = true;
    asesorUpdates.status = status && status !== 'inactivo' ? status : 'disponible';
  } else if (status !== undefined) {
    asesorUpdates.status = status;
  }

  const t = await sequelize.transaction();
  try {
    if (asesor.user_id) {
      const user = await User.findByPk(asesor.user_id, { transaction: t });
      if (user) {
        const userUpdates = {};

        if (asesorUpdates.email && asesorUpdates.email !== user.email) {
          const duplicate = await User.findOne({
            where: { email: asesorUpdates.email },
            transaction: t,
          });
          if (duplicate && duplicate.id !== user.id) {
            await t.rollback();
            return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
          }
          userUpdates.email = asesorUpdates.email;
        }
        if (asesorUpdates.name) userUpdates.full_name = asesorUpdates.name;
        if (asesorUpdates.phone) userUpdates.phone = asesorUpdates.phone;
        if (password) userUpdates.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        if (active === false) userUpdates.status = 'inactive';
        if (active === true) userUpdates.status = 'active';

        if (Object.keys(userUpdates).length) {
          await user.update(userUpdates, { transaction: t });
        }
      }
    }

    await asesor.update(asesorUpdates, { transaction: t });
    await t.commit();
    await asesor.reload({
      include: [{ model: User, as: 'gerente', attributes: ['id', 'full_name', 'email'] }],
    });

    await logAudit({
      userId: req.user.id,
      businessId: asesor.business_id,
      action: active === false ? 'asesor_deactivated' : active === true ? 'asesor_reactivated' : 'asesor_updated',
      resourceType: 'asesor',
      resourceId: asesor.id,
      ip: req.ip,
    });

    res.json({ data: asesor });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}
