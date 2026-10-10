import { Op } from 'sequelize';
import { Property } from '../models/index.js';

export async function markPropertyAsSold({ propertyId, businessId, io }) {
  if (!propertyId) return null;

  const property = await Property.findOne({
    where: {
      id: propertyId,
      business_id: businessId,
      status: { [Op.in]: ['disponible', 'reservada'] },
    },
  });

  if (!property) {
    const err = new Error('La propiedad no existe o ya fue vendida');
    err.status = 400;
    throw err;
  }

  await property.update({ status: 'vendida' });

  const payload = { propertyId: property.id, businessId, status: 'vendida' };
  if (io) {
    io.emit('property:updated', payload);
    io.to(`business:${businessId}`).emit('property:sold', payload);
  }

  return property;
}
