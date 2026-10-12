import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Pencil } from 'lucide-react';
import { Property } from '@/types/crm.types';

const pinIcon = L.divIcon({
  className: 'property-pin',
  html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:#C5A880;border:2px solid #0A0A0F;box-shadow:0 0 0 4px rgba(197,168,128,.35)"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

const geocodeCache = new Map<string, [number, number] | null>();

function hasCoords(property: Property) {
  return Number.isFinite(property.latitude) && Number.isFinite(property.longitude)
    && !(property.latitude === 0 && property.longitude === 0);
}

async function geocodeAddress(query: string): Promise<[number, number] | null> {
  const key = query.trim().toLowerCase();
  if (!key || key === 'sin ubicación') return null;
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=mx&q=${encodeURIComponent(`${query}, México`)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    geocodeCache.set(key, null);
    return null;
  }
  const rows = await response.json();
  const hit = Array.isArray(rows) ? rows[0] : null;
  const point = hit ? [Number(hit.lat), Number(hit.lon)] as [number, number] : null;
  const valid = point && Number.isFinite(point[0]) && Number.isFinite(point[1]) ? point : null;
  geocodeCache.set(key, valid);
  return valid;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Custom styling for dark mode popups
const popupStyle = `
  .leaflet-popup-content-wrapper {
    background: #12121A;
    color: #F4F4F5;
    border: 1px solid #1E1E2E;
    border-radius: 0.75rem;
    padding: 0;
    overflow: hidden;
  }
  .leaflet-popup-tip {
    background: #12121A;
    border: 1px solid #1E1E2E;
  }
  .leaflet-popup-content {
    margin: 0 !important;
    width: 240px !important;
  }
  .leaflet-popup-close-button {
    color: #F4F4F5 !important;
    padding: 4px !important;
  }
`;

interface PropertyMapProps {
  properties: Property[];
  canEdit?: (property: Property) => boolean;
  onEdit?: (property: Property) => void;
}

const BoundsHelper = ({ properties }: { properties: Property[] }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const validProps = properties.filter(hasCoords);
    if (validProps.length === 0) return;
    if (validProps.length === 1) {
      map.setView([validProps[0].latitude!, validProps[0].longitude!], 14);
      return;
    }
    const bounds = L.latLngBounds(validProps.map((p) => [p.latitude!, p.longitude!]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [properties, map]);

  return null;
};

export const PropertyMap: React.FC<PropertyMapProps> = ({ properties, canEdit, onEdit }) => {
  const [located, setLocated] = useState<Property[]>(properties);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function locateMissing() {
      const next = properties.map((property) => ({ ...property }));
      const missing = next.filter((property) => !hasCoords(property) && property.location);
      setLocated(next);
      if (!missing.length) return;

      setLocating(true);
      for (const property of missing) {
        if (cancelled) return;
        const point = await geocodeAddress(property.location);
        if (point) {
          property.latitude = point[0];
          property.longitude = point[1];
          if (!cancelled) setLocated([...next]);
        }
        await wait(1100);
      }
      if (!cancelled) setLocating(false);
    }

    locateMissing();
    return () => {
      cancelled = true;
    };
  }, [properties]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(price);
  };

  const pins = located.filter(hasCoords);

  return (
    <div className="w-full h-[calc(100vh-15rem)] min-h-[520px] rounded-xl overflow-hidden border border-[#1E1E2E] relative" style={{ zIndex: 0 }}>
      <style>{`${popupStyle}
        .property-pin { background: transparent !important; border: none !important; }
        .leaflet-container img,
        .leaflet-container .leaflet-tile { max-width: none !important; max-height: none !important; }
        .leaflet-control-attribution { background: rgba(10,10,15,.8) !important; color: #a1a1aa !important; }
        .leaflet-control-attribution a { color: #C5A880 !important; }
      `}</style>
      {locating && (
        <div className="absolute top-3 left-3 z-[500] rounded-lg bg-[#0A0A0F]/90 border border-[#1E1E2E] px-3 py-1.5 text-xs text-zinc-300">
          Ubicando propiedades en el mapa…
        </div>
      )}
      <MapContainer
        center={[28.6353, -106.0889]}
        zoom={12}
        style={{ height: '100%', width: '100%', background: '#e8e4dc' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pins.map(property => {
          
          return (
            <Marker
              key={property.id}
              position={[property.latitude!, property.longitude!]}
              icon={pinIcon}
            >
              <Popup>
                <div className="flex flex-col">
                  {property.imageUrl ? (
                    <img 
                      src={property.imageUrl} 
                      alt={property.title} 
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-[#1E1E2E] flex items-center justify-center text-zinc-500">
                      Sin imagen
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A880]">
                        {property.operation}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {property.code}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-zinc-100 truncate mb-1">
                      {property.title}
                    </h4>
                    <p className="text-sm font-mono text-[#C5A880] font-bold">
                      {formatPrice(property.price)}
                    </p>
                    {onEdit && canEdit?.(property) && (
                      <button
                        type="button"
                        onClick={() => onEdit(property)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#C5A880]"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Editar
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        <BoundsHelper properties={pins} />
      </MapContainer>
    </div>
  );
};
