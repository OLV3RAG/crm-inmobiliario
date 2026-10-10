import React, { useState, useEffect } from 'react';
import { crmApi } from '@/services/crm.api';
import { 
  Building2, 
  Flame, 
  ExternalLink 
} from 'lucide-react';

const TEMPERATURE_COLORS = {
  caliente: '#EF4444',
  tibio: '#F59E0B',
  frio: '#3B82F6'
};

function ScoreCircle({ score = 0, temperature = 'frio', size = 36 }: { score?: number; temperature?: 'caliente' | 'tibio' | 'frio'; size?: number }) {
  const color = TEMPERATURE_COLORS[temperature] || TEMPERATURE_COLORS.frio;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1E1E2E" strokeWidth="3.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="text-xs font-bold font-mono" style={{ color }}>{score}</span>
    </div>
  );
}

export const MainDashboardView = () => {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  // Estados de datos
  const [data, setData] = useState({
    inventory: { total: 0, value: 0 },
    kpis: { leads: 0, closes: 0, conversionRate: '0.0%', revenue: '$0.00' },
    funnel: [] as Array<{ label: string, count: number, percent: number }>
  });

  const [hotConversations, setHotConversations] = useState<Array<{ id: string; name: string; score: number; temp: 'caliente' | 'tibio' | 'frio'; action: string; }>>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const view = await crmApi.getDashboard(days);
        setData({
          inventory: view.inventory,
          kpis: view.kpis,
          funnel: view.funnel,
        });
        setHotConversations(view.hot);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [days]);

  // Formateador de moneda
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="w-full min-h-full bg-[#0A0A0F] text-zinc-100 p-6 md:p-8 space-y-6 font-sans">
      
      {/* Selector de periodo y título */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Métricas de conversión y pipeline en tiempo real</p>
        </div>

        {/* Píldoras originales de NovaArc con acento Zenith */}
        <div className="flex items-center gap-1.5 p-1 bg-[#12121A] border border-[#1E1E2E] rounded-xl self-start sm:self-auto">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                days === d
                  ? 'bg-[#C5A880] text-[#0A0A0F] font-semibold shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {d} días
            </button>
          ))}
        </div>
      </div>

      {/* Banner de Inventario Global (Gareva Zenith) */}
      <div className="rounded-xl bg-gradient-to-r from-[#12121A] to-[#181824] border border-[#C5A880]/30 p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-lg bg-[#C5A880]/10 text-[#C5A880]">
            <Building2 className="w-6 h-6"/>
          </div>
          <div>
            <p className="text-xs uppercase font-medium tracking-wider text-[#C5A880]">Inventario Activo</p>
            <p className="text-xl font-bold text-white">{data.inventory.total} <span className="text-sm font-normal text-zinc-400">propiedades en catálogo</span></p>
          </div>
        </div>
        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-[#1E1E2E] pt-3 md:pt-0 md:pl-6">
          <div>
            <p className="text-xs text-zinc-400 uppercase tracking-wider">Valor Cartera</p>
            <p className="text-xl font-bold text-white">{formatCurrency(data.inventory.value)} <span className="text-xs font-normal text-zinc-400">MXN</span></p>
          </div>
          <a
            href="https://garevazenith.com.mx/"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
            title="Ver portal web"
          >
            <ExternalLink className="w-4 h-4"/>
          </a>
        </div>
      </div>

      {/* 4 KPIs Clave */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Leads</p>
          <p className="text-3xl font-bold text-white mt-2">{data.kpis.leads}</p>
        </div>
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Cierres</p>
          <p className="text-3xl font-bold text-emerald-400 mt-2">{data.kpis.closes}</p>
        </div>
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Conversión</p>
          <p className="text-3xl font-bold text-white mt-2">{data.kpis.conversionRate}</p>
        </div>
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Ingresos</p>
          <p className="text-3xl font-bold text-white mt-2">{data.kpis.revenue}</p>
        </div>
      </div>

      {/* Embudo y Conversaciones */}
      <div className={`grid lg:grid-cols-2 gap-6 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
        
        {/* Embudo de ventas */}
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">Embudo de ventas</h3>
          <div className="space-y-3 pt-2">
            {data.funnel.map((stage) => (
              <div key={stage.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">{stage.label}</span>
                  <span className="text-zinc-300 font-mono">{stage.count} ({stage.percent.toFixed(1)}%)</span>
                </div>
                <div className="h-8 bg-[#0A0A0F] rounded-lg overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#C5A880] to-[#E2CEB1] rounded-md transition-all duration-500"
                    style={{ width: `${stage.percent}%` }}
                  />
                </div>
              </div>
            ))}
            {data.funnel.length === 0 && !loading && (
              <p className="text-sm text-zinc-500 text-center py-4">No hay datos en el pipeline para este periodo.</p>
            )}
          </div>
        </div>

        {/* Conversaciones calientes con ScoreCircle */}
        <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#C5A880]"/>
              <h3 className="text-sm font-semibold text-zinc-300">Conversaciones calientes</h3>
            </div>
            <span className="text-[11px] text-zinc-500">Claude Sonnet 4.6</span>
          </div>
          
          <div className="divide-y divide-[#1E1E2E] pt-1">
            {hotConversations.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium text-zinc-200 truncate">{c.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{c.action}</p>
                </div>
                <ScoreCircle score={c.score} size={36} temperature={c.temp}/>
              </div>
            ))}
            {hotConversations.length === 0 && !loading && (
               <p className="text-sm text-zinc-500 text-center py-4">No hay conversaciones activas.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
