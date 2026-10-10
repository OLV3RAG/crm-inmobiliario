import { io } from 'socket.io-client';
import React, { useState, useEffect } from 'react';
import { crmApi } from '@/services/crm.api';
import { X, Send, UserCircle, Calendar, Bot } from 'lucide-react';
import { Flame, Clock, MapPin, Building2, Phone, Search, MoreHorizontal } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  phone?: string;
  score: number;
  temp: 'caliente' | 'tibio' | 'frio';
  action: string;
  status: 'new' | 'qualifying' | 'qualified' | 'meeting' | 'negotiation' | 'closed_won' | 'closed_lost';
  property_type?: string;
  budget?: string;
  createdAt: number;
}

const COLUMNS = [
  { id: 'new', label: 'Nuevo' },
  { id: 'qualifying', label: 'Calificando' },
  { id: 'qualified', label: 'Calificado' },
  { id: 'meeting', label: 'Cita' },
  { id: 'negotiation', label: 'Negociación' },
  { id: 'closed_won', label: 'Cerrado (Ganado)' }
];

const TEMPERATURE_COLORS = {
  caliente: 'text-red-400 bg-red-400/10 border-red-400/20',
  tibio: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  frio: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
};

const TEMPERATURE_DOTS = {
  caliente: 'bg-red-400',
  tibio: 'bg-amber-400',
  frio: 'bg-blue-400'
};

