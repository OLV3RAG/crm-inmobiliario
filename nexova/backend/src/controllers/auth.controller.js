import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User, UserRole, RefreshToken, PasswordResetToken } from '../models/index.js';
import { env } from '../config/env.js';
import { generateId } from '../utils/uuid.js';
import { hashToken, encrypt, decrypt } from '../utils/encryption.js';
import { logAudit } from '../middlewares/auditLogger.js';

const BCRYPT_ROUNDS = 12;
const LOCK_MINUTES = 15;
const MAX_ATTEMPTS = 5;

function signAccess(user, role, businessId, asesorId) {
  return jwt.sign(
    { sub: user.id, email: user.email, role, businessId, asesorId },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry }
  );
}

function signMfaSetupToken(user, role, businessId, asesorId) {
  return jwt.sign(
    { sub: user.id, email: user.email, role, businessId, asesorId, mfaSetup: true },
    env.jwt.accessSecret,
    { expiresIn: '10m' }
  );
}

function signRefresh(userId) {
  return jwt.sign(
    { sub: userId, type: 'refresh', jti: generateId() },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiry }
  );
}

async function storeRefreshToken({ userId, refreshToken, req }) {
  try {
    await RefreshToken.create({
      id: generateId(),
      user_id: userId,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + 7 * 86400000),
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });
  } catch (err) {
    if (err?.parent?.code === 'ER_DUP_ENTRY' || err?.name === 'SequelizeUniqueConstraintError') {
      const retryToken = signRefresh(userId);
      await RefreshToken.create({
        id: generateId(),
        user_id: userId,
        token_hash: hashToken(retryToken),
        expires_at: new Date(Date.now() + 7 * 86400000),
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });
      return retryToken;
    }
    throw err;
  }
  return refreshToken;
}

async function safeAudit(payload) {
  try {
    await logAudit(payload);
  } catch (err) {
    console.error('audit log skip', err.message);
  }
}

export async function login(req, res) {
  try {
    const { email, password, mfaCode, businessId: selectedBusinessId } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      await safeAudit({ action: 'login_failed', resourceType: 'auth', ip: req.ip, status: 'failed' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
  if (user.status === 'inactive') {
    return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
  }
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(423).json({ error: 'Cuenta bloqueada temporalmente' });
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = user.failed_login_attempts + 1;
    const updates = { failed_login_attempts: attempts };
    if (attempts >= MAX_ATTEMPTS) {
      updates.locked_until = new Date(Date.now() + LOCK_MINUTES * 60000);
      updates.failed_login_attempts = 0;
    }
    await user.update(updates);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const roles = await UserRole.findAll({ where: { user_id: user.id } });
  const primary = roles.find((r) => r.business_id === selectedBusinessId) || roles[0];
  if (!primary) return res.status(403).json({ error: 'Sin rol asignado' });

  const mfaRoleRequired = ['owner', 'admin'].includes(primary.role);
  const skipMfaInDev = env.nodeEnv === 'development' && !user.mfa_enabled;
  if (mfaRoleRequired && !skipMfaInDev) {
    let secret = null;
    if (user.mfa_enabled && user.mfa_secret) {
      try {
        secret = decrypt(user.mfa_secret);
      } catch {
        secret = null;
      }
    }

    const mfaSetupPayload = () => ({
      mfaSetupRequired: true,
      setupToken: signMfaSetupToken(user, primary.role, primary.business_id, primary.asesor_id),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: primary.role,
        businessId: primary.business_id,
        asesorId: primary.asesor_id,
      },
    });

    if (!user.mfa_enabled || !secret) {
      return res.status(200).json(mfaSetupPayload());
    }

    if (!mfaCode) {
      return res.status(200).json({ mfaRequired: true, userId: user.id });
    }

    const validMfa = speakeasy.totp.verify({ secret, encoding: 'base32', token: mfaCode, window: 1 });
    if (!validMfa) return res.status(401).json({ error: 'Código MFA inválido' });
  }

  await user.update({ failed_login_attempts: 0, locked_until: null, last_login: new Date() });
  const accessToken = signAccess(user, primary.role, primary.business_id, primary.asesor_id);
  const refreshToken = await storeRefreshToken({
    userId: user.id,
    refreshToken: signRefresh(user.id),
    req,
  });

  await safeAudit({ userId: user.id, businessId: primary.business_id, action: 'login', resourceType: 'auth', ip: req.ip });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: primary.role,
      businessId: primary.business_id,
      asesorId: primary.asesor_id,
      roles: roles.map((r) => ({ role: r.role, businessId: r.business_id, asesorId: r.asesor_id })),
    },
  });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Error al iniciar sesión. Revisa los logs de nexova-api.' });
  }
}

