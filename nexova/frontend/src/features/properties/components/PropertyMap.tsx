import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Property } from '@/types/crm.types';

// Fix for default marker icons in react-leaflet
const icon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const iconShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

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
}

const BoundsHelper = ({ properties }: { properties: Property[] }) => {
  const map = useMap();
  
  useEffect(() => {
    const validProps = properties.filter(p => p.latitude && p.longitude);
    if (validProps.length === 0) return;
    
    const bounds = L.latLngBounds(validProps.map(p => [p.latitude!, p.longitude!]));
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [properties, map]);

  return null;
};

export const PropertyMap: React.FC<PropertyMapProps> = ({ properties }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[#1E1E2E] relative" style={{ zIndex: 0 }}>
      <style>{popupStyle}</style>
      <MapContainer 
        center={[19.4326, -99.1332]} 
        zoom={11} 
        style={{ height: '100%', width: '100%', background: '#0A0A0F' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {properties.map(property => {
          if (!property.latitude || !property.longitude) return null;
          
          return (
            <Marker 
              key={property.id} 
              position={[property.latitude, property.longitude]}
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
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        <BoundsHelper properties={properties} />
      </MapContainer>
    </div>
  );
};
