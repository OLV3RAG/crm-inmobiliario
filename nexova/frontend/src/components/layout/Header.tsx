import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  Bell, 
  Settings as SettingsIcon, 
  LogOut, 
  Cloud,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  User,
  Moon,
  Sun
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthContext } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export function Header({ className }: { className?: string }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState('Hace 1 minuto');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const { currentUser, logout } = useAuthContext();
  const navigate = useNavigate();

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced('Justo ahora');
    }, 2000);
  };

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <header className={cn(
      "h-16 flex items-center justify-between px-6 sticky top-0 z-30 transition-all duration-300",
      "backdrop-blur-2xl bg-[#0A0A0F]/60 border-b border-amber-500/15 shadow-[0_4px_30px_rgba(0,0,0,0.5)]",
      className
    )}>
      <div className="flex items-center gap-4">
        {/* Tenant Selector/Badge */}
        <motion.div 
          whileHover={{ y: -1, scale: 1.02 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(10,15,29,0.72)] rounded-lg border border-amber-500/20 backdrop-blur-md shadow-[0_2px_15px_rgba(0,0,0,0.3)] transition-colors cursor-pointer group hover:border-amber-400/50"
        >
          <Building2 className="w-4 h-4 text-[#D4AF37]" />
          <span className="text-sm font-semibold text-white tracking-wide">Gareva Zenith</span>
        </motion.div>

        {/* Sync Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[rgba(10,15,29,0.4)] rounded-lg border border-amber-500/10">
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1 rounded-md hover:bg-white/5 transition-colors disabled:opacity-50 group"
            title="Sincronizar ahora"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400 group-hover:text-[#D4AF37] transition-colors", isSyncing && "animate-spin text-[#D4AF37]")} />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="relative flex h-2 w-2 items-center justify-center">
              {isSyncing ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              )}
            </div>
            <span className="text-xs font-medium text-slate-300 tracking-wide">
              {isSyncing ? 'Sincronizando...' : `Sincronizado en tiempo real`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 flex-1 justify-end">
        <motion.a 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          href="https://garevazenith.com.mx/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-lg border border-[#C8A261]/40 text-[#F9E7B9] bg-gradient-to-r from-[#D4AF37]/10 to-transparent hover:from-[#D4AF37]/20 transition-all text-sm font-semibold shadow-[0_0_15px_rgba(212,175,55,0.1)] hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
          <ExternalLink className="w-4 h-4" />
          Portal Web
        </motion.a>

        {/* Search Bar */}
        <motion.div 
          className="relative hidden md:block"
          initial={false}
          animate={{ width: isSearchFocused ? 320 : 256 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300", isSearchFocused ? "text-[#D4AF37]" : "text-slate-400")} />
          <input 
            type="text" 
            placeholder="Buscar propiedades, leads, etc..." 
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-10 pr-4 py-2 bg-[rgba(10,15,29,0.5)] border border-amber-500/20 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all backdrop-blur-md shadow-inner"
          />
        </motion.div>

        {/* Alerts */}
        <div className="relative" ref={notificationsRef}>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-slate-400 hover:text-[#D4AF37] transition-colors rounded-full hover:bg-white/5 focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
          </motion.button>
        </div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 pl-6 border-l border-amber-500/20 cursor-pointer focus:outline-none group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white group-hover:text-[#F9E7B9] transition-colors">{currentUser?.name || 'Usuario'}</p>
              <div className="flex items-center justify-end gap-1">
                <span className={cn(
                  "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border",
                  currentUser?.role === 'Owner' ? 'bg-purple-900/40 text-[#D4AF37] border-[#D4AF37]/30' :
                  currentUser?.role === 'Admin' ? 'bg-blue-900/40 text-[#D4AF37] border-[#D4AF37]/30' :
                  'bg-emerald-900/40 text-[#D4AF37] border-[#D4AF37]/30'
                )}>
                  {currentUser?.role}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10172A] to-[#05080F] flex items-center justify-center text-[#D4AF37] font-bold font-serif text-sm border-2 border-[#D4AF37]/40 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                {currentUser ? getInitials(currentUser.name) : <User className="w-5 h-5" />}
              </div>
              <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isProfileOpen && "rotate-180")} />
            </div>
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isProfileOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-64 bg-[rgba(10,15,29,0.95)] backdrop-blur-2xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] border border-amber-500/20 py-2 z-50"
              >
                <div className="px-4 py-3 border-b border-amber-500/10">
                  <p className="text-sm font-bold text-white truncate">{currentUser?.name}</p>
                  <p className="text-xs text-[#D4AF37] truncate mt-0.5">{currentUser?.email}</p>
                  {currentUser?.phone && (
                    <p className="text-xs text-slate-400 truncate mt-1">📱 {currentUser.phone}</p>
                  )}
                </div>
                
                <div className="py-1">
                  <Link 
                    to="/settings" 
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-[#F9E7B9] transition-colors"
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Configuración de perfil
                  </Link>
                  
                  <div className="h-px bg-amber-500/10 my-1"></div>
                  
                  <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
