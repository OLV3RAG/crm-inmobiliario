import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User, UserRole } from '../models/index.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token requerido' });
    }
    const token = header.slice(7);
    const payload = jwt.verify(token, env.jwt.accessSecret);

    // Token temporal para configurar MFA (owner/admin) antes de habilitarlo
    if (payload.mfaSetup === true) {
      const user = await User.findByPk(payload.sub);
      if (!user || user.status !== 'active') {
        return res.status(401).json({ error: 'Usuario no válido' });
      }
      req.user = {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        mfaEnabled: user.mfa_enabled,
        role: payload.role,
        businessId: payload.businessId || null,
        asesorId: payload.asesorId || null,
        mfaSetup: true,
        roles: [],
      };
      return next();
    }

    const user = await User.findByPk(payload.sub);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Usuario no válido' });
    }
    const roles = await UserRole.findAll({ where: { user_id: user.id } });
    const primaryRole = roles.find((r) => r.business_id === payload.businessId) || roles[0];
    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      mfaEnabled: user.mfa_enabled,
      role: primaryRole?.role || payload.role,
      businessId: primaryRole?.business_id || payload.businessId,
      asesorId: primaryRole?.asesor_id,
      roles: roles.map((r) => ({
        role: r.role,
        businessId: r.business_id,
        asesorId: r.asesor_id,
      })),
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next();
  return authenticate(req, res, next);
}
