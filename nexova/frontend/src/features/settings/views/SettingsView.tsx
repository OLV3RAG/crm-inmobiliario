import { useState } from 'react';
import { Save, Building2, Shield, Webhook, MapPin, Phone, Mail, MessageSquare } from 'lucide-react';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'roles' | 'integraciones'>('perfil');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 font-sans bg-[#0A0A0F] min-h-full">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Configuración del Sistema</h1>
        <p className="text-zinc-500 mt-1">Parámetros corporativos, permisos e integraciones</p>
      </div>

      <div className="bg-[#12121A] rounded-2xl shadow-sm border border-[#1E1E2E] overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-[#1E1E2E] bg-[#0D121F] overflow-x-auto px-2 pt-2 custom-scrollbar">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'perfil'
                ? 'border-[#C5A880] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Building2 className="w-4 h-4" /> Perfil de Empresa
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'roles'
                ? 'border-[#C5A880] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Shield className="w-4 h-4" /> Roles y Permisos
          </button>
          <button
            onClick={() => setActiveTab('integraciones')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'integraciones'
                ? 'border-[#C5A880] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Webhook className="w-4 h-4" /> Integraciones (Webhooks)
          </button>
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">
          {activeTab === 'perfil' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                    <MapPin className="w-4 h-4 text-zinc-500" /> Dirección de Operaciones
                  </label>
                  <textarea 
                    rows={3}
                    defaultValue="Av. Colonia del Valle 439, Del Valle Centro, Benito Juárez, CDMX"
                    className="w-full px-4 py-3 bg-[#0D121F] border border-[#1E1E2E] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] text-sm font-medium text-zinc-100 resize-none transition-colors"
                  />
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                      <Phone className="w-4 h-4 text-zinc-500" /> Teléfono Oficial
                    </label>
                    <input 
                      type="text" 
                      defaultValue="+52 55 4031 6454"
                      className="w-full px-4 py-3 bg-[#0D121F] border border-[#1E1E2E] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] text-sm font-medium text-zinc-100 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                      <Mail className="w-4 h-4 text-zinc-500" /> Correo Principal
                    </label>
                    <input 
                      type="email" 
                      defaultValue="contacto@garevazenith.com"
                      className="w-full px-4 py-3 bg-[#0D121F] border border-[#1E1E2E] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] text-sm font-medium text-zinc-100 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-6 animate-in fade-in">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Estructura de Permisos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['Admin', 'Coordinador', 'Asesor Senior', 'Asesor Junior'].map((rol) => (
                  <div key={rol} className="p-4 border border-[#1E1E2E] rounded-xl bg-[#0D121F] hover:border-[#C5A880] transition-colors cursor-pointer group">
                    <Shield className="w-6 h-6 text-zinc-500 group-hover:text-[#C5A880] transition-colors mb-3" />
                    <h4 className="font-bold text-zinc-200">{rol}</h4>
                    <p className="text-xs text-zinc-500 mt-1">Click para editar permisos</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'integraciones' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="space-y-2 max-w-md">
                <label className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                  <MessageSquare className="w-4 h-4 text-emerald-500" /> WhatsApp API Number
                </label>
                <input 
                  type="text" 
                  defaultValue="525540316454"
                  className="w-full px-4 py-3 bg-[#0D121F] border border-[#1E1E2E] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-sm font-medium text-zinc-100 transition-colors"
                />
              </div>

              <div className="pt-6 border-t border-[#1E1E2E] space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                  <Webhook className="w-4 h-4 text-blue-500" /> Webhook Recepción Leads Web
                </label>
                <div className="flex gap-2 max-w-2xl">
                  <input 
                    type="text" 
                    defaultValue="https://api.garevazenith.com.mx/v1/webhooks/leads"
                    readOnly
                    className="w-full px-4 py-3 bg-[#12121A] border border-[#1E1E2E] rounded-xl text-zinc-500 text-sm font-mono"
                  />
                  <button className="px-4 py-3 bg-[#1E1E2E] hover:bg-[#C5A880]/10 hover:text-[#C5A880] text-zinc-300 font-bold rounded-xl text-sm transition-colors border border-[#1E1E2E]">
                    Regenerar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#1E1E2E] bg-[#0D121F] flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0F] font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            <Save className="w-4 h-4 text-[#0A0A0F]" />
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
