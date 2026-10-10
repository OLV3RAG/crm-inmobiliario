import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Target, 
  FileText, 
  Settings,
  LogOut,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthContext } from '@/context/AuthContext';
import { motion } from 'motion/react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/pipeline', icon: Target, label: 'Pipeline' },
  { path: '/contacts', icon: Users, label: 'Contactos' },
  { path: '/properties', icon: Building2, label: 'Inventario' },
  { path: '/quotes', icon: FileText, label: 'Cotizaciones' },
  { path: '/conversations', icon: MessageSquare, label: 'Conversaciones' },
  { path: '/audit', icon: ShieldAlert, label: 'Auditoría' },
  { path: '/settings', icon: Settings, label: 'Ajustes' },
];

export function Sidebar() {
  const { logout, currentUser } = useAuthContext();

  return (
    <aside className="w-64 bg-[#0A0A0F] border-r border-[#1E1E2E] flex flex-col h-screen font-sans shrink-0">
      <div className="p-6 flex flex-col items-center justify-center border-b border-[#1E1E2E] relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 text-center"
        >
          <h1 className="text-2xl font-bold tracking-widest text-[#C5A880] font-serif" style={{ fontFamily: '"Playfair Display", "Cinzel", Georgia, serif' }}>
            GAREVA ZENITH
          </h1>
        </motion.div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item, i) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative group overflow-hidden",
                isActive
                  ? "text-zinc-100 bg-[#12121A] border border-[#1E1E2E] shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-[#12121A]/50"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div 
                    layoutId="active-nav"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-[#C5A880]"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: isActive ? 0 : 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <item.icon className={cn("w-5 h-5 transition-colors duration-300", isActive ? "text-[#C5A880]" : "text-zinc-500 group-hover:text-zinc-400")} />
                </motion.div>
                <span className="relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-[#1E1E2E]">
        <motion.div 
          className="flex items-center gap-3 p-3 rounded-xl bg-[#12121A] border border-[#1E1E2E]"
          whileHover={{ y: -2, borderColor: '#C5A880' }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-10 h-10 rounded-full bg-[#0A0A0F] border border-[#1E1E2E] flex items-center justify-center">
            <span className="text-[#C5A880] font-bold font-serif text-sm">
              {currentUser?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">{currentUser?.name}</p>
            <p className="text-[10px] text-[#C5A880] uppercase tracking-wider font-bold">
              {currentUser?.role}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </aside>
  );
}
