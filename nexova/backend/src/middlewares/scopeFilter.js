import { Op } from 'sequelize';
import { LeadAssignment, Lead, Asesor } from '../models/index.js';

const EMPTY_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Inyecta filtros de scope según rol (sustituto de RLS en MySQL).
 * Owner: sin filtro de business
 * Admin (gerente): business_id + solo su equipo de asesores
 * Asesor: business_id + leads asignados
 */
export function buildScopeWhere(req, baseWhere = {}) {
  const where = { ...baseWhere };
  const { role, businessId } = req.user || {};

  if (role === 'owner') {
    return where;
  }

  if (role === 'admin') {
    if (!businessId) {
      throw new Error('Gerente sin empresa asignada');
    }
    where.business_id = businessId;
    return where;
  }

  if (role === 'asesor') {
    if (!businessId) {
      throw new Error('Asesor sin business_id asignado');
    }
    where.business_id = businessId;
    return where;
  }

  return where;
}

/** Filtro para listar/editar asesores según rol. */
export function buildAsesorWhere(req, baseWhere = {}) {
  const where = buildScopeWhere(req, baseWhere);
  if (req.user?.role === 'admin') {
    where.admin_id = req.user.id;
  }
  return where;
}

export async function getAdminTeamAsesorIds(req) {
  if (req.user?.role !== 'admin' || !req.user.businessId) return [];
  const rows = await Asesor.findAll({
    where: { business_id: req.user.businessId, admin_id: req.user.id, active: true },
    attributes: ['id'],
  });
  return rows.map((r) => r.id);
}

export async function getAsesorLeadIds(req) {
  if (req.user?.role !== 'asesor' || !req.user.asesorId) {
    return null;
  }
  const assignments = await LeadAssignment.findAll({
    where: {
      asesor_id: req.user.asesorId,
      status: { [Op.notIn]: ['reasignado', 'perdido'] },
    },
    attributes: ['lead_id'],
  });
  return assignments.map((a) => a.lead_id);
}

/** Leads visibles para un gerente: asignados a su equipo + sin asignar en la empresa. */
export async function getAdminAccessibleLeadIds(req) {
  if (req.user?.role !== 'admin' || !req.user.businessId) return [];

  const teamAsesorIds = await getAdminTeamAsesorIds(req);
  const businessId = req.user.businessId;

  let assignedLeadIds = [];
  if (teamAsesorIds.length) {
    const assignments = await LeadAssignment.findAll({
      where: {
        asesor_id: { [Op.in]: teamAsesorIds },
        status: { [Op.notIn]: ['reasignado', 'perdido'] },
      },
      attributes: ['lead_id'],
    });
    assignedLeadIds = assignments.map((a) => a.lead_id);
  }

  const businessLeads = await Lead.findAll({
    where: { business_id: businessId },
    attributes: ['id'],
  });
  const businessLeadIds = businessLeads.map((l) => l.id);
  if (!businessLeadIds.length) return [];

  const activeAssignments = await LeadAssignment.findAll({
    where: {
      lead_id: { [Op.in]: businessLeadIds },
      status: { [Op.notIn]: ['reasignado', 'perdido'] },
    },
    attributes: ['lead_id'],
  });
  const assignedSet = new Set(activeAssignments.map((a) => a.lead_id));
  const unassignedLeadIds = businessLeadIds.filter((id) => !assignedSet.has(id));

  return [...new Set([...assignedLeadIds, ...unassignedLeadIds])];
}

export function scopeMiddleware(resourceType) {
  return async (req, res, next) => {
    try {
      req.scope = {
        where: buildScopeWhere(req),
        resourceType,
      };
      if (req.user?.role === 'asesor') {
        req.scope.leadIds = await getAsesorLeadIds(req);
      }
      if (req.user?.role === 'admin') {
        req.scope.teamAsesorIds = await getAdminTeamAsesorIds(req);
        req.scope.leadIds = await getAdminAccessibleLeadIds(req);
      }
      next();
    } catch (err) {
      res.status(403).json({ error: err.message });
    }
  };
}

export function applyLeadScope(where, req) {
  const scoped = buildScopeWhere(req, where);
  if (req.user?.role === 'asesor' && req.scope?.leadIds) {
    scoped.id = { [Op.in]: req.scope.leadIds.length ? req.scope.leadIds : [EMPTY_ID] };
  }
  if (req.user?.role === 'admin' && req.scope?.leadIds) {
    scoped.id = { [Op.in]: req.scope.leadIds.length ? req.scope.leadIds : [EMPTY_ID] };
  }
  return scoped;
}

/** Propiedades visibles para todos los usuarios de la empresa (sin filtrar por gerente). */
export function applyPropertyScope(where, req) {
  return buildScopeWhere(req, where);
}

export async function assertAsesorInAdminTeam(req, asesorId) {
  if (req.user?.role !== 'admin') return true;
  const teamIds = req.scope?.teamAsesorIds || await getAdminTeamAsesorIds(req);
  return teamIds.includes(asesorId);
}
