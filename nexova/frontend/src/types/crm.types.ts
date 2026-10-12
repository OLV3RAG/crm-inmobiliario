// File: src/types/crm.types.ts

export type RoleType = 'Admin' | 'Coordinador' | 'Asesor Senior' | 'Asesor Junior';

// Properties
export type PropertyOperation = 'Venta' | 'Renta';
export type PropertyCategory = 'Casa' | 'Departamento' | 'Terreno' | 'Comercial';
export type PropertyStatus = 'Disponible' | 'Apartada' | 'Vendida' | 'Rentada' | 'Pausada';

export interface Property {
  id: string;
  title: string;
  operation: PropertyOperation;
  category: PropertyCategory;
  price: number;
  location: string;
  sqftConstruction: number;
  sqftLand: number;
  parking: number;
  beds: number;
  baths: number;
  status: PropertyStatus;
  syncWeb: boolean;
  code: string;
  assignedAdvisorId: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  assignedAdvisorEmail: string;
  address: string;
  city: string;
  state: string;
  municipality: string;
  description: string;
  propertyType: string;
  rawStatus: string;
  images: string[];
}

// Contacts (Leads)
export type ContactType = 'Comprador' | 'Propietario' | 'Inversionista' | 'Notaría';

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  phone: string;
  email: string;
  company?: string;
  notes: string;
  assignedTo: string;
  assignedAdvisorId: string;
  assignedAdvisorEmail: string;
  createdAt: string;
}

// Pipeline & Opportunities (Deals)
export type PipelineStage = 'Prospección' | 'Calificación' | 'Cita/Visita' | 'Negociación' | 'Trámite Notarial' | 'Cierre' | 'Ganado' | 'Perdido';
export type PriorityLevel = 'Alta' | 'Media' | 'Baja';

export interface Opportunity {
  id: string;
  title: string;
  contactId: string;
  contactName: string;
  propertyId?: string;
  propertyName?: string;
  amount: number;
  stage: PipelineStage;
  priority: PriorityLevel;
  assignedTo: string;
  assignedAdvisorId: string;
  assignedAdvisorEmail: string;
  lastUpdate: string;
}

// Quotes
export type QuoteStatus = 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada';

export interface Quote {
  id: string;
  clientId: string;
  clientName: string;
  propertyId: string;
  propertyName: string;
  totalAmount: number;
  downPayment: number;
  estimatedClosingCosts: number;
  status: QuoteStatus;
  date: string;
  assignedAdvisorId: string;
  assignedAdvisorEmail: string;
}

// Audit Logs
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
}
