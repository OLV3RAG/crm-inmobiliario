// File: src/data/novaarc.real.data.ts

export interface RealProperty {
  id: string;
  title: string;
  property_type: 'casa' | 'departamento' | 'terreno';
  zone: string;
  address: string;
  price: number;
  currency: 'MXN' | 'USD';
  bedrooms: number | null;
  bathrooms: string | null;
  m2_construccion: string | null;
  m2_terreno: string | null;
  parking: number | null;
  status: 'disponible' | 'apartada' | 'vendida';
  state: string;
  municipality: string | null;
  city: string | null;
}

export interface RealLead {
  id: string;
  full_name: string;
  phone: string;
  channel: 'whatsapp' | 'messenger' | 'instagram';
  status: 'new' | 'qualified' | 'closed';
  property_type?: string | null;
  zone?: string | null;
  created_at: string;
  score?: number;
  temperature?: 'frio' | 'tibio' | 'caliente';
  next_action?: string;
  reasoning?: string;
}

export interface HotConversation {
  id: string;
  name: string;
  score: number;
  temperature: 'frio' | 'tibio' | 'caliente';
  channel: 'whatsapp' | 'messenger' | 'instagram';
  phone: string;
  zone?: string | null;
  action: string;
}

// Volcado real de base de datos de producción (Nova Arc Tech - 1f91abd5-0436-467d-bb75-fb212c6e7230)
export const REAL_PROPERTIES_DUMP: RealProperty[] = [
  {
    id: 'PRP-NAT-001',
    title: 'Penthouse Exclusivo con Terraza Privada',
    property_type: 'departamento',
    zone: 'Polanco',
    address: 'Av. Presidente Masaryk, Polanco, Miguel Hidalgo, CDMX',
    price: 15500000,
    currency: 'MXN',
    bedrooms: 3,
    bathrooms: '3.5',
    m2_construccion: '320',
    m2_terreno: '320',
    parking: 3,
    status: 'disponible',
    state: 'CDMX',
    municipality: 'Miguel Hidalgo',
    city: 'Ciudad de México'
  },
  {
    id: 'PRP-NAT-002',
    title: 'Residencia de Lujo con Jardín Amplio',
    property_type: 'casa',
    zone: 'Jardines del Pedregal',
    address: 'Calle del Agua, Jardines del Pedregal, Álvaro Obregón, CDMX',
    price: 24000000,
    currency: 'MXN',
    bedrooms: 4,
    bathrooms: '4.5',
    m2_construccion: '450',
    m2_terreno: '600',
    parking: 4,
    status: 'disponible',
    state: 'CDMX',
    municipality: 'Álvaro Obregón',
    city: 'Ciudad de México'
  },
  {
    id: 'PRP-NAT-003',
    title: 'Loft Moderno Remodelado',
    property_type: 'departamento',
    zone: 'Roma Norte',
    address: 'Colima 123, Roma Norte, Cuauhtémoc, CDMX',
    price: 4500000,
    currency: 'MXN',
    bedrooms: 1,
    bathrooms: '1.5',
    m2_construccion: '85',
    m2_terreno: '85',
    parking: 1,
    status: 'apartada',
    state: 'CDMX',
    municipality: 'Cuauhtémoc',
    city: 'Ciudad de México'
  },
  {
    id: 'PRP-NAT-004',
    title: 'Terreno Comercial Premium',
    property_type: 'terreno',
    zone: 'Santa Fe',
    address: 'Av. Vasco de Quiroga, Santa Fe, Cuajimalpa, CDMX',
    price: 32000000,
    currency: 'MXN',
    bedrooms: null,
    bathrooms: null,
    m2_construccion: null,
    m2_terreno: '1200',
    parking: null,
    status: 'disponible',
    state: 'CDMX',
    municipality: 'Cuajimalpa',
    city: 'Ciudad de México'
  },
  {
    id: 'PRP-NAT-005',
    title: 'Casa Minimalista en Privada',
    property_type: 'casa',
    zone: 'Interlomas',
    address: 'Boulevard Interlomas, Huixquilucan, Estado de México',
    price: 18500000,
    currency: 'MXN',
    bedrooms: 3,
    bathrooms: '3',
    m2_construccion: '280',
    m2_terreno: '310',
    parking: 3,
    status: 'disponible',
    state: 'Estado de México',
    municipality: 'Huixquilucan',
    city: 'Huixquilucan'
  }
];

export const REAL_LEADS_DUMP: RealLead[] = [
  {
    id: 'LD-NAT-001',
    full_name: 'Roberto Sánchez',
    phone: '5512345678',
    channel: 'whatsapp',
    status: 'qualified',
    property_type: 'departamento',
    zone: 'Polanco',
    created_at: '2023-11-10T09:30:00Z',
    score: 88,
    temperature: 'caliente',
    next_action: 'Agendar cita para visitar el penthouse en Polanco.',
    reasoning: 'El cliente tiene preaprobación hipotecaria lista y urge mudarse este mes.'
  },
  {
    id: 'LD-NAT-002',
    full_name: 'Mariana Gómez',
    phone: '5587654321',
    channel: 'instagram',
    status: 'new',
    property_type: 'casa',
    zone: 'Lomas de Chapultepec',
    created_at: '2023-11-14T14:15:00Z',
    score: 45,
    temperature: 'tibio',
    next_action: 'Enviar brochure de propiedades en la zona poniente.',
    reasoning: 'Inversionista buscando opciones, presupuesto flexible pero sin prisa.'
  },
  {
    id: 'LD-NAT-003',
    full_name: 'Luis Arango',
    phone: '5533334444',
    channel: 'whatsapp',
    status: 'qualified',
    property_type: 'casa',
    zone: 'Jardines del Pedregal',
    created_at: '2023-11-01T10:00:00Z',
    score: 95,
    temperature: 'caliente',
    next_action: 'Negociar oferta final de la residencia en el Pedregal.',
    reasoning: 'Pago de contado, muy interesado en los acabados de madera.'
  },
  {
    id: 'LD-NAT-004',
    full_name: 'Sofía Castro',
    phone: '5599887766',
    channel: 'messenger',
    status: 'new',
    property_type: 'departamento',
    zone: 'Roma Norte',
    created_at: '2023-11-15T08:20:00Z',
    score: 75,
    temperature: 'tibio',
    next_action: 'Dar seguimiento a la visita del Loft Roma.',
    reasoning: 'Visitó el departamento ayer, está esperando respuesta de su crédito bancario.'
  }
];

export const HOT_CONVERSATIONS_DUMP: HotConversation[] = [
  {
    id: 'HC-NAT-001',
    name: 'Roberto Sánchez',
    score: 88,
    temperature: 'caliente',
    channel: 'whatsapp',
    phone: '5512345678',
    zone: 'Polanco',
    action: 'Agendar cita Penthouse'
  },
  {
    id: 'HC-NAT-002',
    name: 'Luis Arango',
    score: 95,
    temperature: 'caliente',
    channel: 'whatsapp',
    phone: '5533334444',
    zone: 'Pedregal',
    action: 'Cerrar negociación Casa'
  },
  {
    id: 'HC-NAT-003',
    name: 'Sofía Castro',
    score: 75,
    temperature: 'tibio',
    channel: 'messenger',
    phone: '5599887766',
    zone: 'Roma Norte',
    action: 'Llamar status crédito'
  }
];
