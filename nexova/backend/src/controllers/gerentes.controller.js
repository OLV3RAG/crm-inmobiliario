import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, UserRole, Business } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { generateId } from '../utils/uuid.js';
import { logAudit } from '../middlewares/auditLogger.js';

const BCRYPT_ROUNDS = 12;

async function resolveBusinessId(req, bodyBusinessId) {
  if (req.user.role === 'owner') {
    if (!bodyBusinessId) return { error: 'Selecciona la empresa' };
    const business = await Business.findByPk(bodyBusinessId);
    if (!business) return { error: 'Empresa no válida' };
    return { businessId: bodyBusinessId };
  }
  if (!req.user.businessId) return { error: 'Tu usuario no tiene empresa asignada' };
  return { businessId: req.user.businessId };
}

export async function listGerentes(req, res) {
  const { business_id: queryBusinessId } = req.query;
  const where = { role: 'admin' };

  if (req.user.role === 'owner') {
    if (queryBusinessId) where.business_id = queryBusinessId;
  } else {
    return res.status(403).json({ error: 'Solo el owner puede listar gerentes' });
  }

  const roles = await UserRole.findAll({
    where,
    include: [{
      model: User,
      attributes: ['id', 'email', 'full_name', 'phone', 'status', 'last_login'],
    }],
    order: [[User, 'full_name', 'ASC']],
  });

  const data = roles.map((r) => ({
    id: r.user_id,
    user_role_id: r.id,
    business_id: r.business_id,
    email: r.user?.email,
    full_name: r.user?.full_name,
    phone: r.user?.phone,
    status: r.user?.status,
    last_login: r.user?.last_login,
  }));

  res.json({ data });
}

export async function createGerente(req, res) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Solo el owner puede crear gerentes' });
  }

  const { name, email, password, phone, business_id: bodyBusinessId } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const biz = await resolveBusinessId(req, bodyBusinessId);
  if (biz.error) return res.status(400).json({ error: biz.error });

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    const existingRole = await UserRole.findOne({
      where: { user_id: existingUser.id, business_id: biz.businessId, role: 'admin' },
    });
    if (existingRole) {
      return res.status(409).json({ error: 'Ese correo ya es gerente de esta empresa' });
    }
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
  }

  const userId = generateId();
  const roleId = generateId();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const t = await sequelize.transaction();
  try {
    await User.create({
      id: userId,
      email: normalizedEmail,
      password_hash: passwordHash,
      full_name: name.trim(),
      phone: phone?.trim() || null,
      mfa_enabled: false,
      status: 'active',
    }, { transaction: t });

    await UserRole.create({
      id: roleId,
      user_id: userId,
      business_id: biz.businessId,
      role: 'admin',
    }, { transaction: t });

    await t.commit();

    await logAudit({
      userId: req.user.id,
      businessId: biz.businessId,
      action: 'gerente_created',
      resourceType: 'user',
      resourceId: userId,
      ip: req.ip,
    });

    res.status(201).json({
      data: {
        id: userId,
        email: normalizedEmail,
        full_name: name.trim(),
        business_id: biz.businessId,
      },
    });
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

export async function updateGerente(req, res) {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Solo el owner puede editar gerentes' });
  }

  const gerenteUserId = req.params.id;
  const role = await UserRole.findOne({
    where: { user_id: gerenteUserId, role: 'admin' },
    include: [{ model: User }],
  });
  if (!role) return res.status(404).json({ error: 'Gerente no encontrado' });

  const { name, email, phone, password, status } = req.body;
  const user = role.User;
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  const userUpdates = {};
  if (name !== undefined) userUpdates.full_name = name.trim();
  if (phone !== undefined) userUpdates.phone = phone?.trim() || null;
  if (status !== undefined) userUpdates.status = status;
  if (email !== undefined) {
    const normalized = email.trim().toLowerCase();
    const duplicate = await User.findOne({ where: { email: normalized } });
    if (duplicate && duplicate.id !== user.id) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    }
    userUpdates.email = normalized;
  }
  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    userUpdates.password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  await user.update(userUpdates);

  await logAudit({
    userId: req.user.id,
    businessId: role.business_id,
    action: 'gerente_updated',
    resourceType: 'user',
    resourceId: user.id,
    ip: req.ip,
  });

  res.json({
    data: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      status: user.status,
      business_id: role.business_id,
    },
  });
}