export const PipelineView = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDrawer = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedLead(null), 300);
  };


  useEffect(() => {
    fetchLeads();
  }, []);


  useEffect(() => {
    const socket = io();
    
    socket.on('lead_updated', (updatedLead) => {
      setLeads(prev => prev.map(lead => lead.id === updatedLead.id ? updatedLead : lead));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchLeads = async () => {
    try {
      const data = await crmApi.getPipelineLeads();
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    
    // Slight delay to allow drag ghost to form before making original transparent
    setTimeout(() => {
      const element = document.getElementById(`lead-${id}`);
      if (element) element.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(null);
    const element = document.getElementById(`lead-${id}`);
    if (element) element.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    
    if (!leadId || !targetStatus) return;

    // Optimistic UI update
    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, status: targetStatus as any } : lead
      )
    );

    try {
      await crmApi.updateLeadStatus(leadId, targetStatus);
    } catch (error) {
      console.error('Error updating lead status:', error);
      // Revert on error
      fetchLeads();
    }
  };

  return (
    <div className="w-full h-full bg-[#0A0A0F] flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#1E1E2E] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Pipeline de Ventas</h1>
          <p className="text-xs text-zinc-400 mt-1">Arrastra y suelta para actualizar el estado del prospecto.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar lead..." 
              className="bg-[#12121A] border border-[#1E1E2E] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#C5A880] transition-colors w-64"
            />
          </div>
          <button className="bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0F] font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
            + Nuevo Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex gap-6 h-full min-w-max pb-4">
          
          {COLUMNS.map(col => {
            const columnLeads = leads.filter(l => l.status === col.id);
            
            return (
              <div 
                key={col.id} 
                className="w-[320px] flex flex-col bg-[#12121A]/50 rounded-xl border border-[#1E1E2E]/50 overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-[#1E1E2E] bg-[#12121A] flex items-center justify-between shrink-0">
                  <h3 className="font-semibold text-zinc-200 text-sm tracking-wide">{col.label}</h3>
                  <span className="bg-[#1E1E2E] text-zinc-400 text-xs font-mono px-2 py-0.5 rounded-full">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {loading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-32 bg-[#1E1E2E]/50 rounded-xl" />
                      <div className="h-32 bg-[#1E1E2E]/50 rounded-xl" />
                    </div>
                  ) : (
                    columnLeads.map(lead => (
                      <div 
                        key={lead.id}
                        id={`lead-${lead.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={(e) => handleDragEnd(e, lead.id)}
                        onClick={() => openDrawer(lead)}
                        className="bg-[#0D121F] border border-[#1E1E2E] hover:border-[#C5A880]/50 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                      >
                        {/* Top: Temp Badge & Score */}
                        <div className="flex justify-between items-start mb-3">
                          <div className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border flex items-center gap-1.5 ${TEMPERATURE_COLORS[lead.temp]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${TEMPERATURE_DOTS[lead.temp]}`} />
                            {lead.temp}
                          </div>
                          <div className="flex items-center gap-1 bg-[#12121A] border border-[#1E1E2E] px-2 py-1 rounded-md">
                            <Flame className={`w-3.5 h-3.5 ${TEMPERATURE_DOTS[lead.temp].replace('bg-', 'text-')}`} />
                            <span className="text-xs font-mono font-semibold text-zinc-300">{lead.score}</span>
                          </div>
                        </div>

                        {/* Middle: Info */}
                        <div className="space-y-1 mb-4">
                          <h4 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-[#C5A880] transition-colors">{lead.name}</h4>
                          {lead.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                              <Phone className="w-3 h-3" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                            {lead.action}
                          </p>
                        </div>

                        {/* Bottom: Meta */}
                        <div className="pt-3 border-t border-[#1E1E2E]/60 flex items-center justify-between text-xs text-zinc-500">
                          {lead.property_type && (
                            <div className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              <span className="capitalize">{lead.property_type}</span>
                            </div>
                          )}
                          {lead.budget && (
                            <span className="font-medium text-zinc-400">{lead.budget}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

        </div>
      </div>


      {/* Drawer Overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={closeDrawer} />
      )}

      {/* Lead Drawer */}
      <div className={`fixed top-0 right-0 h-full w-[400px] bg-[#0A0A0F] border-l border-[#1E1E2E] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedLead && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-[#1E1E2E] flex justify-between items-start bg-[#12121A]">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{selectedLead.name}</h2>
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${TEMPERATURE_COLORS[selectedLead.temp]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${TEMPERATURE_DOTS[selectedLead.temp]}`} />
                  {selectedLead.temp}
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-[#1E1E2E] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Score & Next Action */}
              <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-300">Score de Intención</h3>
                  <div className="flex items-center gap-2">
                    <Flame className={`w-4 h-4 ${TEMPERATURE_DOTS[selectedLead.temp].replace('bg-', 'text-')}`} />
                    <span className="text-lg font-mono font-bold text-white">{selectedLead.score}/100</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-[#1E1E2E]">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Próxima Acción Sugerida (AI)</p>
                  <p className="text-sm text-[#C5A880] font-medium flex items-center gap-2">
                    <Bot className="w-4 h-4" /> {selectedLead.action}
                  </p>
                </div>
              </div>

              {/* CRM Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-zinc-300 border-b border-[#1E1E2E] pb-2">Radiografía del Prospecto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#12121A] p-3 rounded-lg border border-[#1E1E2E]">
                    <p className="text-[10px] text-zinc-500 uppercase">Presupuesto</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-1">{selectedLead.budget || 'No definido'}</p>
                  </div>
                  <div className="bg-[#12121A] p-3 rounded-lg border border-[#1E1E2E]">
                    <p className="text-[10px] text-zinc-500 uppercase">Interés</p>
                    <p className="text-sm font-semibold text-zinc-200 mt-1 capitalize">{selectedLead.property_type || 'Mixto'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Tools */}
              <div className="space-y-4 pt-4 border-t border-[#1E1E2E]">
                <h3 className="text-sm font-semibold text-zinc-300">Contacto Directo</h3>
                
                {selectedLead.phone && (
                  <div className="flex gap-2">
                    <button className="flex-1 bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/20 border border-[#10B981]/20 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors">
                      <Send className="w-4 h-4" /> WhatsApp
                    </button>
                    <button className="flex-1 bg-[#1E1E2E] text-zinc-300 hover:text-white hover:bg-[#2A2A3C] py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors">
                      <Phone className="w-4 h-4" /> Llamar
                    </button>
                  </div>
                )}
                
                <button className="w-full bg-[#12121A] text-[#C5A880] hover:bg-[#1E1E2E] border border-[#C5A880]/30 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors">
                  <Calendar className="w-4 h-4" /> Agendar Cita
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
};
