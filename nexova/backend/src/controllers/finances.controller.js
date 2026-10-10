import { Revenue, Expense } from '../models/index.js';
import { buildScopeWhere } from '../middlewares/scopeFilter.js';
import { getOwnerFinancialMetrics } from '../services/metrics.service.js';
import { generateId } from '../utils/uuid.js';
import { logAudit } from '../middlewares/auditLogger.js';

export async function getFinances(req, res) {
  const data = await getOwnerFinancialMetrics();
  await logAudit({
    userId: req.user.id,
    action: 'view_finances',
    resourceType: 'finances',
    ip: req.ip,
  });
  res.json({ data });
}

export async function listRevenue(req, res) {
  const where = buildScopeWhere(req);
  const rows = await Revenue.findAll({ where, order: [['payment_date', 'DESC']], limit: 100 });
  res.json({ data: rows });
}

export async function listExpenses(req, res) {
  const where = buildScopeWhere(req);
  const { category } = req.query;
  if (category) where.category = category;
  const rows = await Expense.findAll({ where, order: [['expense_date', 'DESC']] });
  res.json({ data: rows });
}

export async function createExpense(req, res) {
  const businessId = req.body.business_id || req.user.businessId;
  const expense = await Expense.create({
    id: generateId(),
    business_id: businessId,
    created_by: req.user.id,
    ...req.body,
  });
  res.status(201).json({ data: expense });
}
