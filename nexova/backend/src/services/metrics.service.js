import { Op, fn, col, literal } from 'sequelize';
import {
  Lead, Revenue, Expense, Asesor, MarketingCampaign, ConversationScore, Conversation,
} from '../models/index.js';
import { buildScopeWhere, buildAsesorWhere } from '../middlewares/scopeFilter.js';

export async function getAdminDashboardMetrics(req, days = 30) {
  const where = buildScopeWhere(req);
  const since = new Date();
  since.setDate(since.getDate() - days);

  let leadWhere = { ...where, created_at: { [Op.gte]: since } };
  let closeWhere = { ...where, status: 'closed_won', closed_at: { [Op.gte]: since } };

  if (req.user.role === 'admin' && req.scope?.leadIds) {
    const ids = req.scope.leadIds.length ? req.scope.leadIds : ['00000000-0000-0000-0000-000000000000'];
    leadWhere = { ...leadWhere, id: { [Op.in]: ids } };
    closeWhere = { ...closeWhere, id: { [Op.in]: ids } };
  }

  const leads = await Lead.count({ where: leadWhere });
  const closes = await Lead.count({ where: closeWhere });
  const revenue = await Revenue.sum('amount', {
    where: { ...where, payment_date: { [Op.gte]: since.toISOString().slice(0, 10) }, status: 'confirmado' },
  });

  const funnel = await Lead.findAll({
    where: leadWhere,
    attributes: ['status', [fn('COUNT', col('id')), 'count']],
    group: ['status'],
    raw: true,
  });

  const asesorWhere = req.user.role === 'owner'
    ? (where.business_id ? { business_id: where.business_id } : {})
    : buildAsesorWhere(req);

  const topAsesores = await Asesor.findAll({
    where: asesorWhere,
    order: [['performance_score', 'DESC']],
    limit: 5,
    attributes: ['id', 'name', 'performance_score', 'close_rate', 'current_leads'],
  });

  const convWhere = req.user.role === 'owner' ? {} : { business_id: where.business_id };
  const conversations = await Conversation.findAll({
    where: convWhere,
    include: [
      {
        model: Lead,
        where: req.user.role === 'admin' && req.scope?.leadIds?.length
          ? { id: { [Op.in]: req.scope.leadIds } }
          : undefined,
        required: req.user.role === 'admin' && !!req.scope?.leadIds?.length,
        attributes: ['id', 'full_name', 'phone', 'zone'],
      },
      { model: ConversationScore, required: false },
    ],
    limit: 50,
  });
  conversations.sort((a, b) => (b.conversation_score?.score || 0) - (a.conversation_score?.score || 0));
  const topHot = conversations.slice(0, 10);

  return {
    period: days,
    leads,
    closes,
    conversionRate: leads ? ((closes / leads) * 100).toFixed(1) : 0,
    revenue: revenue || 0,
    funnel,
    topAsesores,
    hotConversations: topHot,
  };
}

export async function getOwnerFinancialMetrics() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const revenueMonth = await Revenue.sum('amount', {
    where: { payment_date: { [Op.gte]: monthStart }, status: 'confirmado' },
  });
  const expensesMonth = await Expense.sum('amount', {
    where: { expense_date: { [Op.gte]: monthStart } },
  });

  const revenueByBusiness = await Revenue.findAll({
    attributes: ['business_id', [fn('SUM', col('amount')), 'total']],
    where: { payment_date: { [Op.gte]: monthStart }, status: 'confirmado' },
    group: ['business_id'],
    raw: true,
  });

  const dailyRevenue = await Revenue.findAll({
    attributes: [
      ['payment_date', 'date'],
      [fn('SUM', col('amount')), 'total'],
    ],
    where: {
      payment_date: { [Op.gte]: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) },
      status: 'confirmado',
    },
    group: ['payment_date'],
    order: [['payment_date', 'ASC']],
    raw: true,
  });

  return {
    revenueMonth: revenueMonth || 0,
    expensesMonth: expensesMonth || 0,
    profitMonth: (revenueMonth || 0) - (expensesMonth || 0),
    marginPercent: revenueMonth ? (((revenueMonth - (expensesMonth || 0)) / revenueMonth) * 100).toFixed(1) : 0,
    revenueByBusiness,
    dailyRevenue,
  };
}

export async function getMarketingROI(businessId = null) {
  const where = businessId ? { business_id: businessId } : {};
  const campaigns = await MarketingCampaign.findAll({ where });
  return campaigns.map((c) => {
    const cpl = c.leads_generated ? c.spent / c.leads_generated : 0;
    const cpa = c.closes_generated ? c.spent / c.closes_generated : 0;
    const roas = c.spent ? (c.revenue_generated / c.spent) : 0;
    return {
      id: c.id,
      name: c.name,
      platform: c.platform,
      spent: c.spent,
      budget: c.budget,
      leads: c.leads_generated,
      closes: c.closes_generated,
      revenue: c.revenue_generated,
      cpl,
      cpa,
      roas,
      status: c.status,
      health: roas >= 3 ? 'green' : roas >= 1 ? 'yellow' : 'red',
    };
  });
}
