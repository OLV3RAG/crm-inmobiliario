import { Op } from 'sequelize';
import { Revenue, Asesor } from '../models/index.js';
import { generateId } from '../utils/uuid.js';

export async function recordSaleRevenue({
  lead,
  asesorId,
  amount,
  commissionAmount = 0,
  paymentMethod = 'transferencia',
  notes,
  propertyId,
}) {
  const saleAmount = parseFloat(amount);
  if (!saleAmount || saleAmount <= 0) {
    return null;
  }

  const existing = await Revenue.findOne({
    where: {
      lead_id: lead.id,
      status: { [Op.ne]: 'cancelado' },
    },
  });
  if (existing) {
    return existing;
  }

  const paymentDate = new Date().toISOString().slice(0, 10);
  const revenue = await Revenue.create({
    id: generateId(),
    business_id: lead.business_id,
    lead_id: lead.id,
    asesor_id: asesorId || null,
    property_id: propertyId || null,
    amount: saleAmount,
    commission_amount: parseFloat(commissionAmount) || 0,
    payment_method: paymentMethod,
    payment_date: paymentDate,
    status: 'confirmado',
    notes: notes || `Venta WhatsApp — ${lead.full_name || lead.phone}`,
  });

  if (asesorId) {
    const asesor = await Asesor.findByPk(asesorId);
    if (asesor) {
      const prev = parseFloat(asesor.total_revenue_generated || 0);
      await asesor.update({ total_revenue_generated: prev + saleAmount });
    }
  }

  return revenue;
}
