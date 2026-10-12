import { apiRequest } from './api.client';
import type { Contact, Opportunity, PipelineStage, Property, PropertyCategory, PropertyStatus, Quote, QuoteStatus } from '@/types/crm.types';

const LEAD_STAGE: Record<string, PipelineStage> = {
  new: 'Prospección',
  qualifying: 'Calificación',
  qualified: 'Calificación',
  meeting: 'Cita/Visita',
  negotiation: 'Negociación',
  closed_won: 'Ganado',
  closed_lost: 'Perdido',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  qualifying: 'Calificando',
  qualified: 'Calificado',
  meeting: 'Cita',
  negotiation: 'Negociación',
  closed_won: 'Ganado',
  closed_lost: 'Perdido',
};

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function categoryOf(type?: string): PropertyCategory {
  if (type === 'casa') return 'Casa';
  if (type === 'depa') return 'Departamento';
  if (type === 'terreno') return 'Terreno';
  return 'Comercial';
}

function propertyStatusOf(status?: string): PropertyStatus {
  if (status === 'reservada') return 'Apartada';
  if (status === 'vendida') return 'Vendida';
  if (status === 'pausada') return 'Pausada';
  return 'Disponible';
}

function quoteStatusOf(status?: string): QuoteStatus {
  if (status === 'confirmado') return 'Aprobada';
  if (status === 'cancelado') return 'Rechazada';
  if (status === 'pendiente') return 'Enviada';
  return 'Borrador';
}

function temperatureOf(value?: string): 'caliente' | 'tibio' | 'frio' {
  if (value === 'caliente' || value === 'hirviendo') return 'caliente';
  if (value === 'tibio') return 'tibio';
  return 'frio';
}

export function mapProperty(row: any): Property {
  const images = Array.isArray(row.images) ? row.images : [];
  const location = [row.city, row.municipality, row.state || row.zone].filter(Boolean).join(', ');
  return {
    id: row.id,
    title: row.title || 'Sin título',
    operation: 'Venta',
    category: categoryOf(row.property_type),
    price: num(row.price),
    location: location || 'Sin ubicación',
    sqftConstruction: num(row.m2_construccion),
    sqftLand: num(row.m2_terreno),
    parking: num(row.parking),
    beds: num(row.bedrooms),
    baths: num(row.bathrooms),
    status: propertyStatusOf(row.status),
    syncWeb: row.status === 'disponible',
    code: String(row.id || '').slice(0, 8).toUpperCase(),
    assignedAdvisorId: row.asesor_id || '',
    assignedAdvisorEmail: row.asesor?.email || '',
    latitude: row.latitude != null ? num(row.latitude) : undefined,
    longitude: row.longitude != null ? num(row.longitude) : undefined,
    imageUrl: typeof images[0] === 'string' ? images[0] : images[0]?.url,
    images: images.map((item: any) => (typeof item === 'string' ? item : item?.url)).filter(Boolean),
    address: row.address || '',
    city: row.city || '',
    state: row.state || row.zone || '',
    municipality: row.municipality || '',
    description: row.description || '',
    propertyType: row.property_type || 'casa',
    rawStatus: row.status || 'disponible',
  };
}

export function mapContact(row: any): Contact {
  const assignment = (row.lead_assignments || row.LeadAssignments || [])[0];
  const asesor = assignment?.asesor || assignment?.Asesor;
  return {
    id: row.id,
    name: row.full_name || row.phone || 'Sin nombre',
    type: 'Comprador',
    phone: row.phone || '',
    email: row.email || '',
    notes: row.notes || '',
    assignedTo: asesor?.name || '',
    assignedAdvisorId: assignment?.asesor_id || '',
    assignedAdvisorEmail: asesor?.email || '',
    createdAt: row.created_at || row.createdAt || '',
  };
}

export function mapOpportunity(row: any): Opportunity {
  const contact = mapContact(row);
  return {
    id: row.id,
    title: contact.name,
    contactId: row.id,
    contactName: contact.name,
    amount: num(row.budget_max || row.budget_min),
    stage: LEAD_STAGE[row.status] || 'Prospección',
    priority: 'Media',
    assignedTo: contact.assignedTo,
    assignedAdvisorId: contact.assignedAdvisorId,
    assignedAdvisorEmail: contact.assignedAdvisorEmail,
    lastUpdate: row.updated_at || row.last_contact_at || row.created_at || '',
  };
}

