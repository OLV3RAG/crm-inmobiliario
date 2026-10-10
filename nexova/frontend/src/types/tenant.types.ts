// File: src/types/tenant.types.ts
export type OperationType = 'Venta' | 'Renta' | 'Oportunidad';
export type PropertyCategory = 'Casa' | 'Departamento' | 'Terreno' | 'Comercial';
export type PropertyBadge = 'Exclusiva' | 'Oportunidad' | 'Preventa';
export type PropertyStatus = 'Activa' | 'Pausada' | 'Vendida';

export interface Property {
  id: string;
  title: string;
  operation: OperationType;
  category: PropertyCategory;
  price: number;
  location: string;
  beds: number;
  baths: number;
  parking: number;
  sqftConstruction: number;
  sqftLand: number;
  badge: PropertyBadge;
  destacadaEnInicio: boolean;
  visibleEnWeb: boolean;
  visitas: number;
  status: PropertyStatus;
}

export type ServicioSolicitado = 
  | 'Compra Inmueble' 
  | 'Renta' 
  | 'Asesoría Hipotecaria' 
  | 'Avalúo Patrimonial';

export type CanalCaptura = 
  | 'Formulario Contacto Web' 
  | 'WhatsApp Flotante Web' 
  | 'Portal Inmobiliario';

export type LeadStatus = 
  | 'Nuevo' 
  | 'Contactado' 
  | 'Cita Agendada' 
  | 'En Notaría' 
  | 'Cierre';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyInterest: string;
  budget?: number;
  servicioSolicitado: ServicioSolicitado;
  canalCaptura: CanalCaptura;
  estatus: LeadStatus;
  notas: string;
  date: string;
}
