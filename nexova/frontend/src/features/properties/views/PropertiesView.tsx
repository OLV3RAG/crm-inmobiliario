import { PropertyMap } from '../components/PropertyMap';
import { useState, useMemo } from 'react';
import { Search, Filter, Plus, Building2, MapPin, Grid, List, Map, Bed, Bath, Car, Maximize2 } from 'lucide-react';
import { useCrmContext } from '@/context/CrmContext';

const statusStyles: Record<string, string> = {
  'Disponible': 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  'Apartada': 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  'Vendida': 'bg-zinc-800 text-zinc-400 border-zinc-700',
  'Rentada': 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

const opStyles: Record<string, string> = {
  'Venta': 'bg-[#1E1E2E] text-[#C5A880]',
  'Renta': 'bg-[#0D121F] text-zinc-300 border border-[#1E1E2E]',
};

export const PropertiesView = () => {
  const { properties, updatePropertySync } = useCrmContext();
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Advanced Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState<string>('');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<string>('');

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory ? p.category === filterCategory : true;
      const matchOperation = filterOperation ? p.operation === filterOperation : true;
      const matchMinPrice = filterMinPrice ? p.price >= Number(filterMinPrice) : true;
      const matchMaxPrice = filterMaxPrice ? p.price <= Number(filterMaxPrice) : true;
      return matchSearch && matchCategory && matchOperation && matchMinPrice && matchMaxPrice;
    });
  }, [properties, searchTerm, filterCategory, filterOperation, filterMinPrice, filterMaxPrice]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0F] text-zinc-100">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#C5A880]" />
              Catálogo de Propiedades
            </h1>
            <p className="text-zinc-500 text-sm">Gestiona el inventario web y listados compartidos</p>
          </div>
          <button className="bg-[#C5A880] hover:bg-[#B68F4D] text-[#0A0A0F] px-4 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva Propiedad
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-[#1E1E2E] flex justify-between items-end">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar por título o código..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#12121A] border border-[#1E1E2E] text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880] transition-colors"
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-colors flex items-center gap-2 text-sm ${showFilters || filterCategory || filterOperation || filterMinPrice || filterMaxPrice ? 'bg-[#C5A880]/10 border-[#C5A880]/30 text-[#C5A880]' : 'bg-[#12121A] border-[#1E1E2E] text-zinc-400 hover:text-zinc-100'}`}
            >
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>
          
          <div className="flex bg-[#12121A] border border-[#1E1E2E] rounded-lg overflow-hidden">
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-[#1E1E2E] text-[#C5A880]' : 'text-zinc-500 hover:text-zinc-100 hover:bg-[#1E1E2E]/50'}`}
              title="Vista de Lista"
            >
              <List className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#1E1E2E] text-[#C5A880]' : 'text-zinc-500 hover:text-zinc-100 hover:bg-[#1E1E2E]/50'}`}
              title="Vista de Cuadrícula"
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('map')} 
              className={`p-2 transition-colors ${viewMode === 'map' ? 'bg-[#1E1E2E] text-[#C5A880]' : 'text-zinc-500 hover:text-zinc-100 hover:bg-[#1E1E2E]/50'}`}
              title="Vista de Mapa"
            >
              <MapPin className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-[#0A0A0F] custom-scrollbar">
          
          {viewMode === 'map' && (
            <PropertyMap properties={filteredProperties} />
          )}

          {viewMode === 'list' && (
            <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#0D121F] text-zinc-400 font-bold border-b border-[#1E1E2E]">
                  <tr>
                    <th className="px-6 py-4">Código / Título</th>
                    <th className="px-6 py-4">Operación</th>
                    <th className="px-6 py-4">Precio</th>
                    <th className="px-6 py-4">Ubicación</th>
                    <th className="px-6 py-4">Estatus</th>
                    <th className="px-6 py-4 text-center">Sync Web</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E1E2E]">
                  {filteredProperties.map(property => (
                    <tr key={property.id} className="hover:bg-[#1E1E2E]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-100">{property.title}</div>
                        <div className="text-xs font-mono text-zinc-500 mt-0.5">{property.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${opStyles[property.operation]}`}>
                          {property.operation}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-[#C5A880]">
                        {formatPrice(property.price)}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 flex items-center gap-1.5 mt-2">
                        <MapPin className="w-4 h-4 text-zinc-500" /> {property.location}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${statusStyles[property.status]}`}>
                          {property.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => updatePropertySync(property.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${property.syncWeb ? 'bg-[#C5A880]' : 'bg-[#1E1E2E]'}`}
                        >
                          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${property.syncWeb ? 'translate-x-4.5' : 'translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProperties.map(property => (
                <div key={property.id} className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${opStyles[property.operation]}`}>
                      {property.operation}
                    </span>
                    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-md border ${statusStyles[property.status]}`}>
                      {property.status}
                    </span>
                  </div>
                  
                  <div className="font-mono text-xs text-[#C5A880] mb-1">{property.code}</div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2 truncate group-hover:text-[#C5A880] transition-colors">{property.title}</h3>
                  <div className="text-xl font-bold text-zinc-200 mb-4">{formatPrice(property.price)}</div>
                  
                  <div className="flex items-center gap-1.5 text-sm text-zinc-400 mb-4 truncate">
                    <MapPin className="w-4 h-4" /> {property.location}
                  </div>
                  <div className="grid grid-cols-4 gap-2 py-3 border-t border-b border-[#1E1E2E] mb-4">
                    <div className="flex flex-col items-center justify-center text-zinc-300">
                      <Bed className="w-4 h-4 mb-1 text-zinc-500" />
                      <span className="text-xs font-bold">{property.beds}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-zinc-300 border-l border-[#1E1E2E]">
                      <Bath className="w-4 h-4 mb-1 text-zinc-500" />
                      <span className="text-xs font-bold">{property.baths}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-zinc-300 border-l border-[#1E1E2E]">
                      <Car className="w-4 h-4 mb-1 text-zinc-500" />
                      <span className="text-xs font-bold">{property.parking}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center text-zinc-300 border-l border-[#1E1E2E]">
                      <Maximize2 className="w-4 h-4 mb-1 text-zinc-500" />
                      <span className="text-xs font-bold">{property.sqftConstruction}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-semibold text-zinc-400">Sincronizar Web</span>
                    <button 
                      onClick={() => updatePropertySync(property.id)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${property.syncWeb ? 'bg-[#C5A880]' : 'bg-[#1E1E2E]'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${property.syncWeb ? 'translate-x-4.5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
