import { useState } from 'react';
import { Search, Filter, Plus, UserCircle, Building, Mail, Phone, MessageCircle, X } from 'lucide-react';
import { useCrmContext } from '@/context/CrmContext';
import { Contact, ContactType } from '@/types/crm.types';

export const ContactsView = () => {
  const { contacts, addContact } = useCrmContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSimulateAdd = () => {
    addContact({
      name: 'Nuevo Cliente ' + Math.floor(Math.random() * 100),
      type: 'Comprador',
      phone: '55 0000 0000',
      email: 'nuevo@cliente.com',
      notes: 'Contacto agregado de prueba.'
    });
  };

  const typeStyles: Record<ContactType, string> = {
    'Comprador': 'bg-blue-400/10 text-blue-400 border-blue-400/20 border',
    'Propietario': 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 border',
    'Inversionista': 'bg-purple-400/10 text-purple-400 border-purple-400/20 border',
    'Notaría': 'bg-amber-400/10 text-amber-400 border-amber-400/20 border',
  };

  return (
    <div className="space-y-6 relative h-[calc(100vh-6rem)] flex flex-col font-sans bg-[#0A0A0F]">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Directorio de Clientes</h1>
          <p className="text-zinc-500 mt-1">Gestión de relaciones comerciales y contactos</p>
        </div>
        <button 
          onClick={handleSimulateAdd}
          className="flex items-center gap-2 bg-[#C5A880] hover:bg-[#D4AF37] text-[#0A0A0F] font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          Nuevo Contacto
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-[#12121A] rounded-2xl shadow-sm border border-[#1E1E2E] flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#1E1E2E] bg-[#0D121F] flex gap-4">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Buscar contacto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#12121A] border border-[#1E1E2E] text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] transition-colors"
            />
          </div>
          <button className="px-4 py-2 bg-[#12121A] border border-[#1E1E2E] rounded-lg text-sm font-semibold flex items-center gap-2 text-zinc-400 hover:text-zinc-100 hover:bg-[#1E1E2E] transition-colors">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0D121F] text-zinc-400 font-bold border-b border-[#1E1E2E] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Nombre</th>
                <th className="px-6 py-4">Clasificación</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Asesor Asignado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E2E]">
              {filteredContacts.map(contact => (
                <tr 
                  key={contact.id} 
                  onClick={() => setSelectedContact(contact)}
                  className="hover:bg-[#1E1E2E]/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-zinc-100">{contact.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${typeStyles[contact.type]}`}>
                      {contact.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 flex items-center gap-1.5 mt-2">
                    {contact.company && <Building className="w-4 h-4 text-zinc-500" />} {contact.company || '-'}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {contact.email}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {contact.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 bg-[#0D121F] border border-[#1E1E2E] px-2 py-1 rounded-md text-xs font-semibold text-zinc-300">
                      <UserCircle className="w-4 h-4 text-[#C5A880]" /> {contact.assignedTo}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Sidebar */}
      {selectedContact && (
        <div className="absolute inset-y-0 right-0 w-96 bg-[#12121A] shadow-2xl border-l border-[#1E1E2E] flex flex-col z-20 animate-in slide-in-from-right">
          <div className="p-6 border-b border-[#1E1E2E] flex justify-between items-start bg-[#0D121F] text-zinc-100">
            <div>
              <h2 className="text-xl font-bold">{selectedContact.name}</h2>
              <span className={`inline-block mt-2 px-2.5 py-1 rounded-md text-xs font-bold ${typeStyles[selectedContact.type]}`}>
                {selectedContact.type}
              </span>
            </div>
            <button onClick={() => setSelectedContact(null)} className="text-zinc-500 hover:text-zinc-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Información de Contacto</h3>
              <div className="flex items-center justify-between p-3 bg-[#0D121F] rounded-xl border border-[#1E1E2E]">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-zinc-500" />
                  <span className="font-semibold text-zinc-200">{selectedContact.phone}</span>
                </div>
                <a 
                  href={`https://wa.me/52${selectedContact.phone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 bg-[#12121A] border border-[#1E1E2E] text-emerald-400 rounded-lg hover:border-emerald-500/50 transition-colors"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#0D121F] rounded-xl border border-[#1E1E2E]">
                <Mail className="w-5 h-5 text-zinc-500" />
                <span className="font-semibold text-zinc-200">{selectedContact.email}</span>
              </div>
              {selectedContact.company && (
                <div className="flex items-center gap-3 p-3 bg-[#0D121F] rounded-xl border border-[#1E1E2E]">
                  <Building className="w-5 h-5 text-zinc-500" />
                  <span className="font-semibold text-zinc-200">{selectedContact.company}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Notas Internas</h3>
              <div className="p-4 bg-[#C5A880]/10 border border-[#C5A880]/20 rounded-xl text-sm text-[#C5A880] leading-relaxed">
                {selectedContact.notes || 'No hay notas registradas.'}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Responsable</h3>
              <div className="flex items-center gap-3 p-3 bg-[#0D121F] rounded-xl border border-[#1E1E2E]">
                <UserCircle className="w-8 h-8 text-[#C5A880]" />
                <div>
                  <div className="font-bold text-zinc-200">{selectedContact.assignedTo}</div>
                  <div className="text-xs text-zinc-500">Asesor Gareva Zenith</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-[#1E1E2E] bg-[#0D121F]">
            <button className="w-full bg-[#12121A] border border-[#1E1E2E] text-zinc-200 font-bold py-3 rounded-xl hover:bg-[#1E1E2E] transition-colors">
              Editar Contacto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
