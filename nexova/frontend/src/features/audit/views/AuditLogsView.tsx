import { useState } from 'react';
import { Search, ShieldAlert, History, User } from 'lucide-react';
import { useCrmContext } from '@/context/CrmContext';

export function AuditLogsView() {
  const { auditLogs } = useCrmContext();
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6 font-sans bg-[#0A0A0F] h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Bitácora de Auditoría</h1>
          <p className="text-zinc-500 mt-1">Trazabilidad de movimientos y gobernanza de datos en tiempo real</p>
        </div>
        <div className="bg-[#12121A] border border-[#1E1E2E] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold text-zinc-400 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-[#C5A880]" />
          Modo Estricto Activo
        </div>
      </div>

      <div className="bg-[#12121A] rounded-2xl shadow-sm border border-[#1E1E2E] overflow-hidden">
        <div className="p-4 border-b border-[#1E1E2E] bg-[#0D121F]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar por usuario, módulo o detalle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#12121A] border border-[#1E1E2E] rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0D121F] text-zinc-400 font-bold border-b border-[#1E1E2E]">
              <tr>
                <th className="px-6 py-4">ID Evento / Fecha</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4">Acción Realizada</th>
                <th className="px-6 py-4">Detalle Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {auditLogs.filter(log => log.userName.toLowerCase().includes(searchTerm.toLowerCase()) || log.details.toLowerCase().includes(searchTerm.toLowerCase())).map(log => (
                <tr key={log.id} className="hover:bg-[#1E1E2E]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono font-bold text-zinc-500">{log.id}</div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                      <History className="w-3.5 h-3.5" /> {log.timestamp}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#C5A880]" />
                      <span className="font-bold text-zinc-200">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-xs font-bold bg-[#12121A] border border-[#1E1E2E] text-zinc-400 rounded-md">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-zinc-300">{log.action}</td>
                  <td className="px-6 py-4 text-zinc-500 max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {auditLogs.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay registros de auditoría aún.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
