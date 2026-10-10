import { AuditLog } from '../models/index.js';
import { generateId } from '../utils/uuid.js';

export function auditLog(action, resourceType, getResourceId = (req) => req.params.id) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function auditJsonWrapper(body) {
      if (res.statusCode < 400) {
        try {
          await AuditLog.create({
            id: generateId(),
            user_id: req.user?.id || null,
            business_id: req.user?.businessId || null,
            action,
            resource_type: resourceType,
            resource_id: typeof getResourceId === 'function' ? getResourceId(req) : getResourceId,
            ip_address: req.ip || req.headers['x-forwarded-for'],
            user_agent: req.headers['user-agent'],
            after_data: body?.data ? body.data : undefined,
            status: 'success',
          });
        } catch {
          /* no bloquear respuesta */
        }
      }
      return originalJson(body);
    };
    next();
  };
}

export async function logAudit({ userId, businessId, action, resourceType, resourceId, ip, userAgent, beforeData, afterData, status = 'success' }) {
  await AuditLog.create({
    id: generateId(),
    user_id: userId,
    business_id: businessId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    ip_address: ip,
    user_agent: userAgent,
    before_data: beforeData,
    after_data: afterData,
    status,
  });
}