export async function refresh(req, res) {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido' });
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido' });
  }
  const stored = await RefreshToken.findOne({
    where: { token_hash: hashToken(refreshToken), revoked: false, expires_at: { [Op.gt]: new Date() } },
  });
  if (!stored) return res.status(401).json({ error: 'Sesión revocada' });
  await stored.update({ revoked: true });
  const user = await User.findByPk(payload.sub);
  const roles = await UserRole.findAll({ where: { user_id: user.id } });
  const primary = roles[0];
  const newRefresh = await storeRefreshToken({
    userId: user.id,
    refreshToken: signRefresh(user.id),
    req,
  });
  res.json({
    accessToken: signAccess(user, primary.role, primary.business_id, primary.asesor_id),
    refreshToken: newRefresh,
  });
}

export async function logout(req, res) {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await RefreshToken.update({ revoked: true }, { where: { token_hash: hashToken(refreshToken) } });
  }
  await logAudit({ userId: req.user?.id, action: 'logout', resourceType: 'auth', ip: req.ip });
  res.json({ ok: true });
}

export async function setupMfa(req, res) {
  if (req.user?.mfaSetup !== true && req.user?.role && ['owner', 'admin'].includes(req.user.role) && req.user.mfaEnabled) {
    // ya está habilitado, permitir regenerar si lo desean
  }
  const secret = speakeasy.generateSecret({ name: `NEXOVA (${req.user.email})` });
  const encrypted = encrypt(secret.base32);
  const qr = await QRCode.toDataURL(secret.otpauth_url);
  await User.update({ mfa_secret: encrypted }, { where: { id: req.user.id } });
  res.json({ qr, secret: secret.base32 });
}

export async function enableMfa(req, res) {
  const { code } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user.mfa_secret) {
    return res.status(400).json({ error: 'Primero ejecuta setup MFA' });
  }
  const secret = decrypt(user.mfa_secret);
  if (!speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 1 })) {
    return res.status(400).json({ error: 'Código inválido' });
  }
  await user.update({ mfa_enabled: true });
  // Si venía del flujo mfaSetup, ya puede recibir tokens normales
  const roles = await UserRole.findAll({ where: { user_id: user.id } });
  const primary = roles[0];
  const accessToken = signAccess(user, primary.role, primary.business_id, primary.asesor_id);
  const refreshToken = await storeRefreshToken({
    userId: user.id,
    refreshToken: signRefresh(user.id),
    req,
  });
  res.json({ ok: true, accessToken, refreshToken });
}

export async function me(req, res) {
  const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password_hash', 'mfa_secret'] } });
  res.json({
    user: {
      ...user.toJSON(),
      fullName: user.full_name,
      role: req.user.role,
      businessId: req.user.businessId,
      asesorId: req.user.asesorId,
      mfaEnabled: user.mfa_enabled,
      mfaSetup: req.user.mfaSetup === true,
    },
  });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) return res.json({ ok: true });
  const token = crypto.randomBytes(32).toString('hex');
  await PasswordResetToken.create({
    id: generateId(),
    user_id: user.id,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + 3600000),
  });
  res.json({ ok: true, resetToken: env.nodeEnv === 'development' ? token : undefined });
}

export async function resetPassword(req, res) {
  const { token, password } = req.body;
  const record = await PasswordResetToken.findOne({
    where: { token_hash: hashToken(token), used: false, expires_at: { [Op.gt]: new Date() } },
  });
  if (!record) return res.status(400).json({ error: 'Token inválido o expirado' });
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await User.update({ password_hash: hash }, { where: { id: record.user_id } });
  await record.update({ used: true });
  res.json({ ok: true });
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, mfaCode } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son obligatorias' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ error: 'Usuario no válido' });
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const mfaRoleRequired = ['owner', 'admin'].includes(req.user.role);
    if (mfaRoleRequired && user.mfa_enabled && user.mfa_secret) {
      if (!mfaCode) {
        return res.status(400).json({ error: 'Código MFA requerido', mfaRequired: true });
      }
      let secret;
      try {
        secret = decrypt(user.mfa_secret);
      } catch {
        return res.status(400).json({ error: 'Configura MFA antes de cambiar la contraseña' });
      }
      if (!speakeasy.totp.verify({ secret, encoding: 'base32', token: mfaCode, window: 1 })) {
        return res.status(401).json({ error: 'Código MFA inválido' });
      }
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await user.update({
      password_hash: hash,
      failed_login_attempts: 0,
      locked_until: null,
    });

    await RefreshToken.update({ revoked: true }, { where: { user_id: user.id, revoked: false } });

    const roles = await UserRole.findAll({ where: { user_id: user.id } });
    const primary = roles.find((r) => r.business_id === req.user.businessId) || roles[0];
    const accessToken = signAccess(user, primary.role, primary.business_id, primary.asesor_id);
    const refreshToken = await storeRefreshToken({
      userId: user.id,
      refreshToken: signRefresh(user.id),
      req,
    });

    await safeAudit({
      userId: user.id,
      businessId: req.user.businessId,
      action: 'password_change',
      resourceType: 'auth',
      ip: req.ip,
    });

    res.json({ ok: true, accessToken, refreshToken });
  } catch (err) {
    console.error('changePassword error', err);
    res.status(500).json({ error: 'No se pudo cambiar la contraseña' });
  }
}