export function mapPipelineLead(row: any) {
  const scoreRow = row.conversations?.[0]?.conversation_score || row.conversation_score;
  const temp = temperatureOf(scoreRow?.temperature);
  return {
    id: row.id,
    name: row.full_name || row.phone || 'Sin nombre',
    phone: row.phone || '',
    score: num(scoreRow?.score),
    temp,
    action: scoreRow?.next_best_action || STATUS_LABELS[row.status] || 'Sin acción',
    status: row.status || 'new',
    property_type: row.property_type || '',
    budget: row.budget_max ? `$${num(row.budget_max).toLocaleString('es-MX')}` : '',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function mapQuote(row: any): Quote {
  return {
    id: row.id,
    clientId: row.lead_id || '',
    clientName: row.notes || row.invoice_number || 'Ingreso',
    propertyId: row.property_id || '',
    propertyName: row.invoice_number || 'Venta',
    totalAmount: num(row.amount),
    downPayment: num(row.commission_amount),
    estimatedClosingCosts: 0,
    status: quoteStatusOf(row.status),
    date: row.payment_date || '',
    assignedAdvisorId: row.asesor_id || '',
    assignedAdvisorEmail: '',
  };
}

export function mapDashboard(metrics: any, properties: Property[]) {
  const leads = num(metrics?.leads);
  const funnelRows = Array.isArray(metrics?.funnel) ? metrics.funnel : [];
  const funnel = funnelRows.map((row: any) => {
    const count = num(row.count);
    return {
      label: STATUS_LABELS[row.status] || row.status || 'Etapa',
      count,
      percent: leads ? (count / leads) * 100 : 0,
    };
  });
  const hot = (Array.isArray(metrics?.hotConversations) ? metrics.hotConversations : []).map((row: any) => {
    const scoreRow = row.conversation_score || row.ConversationScore;
    const lead = row.lead || row.leads || row.Lead;
    return {
      id: row.id,
      name: lead?.full_name || lead?.phone || 'Sin nombre',
      score: num(scoreRow?.score),
      temp: temperatureOf(scoreRow?.temperature),
      action: scoreRow?.next_best_action || 'Sin acción sugerida',
    };
  });
  const rate = metrics?.conversionRate ?? 0;
  const revenue = num(metrics?.revenue);
  return {
    inventory: {
      total: properties.length,
      value: properties.reduce((sum, item) => sum + item.price, 0),
    },
    kpis: {
      leads,
      closes: num(metrics?.closes),
      conversionRate: String(rate).includes('%') ? String(rate) : `${rate}%`,
      revenue: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(revenue),
    },
    funnel,
    hot,
  };
}

export function mapConversation(row: any) {
  const lead = row.lead || row.leads || row.Lead || {};
  const score = row.conversation_score || row.ConversationScore;
  const when = row.last_message_at ? new Date(row.last_message_at) : null;
  return {
    id: row.id,
    name: lead.full_name || lead.phone || 'Sin nombre',
    phone: lead.phone || '',
    unread: num(row.unread_count),
    lastMsg: score?.next_best_action || 'Conversación',
    time: when ? when.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
    score: num(score?.score),
    temp: temperatureOf(score?.temperature),
    action: score?.next_best_action || 'Sin acción sugerida',
    status: row.is_active ? 'online' as const : 'offline' as const,
  };
}

export function mapMessage(row: any) {
  const when = row.created_at ? new Date(row.created_at) : new Date();
  return {
    id: row.id,
    text: row.content || '',
    time: when.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
    sender: row.direction === 'inbound' || row.sender_type === 'lead' ? 'client' as const : 'agent' as const,
  };
}

async function safeList<T>(path: string, map: (row: any) => T): Promise<T[]> {
  try {
    const data = await apiRequest<any>(path);
    const rows = Array.isArray(data) ? data : [];
    return rows.map(map);
  } catch {
    return [];
  }
}

export const crmApi = {
  getDashboardStats: (businessId: string, asesorId?: string | null) => {
    const query = asesorId ? `?asesorId=${asesorId}` : '';
    return apiRequest<any>(`/dashboard/admin${query}`);
  },
  getLeads: () => safeList('/leads?limit=200', mapContact),
  getProperties: () => safeList('/properties', mapProperty),
  getPipelineDeals: () => safeList('/leads?limit=200', mapOpportunity),
  getQuotes: () => safeList('/finances/revenue', mapQuote),
  getUsers: () => safeList('/asesores', (row) => row),
  getDashboard: async (days: number) => {
    const [metrics, properties] = await Promise.all([
      apiRequest<any>(`/dashboard/admin?days=${days}`).catch(() => null),
      safeList('/properties', mapProperty),
    ]);
    return mapDashboard(metrics, properties);
  },
  getPipelineLeads: () => safeList('/leads?limit=200', mapPipelineLead),
  updateLeadStatus: (leadId: string, status: string) => apiRequest(`/leads/${leadId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  updateProperty: (propertyId: string, body: Record<string, unknown>) => apiRequest<any>(`/properties/${propertyId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  createProperty: (body: Record<string, unknown>) => apiRequest<any>('/properties', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  uploadPropertyPhotos: (propertyId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('photos', file));
    return apiRequest<any>(`/properties/${propertyId}/photos`, { method: 'POST', body: form });
  },
  getBusinessOptions: () => apiRequest<any[]>('/asesores/business-options'),
  getGerentes: (businessId: string) => apiRequest<any[]>(`/gerentes?business_id=${encodeURIComponent(businessId)}`),
  getConversations: () => safeList('/conversations', mapConversation),
  getMessages: async (conversationId: string) => {
    const data = await apiRequest<any>(`/conversations/${conversationId}/messages`);
    const rows = Array.isArray(data) ? data : [];
    return rows.map(mapMessage);
  },
};
