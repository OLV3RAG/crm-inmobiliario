import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { Property } from '@/types/crm.types';
import { crmApi, mapProperty } from '@/services/crm.api';

const TYPES = [
  { value: 'casa', label: 'Casa' },
  { value: 'depa', label: 'Departamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'local', label: 'Local' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'bodega', label: 'Bodega' },
  { value: 'preventa', label: 'Preventa' },
];

const STATUSES = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'reservada', label: 'Apartada' },
  { value: 'vendida', label: 'Vendida' },
  { value: 'pausada', label: 'Pausada' },
];

const fieldClass = 'w-full px-3 py-2 bg-[#0A0A0F] border border-[#1E1E2E] text-zinc-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A880]/50 focus:border-[#C5A880]';

interface AdvisorOption {
  id: string;
  name: string;
}

interface PropertyEditModalProps {
  property: Property | null;
  advisors: AdvisorOption[];
  role?: string;
  onClose: () => void;
  onSaved: (property: Property) => void;
}

export const PropertyEditModal = ({ property, advisors, role, onClose, onSaved }: PropertyEditModalProps) => {
  const creating = !property;
  const [savedId, setSavedId] = useState(property?.id || '');
  const [title, setTitle] = useState(property?.title || '');
  const [propertyType, setPropertyType] = useState(property?.propertyType || 'casa');
  const [price, setPrice] = useState(property ? String(property.price || '') : '');
  const [status, setStatus] = useState(property?.rawStatus || 'disponible');
  const [stateName, setStateName] = useState(property?.state || '');
  const [municipality, setMunicipality] = useState(property?.municipality || '');
  const [city, setCity] = useState(property?.city || '');
  const [address, setAddress] = useState(property?.address || '');
  const [beds, setBeds] = useState(String(property?.beds || ''));
  const [baths, setBaths] = useState(String(property?.baths || ''));
  const [parking, setParking] = useState(String(property?.parking || ''));
  const [construction, setConstruction] = useState(String(property?.sqftConstruction || ''));
  const [land, setLand] = useState(String(property?.sqftLand || ''));
  const [latitude, setLatitude] = useState(property?.latitude != null ? String(property.latitude) : '');
  const [longitude, setLongitude] = useState(property?.longitude != null ? String(property.longitude) : '');
  const [description, setDescription] = useState(property?.description || '');
  const [asesorId, setAsesorId] = useState(property?.assignedAdvisorId || '');
  const [businessId, setBusinessId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [gerentes, setGerentes] = useState<{ id: string; name: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((item) => URL.revokeObjectURL(item.url)), [previews]);

  useEffect(() => {
    if (!creating || role !== 'Owner') return;
    crmApi.getBusinessOptions()
      .then((rows) => {
        const options = (rows || []).map((row) => ({ id: row.id, name: row.name }));
        setBusinesses(options);
        if (options.length === 1) setBusinessId(options[0].id);
      })
      .catch(() => setBusinesses([]));
  }, [creating, role]);

  useEffect(() => {
    if (!businessId || role !== 'Owner') return;
    crmApi.getGerentes(businessId)
      .then((rows) => setGerentes((rows || []).map((row) => ({ id: row.id, name: row.full_name || row.email }))))
      .catch(() => setGerentes([]));
  }, [businessId, role]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!price || Number.isNaN(Number(price))) {
      setError('Indica un precio válido');
      return;
    }
    if (creating && !stateName.trim()) {
      setError('Indica el estado');
      return;
    }
    if (creating && role === 'Owner' && (!businessId || !adminId)) {
      setError('Selecciona la empresa y el gerente');
      return;
    }

    const body: Record<string, unknown> = {
      title: title.trim(),
      property_type: propertyType,
      price: Number(price),
      status,
      city,
      address,
      bedrooms: beds,
      bathrooms: baths,
      parking,
      m2_construccion: construction,
      m2_terreno: land,
      description,
    };
    if (stateName.trim()) {
      body.state = stateName.trim();
      body.municipality = municipality.trim();
    }
    if (latitude.trim() || longitude.trim()) {
      body.latitude = latitude.trim();
      body.longitude = longitude.trim();
    }
    if (creating && role === 'Owner') {
      body.business_id = businessId;
      body.admin_id = adminId;
    }
    if (asesorId && role !== 'Asesor') body.asesor_id = asesorId;

    setSaving(true);
    setError('');
    try {
      let row = savedId
        ? await crmApi.updateProperty(savedId, body)
        : await crmApi.createProperty(body);
      setSavedId(row.id);
      onSaved(mapProperty(row));
      if (files.length) {
        row = await crmApi.uploadPropertyPhotos(row.id, files);
        setFiles([]);
        onSaved(mapProperty(row));
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la propiedad');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={submit} className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-[#12121A] border border-[#1E1E2E] rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E1E2E]">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{creating ? 'Nueva propiedad' : 'Editar propiedad'}</h2>
            {!creating && <p className="text-xs font-mono text-zinc-500">{property.code}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="md:col-span-2 text-sm text-zinc-400">
            Título
            <input className={`${fieldClass} mt-1`} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Tipo
            <select className={`${fieldClass} mt-1`} value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-zinc-400">
            Estatus
            <select className={`${fieldClass} mt-1`} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-zinc-400">
            Precio
            <input className={`${fieldClass} mt-1`} type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Estado
            <input className={`${fieldClass} mt-1`} value={stateName} onChange={(e) => setStateName(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Municipio
            <input className={`${fieldClass} mt-1`} value={municipality} onChange={(e) => setMunicipality(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Ciudad
            <input className={`${fieldClass} mt-1`} value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="md:col-span-2 text-sm text-zinc-400">
            Dirección
            <input className={`${fieldClass} mt-1`} value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Recámaras
            <input className={`${fieldClass} mt-1`} type="number" min="0" value={beds} onChange={(e) => setBeds(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Baños
            <input className={`${fieldClass} mt-1`} type="number" min="0" step="0.5" value={baths} onChange={(e) => setBaths(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Estacionamientos
            <input className={`${fieldClass} mt-1`} type="number" min="0" value={parking} onChange={(e) => setParking(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            m² construcción
            <input className={`${fieldClass} mt-1`} type="number" min="0" value={construction} onChange={(e) => setConstruction(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            m² terreno
            <input className={`${fieldClass} mt-1`} type="number" min="0" value={land} onChange={(e) => setLand(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Latitud
            <input className={`${fieldClass} mt-1`} value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </label>
          <label className="text-sm text-zinc-400">
            Longitud
            <input className={`${fieldClass} mt-1`} value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </label>
          {creating && role === 'Owner' && (
            <>
              <label className="text-sm text-zinc-400">
                Empresa
                <select className={`${fieldClass} mt-1`} value={businessId} onChange={(e) => { setBusinessId(e.target.value); setAdminId(''); }}>
                  <option value="">Selecciona</option>
                  {businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="text-sm text-zinc-400">
                Gerente
                <select className={`${fieldClass} mt-1`} value={adminId} onChange={(e) => setAdminId(e.target.value)}>
                  <option value="">Selecciona</option>
                  {gerentes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </>
          )}
          {role !== 'Asesor' && advisors.length > 0 && (
            <label className="md:col-span-2 text-sm text-zinc-400">
              Asesor responsable
              <select className={`${fieldClass} mt-1`} value={asesorId} onChange={(e) => setAsesorId(e.target.value)}>
                <option value="">Sin asignar</option>
                {advisors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          <div className="md:col-span-2 text-sm text-zinc-400">
            Fotos
            <label className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#1E1E2E] px-3 py-4 text-zinc-300 cursor-pointer hover:border-[#C5A880]/50">
              <ImagePlus className="w-4 h-4 text-[#C5A880]" />
              Cargar imágenes
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const selected = Array.from(e.target.files || []);
                  setFiles((current) => [...current, ...selected].slice(0, 12));
                  e.target.value = '';
                }}
              />
            </label>
            <p className="mt-1 text-xs text-zinc-500">Hasta 12 fotos, 8 MB cada una.</p>
            {(property?.images?.length || previews.length) > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {(property?.images || []).map((url) => (
                  <img key={url} src={url} alt="" className="h-20 w-full rounded-lg object-cover bg-[#0A0A0F]" />
                ))}
                {previews.map((item) => (
                  <div key={item.url} className="relative">
                    <img src={item.url} alt={item.file.name} className="h-20 w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => setFiles((current) => current.filter((file) => file !== item.file))}
                      className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="md:col-span-2 text-sm text-zinc-400">
            Descripción
            <textarea className={`${fieldClass} mt-1 min-h-24`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          {error && <p className="md:col-span-2 text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#1E1E2E]">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-[#1E1E2E] text-zinc-300 text-sm">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#C5A880] text-[#0A0A0F] font-bold text-sm disabled:opacity-60">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
};
