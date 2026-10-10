import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const LoginView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Por favor completa todos los campos.');
      }

      // Autenticación directa sin código 2FA
      const result = await login(email, password);

      if (result.success) {
        navigate('/dashboard');
      } else {
        throw new Error(result.error || 'Credenciales incorrectas');
      }
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0F] flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased">
      {/* Resplandor ambiental de fondo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#C5A880]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Tarjeta de Login */}
        <div className="bg-[#0D121F]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)]">
          
          {/* Header del Login */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#C5A880]/10 border border-[#C5A880]/20 text-[#DFC7A2] mb-4 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-[#C5A880]"/>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">GAREVA ZENITH</h1>
            <p className="text-xs text-slate-400 mt-1.5 uppercase tracking-wider font-medium">
              Consola de Gestión y Control Comercial
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4"/>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@garevazenith.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#080B12] border border-white/[0.08] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#C5A880]/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4"/>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#080B12] border border-white/[0.08] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-[#C5A880]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#E2CEB1] text-[#07090E] font-semibold text-sm shadow-md hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Iniciando sesión...' : 'Acceder al CRM'}</span>
              <ArrowRight className="w-4 h-4"/>
            </button>
          </form>

        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Gareva Zenith Inmobiliaria © {new Date().getFullYear()} · Acceso Restringido
        </p>
      </div>
    </div>
  );
};
