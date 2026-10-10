import { Op } from 'sequelize';
import { MarketingCampaign, Lead } from '../models/index.js';
import { buildScopeWhere } from '../middlewares/scopeFilter.js';
import { getMarketingROI } from '../services/metrics.service.js';
import { generateId } from '../utils/uuid.js';
import { logAudit } from '../middlewares/auditLogger.js';

export async function getMarketing(req, res) {
  const businessId = req.user.role === 'owner' ? req.query.business_id : req.user.businessId;
  const roi = await getMarketingROI(businessId);
  await logAudit({ userId: req.user.id, action: 'view_marketing', resourceType: 'marketing', ip: req.ip });
  res.json({ data: { roi } });
}

export async function listCampaigns(req, res) {
  const where = buildScopeWhere(req);
  const campaigns = await MarketingCampaign.findAll({ where: where.business_id ? { business_id: where.business_id } : {} });
  res.json({ data: campaigns });
}

export async function updateCampaignStatus(req, res) {
  const campaign = await MarketingCampaign.findByPk(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' });
  await campaign.update({ status: req.body.status });
  res.json({ data: campaign });
}

export async function listUtmLeads(req, res) {
  const where = buildScopeWhere(req);
  const leads = await Lead.findAll({
    where: { ...where, utm_source: { [Op.ne]: null } },
    attributes: ['id', 'full_name', 'phone', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'created_at'],
    order: [['created_at', 'DESC']],
    limit: 200,
  });
  res.json({ data: leads });
}
