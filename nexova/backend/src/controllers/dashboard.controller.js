import { getAdminDashboardMetrics, getOwnerFinancialMetrics } from '../services/metrics.service.js';
import { Business, Asesor, Lead, Revenue } from '../models/index.js';
import { Op } from 'sequelize';

export async function adminDashboard(req, res) {
  const days = parseInt(req.query.days || '30', 10);
  const metrics = await getAdminDashboardMetrics(req, days);
  res.json({ data: metrics });
}

export async function ownerDashboard(req, res) {
  const financial = await getOwnerFinancialMetrics();
  const businesses = await Business.findAll({ where: { status: 'active' } });
  const clientSummaries = await Promise.all(
    businesses.map(async (b) => {
      const asesores = await Asesor.count({ where: { business_id: b.id, active: true } });
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const leadsMonth = await Lead.count({
        where: { business_id: b.id, created_at: { [Op.gte]: monthStart } },
      });
      const closesMonth = await Lead.count({
        where: { business_id: b.id, status: 'closed_won', closed_at: { [Op.gte]: monthStart } },
      });
      const revenue = await Revenue.sum('amount', {
        where: { business_id: b.id, status: 'confirmado', payment_date: { [Op.gte]: monthStart.toISOString().slice(0, 10) } },
      });
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        plan: b.plan,
        asesores,
        leadsMonth,
        closesMonth,
        revenue: revenue || 0,
      };
    })
  );
  res.json({
    data: {
      ...financial,
      activeClients: businesses.length,
      mrr: businesses.length * 15000,
      clientSummaries,
    },
  });
}

export async function asesorDashboard(req, res) {
  const asesor = await Asesor.findByPk(req.user.asesorId);
  if (!asesor) return res.status(404).json({ error: 'Perfil de asesor no encontrado' });
  const { CoachingInsight } = await import('../models/index.js');
  const pendingCoaching = await CoachingInsight.count({
    where: { asesor_id: asesor.id, reviewed_by_asesor: false },
  });
  res.json({
    data: {
      asesor,
      pendingCoaching,
      rankingMessage: asesor.performance_score >= 8 ? 'Estás en el top 3' : 'Sigue mejorando tu score',
    },
  });
}
