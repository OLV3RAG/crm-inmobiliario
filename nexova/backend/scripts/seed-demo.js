/**
 * Datos de prueba locales para las pantallas del CRM.
 * No duplica si ya existe el negocio gareva-zenith con leads.
 */
import { connectDatabase, sequelize } from '../src/config/database.js';
import {
  Business, Asesor, Property, Lead, Conversation, Message,
  ConversationScore, LeadAssignment, Revenue,
} from '../src/models/index.js';
import { generateId } from '../src/utils/uuid.js';

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function dateOnly(days) {
  return daysAgo(days).toISOString().slice(0, 10);
}

async function main() {
  await connectDatabase();

  const existing = await Business.findOne({ where: { slug: 'gareva-zenith' } });
  if (existing) {
    const leadCount = await Lead.count({ where: { business_id: existing.id } });
    if (leadCount > 0) {
      console.log(`Ya hay ${leadCount} leads de prueba en Gareva Zenith. No se insertó nada.`);
      await sequelize.close();
      return;
    }
  }

  const business = existing || await Business.create({
    id: generateId(),
    name: 'Gareva Zenith',
    slug: 'gareva-zenith',
    industry: 'inmobiliaria',
    contact_email: 'garevazenith@gmail.com',
    contact_phone: '5512345678',
    plan: 'premium',
    status: 'active',
    primary_color: '#C5A880',
  });

  const saul = await Asesor.create({
    id: generateId(),
    business_id: business.id,
    name: 'Saúl Gómez',
    phone: '5644090292',
    email: 'saul.demo@garevazenith.com',
    zone: 'Chihuahua',
    status: 'disponible',
    active: true,
    current_leads: 4,
    close_rate: 28.5,
    performance_score: 8.6,
    total_leads_received: 6,
    total_closes: 1,
    total_revenue_generated: 185000,
  });

  const paulina = await Asesor.create({
    id: generateId(),
    business_id: business.id,
    name: 'Paulina Díaz',
    phone: '5569251492',
    email: 'paulina.demo@garevazenith.com',
    zone: 'Juárez',
    status: 'ocupado',
    active: true,
    current_leads: 3,
    close_rate: 22,
    performance_score: 7.4,
    total_leads_received: 4,
    total_closes: 1,
    total_revenue_generated: 96000,
  });

  const properties = await Property.bulkCreate([
    {
      id: generateId(), business_id: business.id, asesor_id: saul.id,
      title: 'Casa en Campestre Residencial', property_type: 'casa',
      zone: 'Campestre', state: 'Chihuahua', municipality: 'Chihuahua', city: 'Chihuahua',
      address: 'Av. Mirador 120', price: 4850000, bedrooms: 4, bathrooms: 3.5,
      m2_construccion: 280, m2_terreno: 420, parking: 2, status: 'disponible',
      latitude: 28.6712, longitude: -106.0914,
      description: 'Casa de prueba con jardín y terraza.',
    },
    {
      id: generateId(), business_id: business.id, asesor_id: saul.id,
      title: 'Departamento en Distrito 1', property_type: 'depa',
      zone: 'Centro', state: 'Chihuahua', municipality: 'Chihuahua', city: 'Chihuahua',
      address: 'Calle Libertad 45', price: 2150000, bedrooms: 2, bathrooms: 2,
      m2_construccion: 92, m2_terreno: 0, parking: 1, status: 'reservada',
      latitude: 28.6353, longitude: -106.0889,
      description: 'Departamento de prueba cerca del centro.',
    },
    {
      id: generateId(), business_id: business.id, asesor_id: paulina.id,
      title: 'Terreno en San Isidro', property_type: 'terreno',
      zone: 'San Isidro', state: 'Chihuahua', municipality: 'Chihuahua', city: 'Chihuahua',
      address: 'Lote 18, manzana 4', price: 980000, bedrooms: 0, bathrooms: 0,
      m2_construccion: 0, m2_terreno: 300, parking: 0, status: 'disponible',
      latitude: 28.7011, longitude: -106.1233,
      description: 'Terreno de prueba con servicios.',
    },
    {
      id: generateId(), business_id: business.id, asesor_id: paulina.id,
      title: 'Casa vendida en Quintas del Sol', property_type: 'casa',
      zone: 'Quintas del Sol', state: 'Chihuahua', municipality: 'Chihuahua', city: 'Chihuahua',
      address: 'Privada del Lago 8', price: 3200000, bedrooms: 3, bathrooms: 2.5,
      m2_construccion: 180, m2_terreno: 200, parking: 2, status: 'vendida',
      latitude: 28.6522, longitude: -106.1411,
      description: 'Cierre de prueba.',
    },
  ]);

  const leadDefs = [
    { name: 'Laura Gómez', phone: '526141110001', status: 'new', asesor: saul, budget: 2500000, zone: 'Centro', days: 2, temp: 'tibio', score: 62, action: 'Enviar ficha del departamento' },
    { name: 'Ricardo Méndez', phone: '526141110002', status: 'qualifying', asesor: saul, budget: 5000000, zone: 'Campestre', days: 5, temp: 'caliente', score: 88, action: 'Agendar visita este sábado' },
    { name: 'Juan Pérez', phone: '526141110003', status: 'qualified', asesor: paulina, budget: 1100000, zone: 'San Isidro', days: 8, temp: 'tibio', score: 71, action: 'Confirmar presupuesto de enganche' },
    { name: 'Mariana Ortiz', phone: '526141110004', status: 'meeting', asesor: saul, budget: 4800000, zone: 'Campestre', days: 4, temp: 'hirviendo', score: 94, action: 'Preparar oferta formal' },
    { name: 'Carlos Herrera', phone: '526141110005', status: 'negotiation', asesor: paulina, budget: 2100000, zone: 'Centro', days: 12, temp: 'caliente', score: 81, action: 'Revisar contraoferta del cliente' },
    { name: 'Elena Ruiz', phone: '526141110006', status: 'closed_won', asesor: saul, budget: 3200000, zone: 'Quintas del Sol', days: 10, temp: 'caliente', score: 90, action: 'Cierre registrado' },
    { name: 'Diego Salas', phone: '526141110007', status: 'closed_lost', asesor: paulina, budget: 900000, zone: 'San Isidro', days: 15, temp: 'frio', score: 34, action: 'Presupuesto fuera de rango' },
    { name: 'Andrea Molina', phone: '526141110008', status: 'new', asesor: paulina, budget: 1800000, zone: 'Centro', days: 1, temp: 'frio', score: 41, action: 'Primer contacto por WhatsApp' },
  ];

  for (const item of leadDefs) {
    const lead = await Lead.create({
      id: generateId(),
      business_id: business.id,
      full_name: item.name,
      phone: item.phone,
      email: `${item.phone}@demo.local`,
      source: 'whatsapp',
      status: item.status,
      property_type: 'casa',
      zone: item.zone,
      budget_min: item.budget * 0.8,
      budget_max: item.budget,
      notes: 'Lead de prueba',
      first_contact_at: daysAgo(item.days),
      last_contact_at: daysAgo(Math.max(item.days - 1, 0)),
      closed_at: item.status.startsWith('closed') ? daysAgo(item.days) : null,
      lost_reason: item.status === 'closed_lost' ? 'Presupuesto' : null,
      createdAt: daysAgo(item.days),
      updatedAt: daysAgo(Math.max(item.days - 1, 0)),
    });

    await LeadAssignment.create({
      id: generateId(),
      lead_id: lead.id,
      asesor_id: item.asesor.id,
      assigned_at: daysAgo(item.days),
      status: item.status === 'closed_won' ? 'cierre' : item.status === 'closed_lost' ? 'perdido' : 'contactado',
      assignment_reason: 'Asignación de prueba',
    });

    const conversation = await Conversation.create({
      id: generateId(),
      lead_id: lead.id,
      business_id: business.id,
      channel: 'whatsapp',
      is_active: !item.status.startsWith('closed'),
      last_message_at: daysAgo(Math.max(item.days - 1, 0)),
      unread_count: item.status === 'new' ? 2 : 0,
      createdAt: daysAgo(item.days),
    });

    await Message.bulkCreate([
      {
        id: generateId(),
        conversation_id: conversation.id,
        lead_id: lead.id,
        direction: 'inbound',
        sender_type: 'lead',
        content: `Hola, me interesa una propiedad en ${item.zone}.`,
        status: 'read',
        createdAt: daysAgo(item.days),
      },
      {
        id: generateId(),
        conversation_id: conversation.id,
        lead_id: lead.id,
        direction: 'outbound',
        sender_type: 'asesor',
        sender_id: item.asesor.id,
        content: `Hola ${item.name.split(' ')[0]}, te comparto opciones dentro de tu presupuesto.`,
        status: 'sent',
        createdAt: daysAgo(Math.max(item.days - 1, 0)),
      },
    ]);

    await ConversationScore.create({
      id: generateId(),
      conversation_id: conversation.id,
      lead_id: lead.id,
      score: item.score,
      temperature: item.temp,
      sentiment: item.score >= 70 ? 'positivo' : 'neutro',
      intent: item.score >= 85 ? 'decidido' : 'comparando',
      next_best_action: item.action,
      reasoning: 'Score de prueba para el dashboard.',
      claude_model: 'demo',
      updated_by: 'manual',
    });
  }

  const sold = properties.find((property) => property.status === 'vendida');
  const wonLead = await Lead.findOne({ where: { business_id: business.id, status: 'closed_won' } });
  await Revenue.create({
    id: generateId(),
    business_id: business.id,
    lead_id: wonLead?.id,
    asesor_id: saul.id,
    property_id: sold?.id,
    amount: 185000,
    commission_amount: 55500,
    payment_method: 'transferencia',
    payment_date: dateOnly(6),
    status: 'confirmado',
    invoice_number: 'DEMO-001',
    notes: 'Comisión de prueba, casa Quintas del Sol',
  });
  await Revenue.create({
    id: generateId(),
    business_id: business.id,
    asesor_id: paulina.id,
    amount: 96000,
    commission_amount: 28800,
    payment_method: 'transferencia',
    payment_date: dateOnly(3),
    status: 'pendiente',
    invoice_number: 'DEMO-002',
    notes: 'Apartado de prueba, departamento Distrito 1',
  });

  console.log('Datos de prueba listos.');
  console.log(`  Empresa: ${business.name}`);
  console.log('  Propiedades: 4');
  console.log('  Leads: 8');
  console.log('  Conversaciones: 8');
  console.log('  Ingresos: 2');
  await sequelize.close();
}

main().catch(async (err) => {
  console.error(err);
  try { await sequelize.close(); } catch { /* ignore */ }
  process.exit(1);
});
