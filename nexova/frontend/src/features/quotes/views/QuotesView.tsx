import { useState } from 'react';
import { Plus, Search, Download, Send, Eye } from 'lucide-react';
import { QuoteStatus } from '@/types/crm.types';
import { useCrmContext } from '@/context/CrmContext';

const statusStyles: Record<QuoteStatus, string> = {
  'Borrador': 'bg-[#1E1E2E] text-zinc-400',
  'Enviada': 'bg-blue-400/10 text-blue-400',
  'Aprobada': 'bg-emerald-400/10 text-emerald-400',
  'Rechazada': 'bg-red-400/10 text-red-400',
};

export function QuotesView() {
  const { quotes, addQuote } = useCrmContext();
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount);
  };

  const handleSimulateAddQuote = () => {
    addQuote({
      clientId: 'C100',
      clientName: 'Cliente Simulado',
      propertyId: 'P100',
      propertyName: 'Propiedad Muestra',
      totalAmount: 10000000,
      downPayment: 2000000,
      estimatedClosingCosts: 500000
    });
  };

  return (
    <div className="space-y-6 font-sans bg-[#0A0A0F] h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Cotizaciones Comerciales</h1>
          <p className="text-zinc-500 mt-1">Generación de propuestas y esquemas de pago</p>
        </div>
        <button 
          onClick={handleSimulateAddQuote}
          className="flex items-center gap-2 bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0F] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Crear Cotización
        </button>
      </div>

      <div className="bg-[#12121A] rounded-2xl shadow-sm border border-[#1E1E2E] overflow-hidden">
        <div className="p-4 border-b border-[#1E1E2E] bg-[#0D121F]">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar folio o cliente..." 
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
                <th className="px-6 py-4">Folio / Fecha</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Propiedad</th>
                <th className="px-6 py-4">Monto Total</th>
                <th className="px-6 py-4">Estatus</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {quotes.filter(q => q.id.includes(searchTerm) || q.clientName.toLowerCase().includes(searchTerm.toLowerCase())).map(quote => (
                <tr key={quote.id} className="hover:bg-[#1E1E2E]/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-100">{quote.id}</div>
                    <div className="text-xs text-zinc-500">{quote.date.split('T')[0]}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-zinc-300">{quote.clientName}</td>
                  <td className="px-6 py-4 text-zinc-400">{quote.propertyName}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-[#C5A880]">{formatCurrency(quote.totalAmount)}</div>
                    <div className="text-xs text-zinc-500">Enganche: {formatCurrency(quote.downPayment)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${statusStyles[quote.status]}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-zinc-500 hover:text-zinc-100 hover:bg-[#1E1E2E] rounded-lg transition-colors" title="Ver PDF">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors" title="Enviar por Email">
                        <Send className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-zinc-500 hover:text-[#C5A880] hover:bg-[#C5A880]/10 rounded-lg transition-colors" title="Descargar">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
