// File: src/config/navigation.config.ts
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Building2,
  FileText,
  ShieldAlert,
  Settings
} from 'lucide-react';

export const navigationConfig = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    id: 'pipeline',
    label: 'Pipeline Kanban',
    path: '/pipeline',
    icon: KanbanSquare,
  },
  {
    id: 'contacts',
    label: 'Directorio Clientes',
    path: '/contacts',
    icon: Users,
  },
  {
    id: 'properties',
    label: 'Inventario Propiedades',
    path: '/properties',
    icon: Building2,
  },
  {
    id: 'quotes',
    label: 'Cotizaciones',
    path: '/quotes',
    icon: FileText,
  },
  {
    id: 'audit',
    label: 'Auditoría',
    path: '/audit',
    icon: ShieldAlert,
  },
  {
    id: 'settings',
    label: 'Configuración',
    path: '/settings',
    icon: Settings,
  }
];
