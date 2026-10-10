import { cn } from '@/utils/cn';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Sincronizando espacio de trabajo...' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zenith-obsidian text-white z-50">
      <div className="relative flex items-center justify-center w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-zenith-gold/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-zenith-gold animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-zenith-gold animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
      <h1 className="text-2xl font-bold tracking-[0.2em] text-white mb-4">GAREVA ZENITH</h1>
      <p className="text-sm text-slate-400 animate-pulse">{message}</p>
    </div>
  );
}
