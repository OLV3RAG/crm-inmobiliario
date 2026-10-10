import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onFinish, 
  minDuration = 1400 
}) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulación de barra de progreso fluida
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20) + 10;
      });
    }, 150);

    // Desvanecimiento suave tras cumplir el tiempo mínimo
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 700);
    }, minDuration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [minDuration, onFinish]);

  if (!visible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A0A0F] transition-opacity duration-700 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Resplandor ambiental de fondo */}
      <div className="absolute w-80 h-80 bg-[#C5A880]/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Isotipo con halo dorado */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#0D121F] border border-[#C5A880]/30 flex items-center justify-center shadow-[0_0_30px_rgba(197,168,128,0.15)]">
            <ShieldCheck className="w-8 h-8 text-[#C5A880]"/>
          </div>
          <div className="absolute -inset-1 rounded-2xl border border-[#C5A880]/20 animate-ping opacity-25 pointer-events-none" />
        </div>

        {/* Título de Marca */}
        <h1 className="text-2xl font-bold tracking-widest text-white uppercase">
          GAREVA ZENITH
        </h1>
        <p className="text-xs tracking-wider text-slate-400 mt-1 uppercase font-medium">
          Consola Operativa Patrimonial
        </p>

        {/* Barra de progreso sutil */}
        <div className="w-48 h-1 bg-white/[0.06] rounded-full mt-8 overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-[#C5A880] to-[#E2CEB1] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <span className="text-[11px] text-slate-500 mt-3 font-mono">
          Cargando entorno seguro...
        </span>
      </div>
    </div>
  );
};
