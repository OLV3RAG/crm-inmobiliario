import { CoachingInsight } from '../models/index.js';
import { buildAsesorWhere } from '../middlewares/scopeFilter.js';
import { Op } from 'sequelize';
import { Asesor } from '../models/index.js';

export async function listCoaching(req, res) {
  const where = {};
  if (req.user.role === 'asesor') {
    where.asesor_id = req.user.asesorId;
  } else if (req.user.role === 'admin') {
    const asesores = await Asesor.findAll({
      where: buildAsesorWhere(req),
      attributes: ['id'],
    });
    where.asesor_id = { [Op.in]: asesores.map((a) => a.id) };
  }
  const { outcome } = req.query;
  if (outcome) where.outcome = outcome;
  const insights = await CoachingInsight.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: 50,
  });
  res.json({ data: insights });
}

export async function markReviewed(req, res) {
  const insight = await CoachingInsight.findByPk(req.params.id);
  if (!insight) return res.status(404).json({ error: 'Insight no encontrado' });
  if (req.user.role === 'asesor' && insight.asesor_id !== req.user.asesorId) {
    return res.status(403).json({ error: 'Sin acceso' });
  }
  await insight.update({ reviewed_by_asesor: true });
  res.json({ data: insight });
}
