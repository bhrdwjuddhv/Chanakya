import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { get } from '../../lib/api';
import { Card, EmptyState, ErrorState, Spinner } from '../ui';
import { token } from '../../lib/utils';

// Leaflet's default marker icons resolve to broken URLs under a bundler, so draw our own.
// A crime scene is the one map marker that earns the accent red.
const TYPE_TOKENS = {
  crime_scene: '--primary',
  site: '--info',
  residence: '--ai',
  business: '--warning',
  sighting: '--success',
};

const markerColour = (type) => token(TYPE_TOKENS[type] || '--info') || '#3B82F6';

const markerIcon = (type) =>
  L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;
      background:${markerColour(type)};border:3px solid ${token('--card')};
      box-shadow:0 2px 6px rgb(0 0 0 / .45)"></span>`,
  });

export function MapTab({ caseId }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['locations', caseId],
    queryFn: () => get(`/locations/case/${caseId}`),
  });

  const locations = data?.locations || [];
  const centre = useMemo(() => {
    if (!locations.length) return [40.72, -74.0];
    return [
      locations.reduce((sum, l) => sum + l.lat, 0) / locations.length,
      locations.reduce((sum, l) => sum + l.lng, 0) / locations.length,
    ];
  }, [locations]);

  if (isLoading) return <Spinner label="Loading locations" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!locations.length) {
    return (
      <div className="p-6">
        <Card>
          <EmptyState
            icon={MapPin}
            title="No mapped locations on this case"
            description="Locations extracted from evidence or added manually appear here."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex-1 min-w-0">
        <MapContainer center={centre} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((location) => (
            <Marker key={location._id} position={[location.lat, location.lng]} icon={markerIcon(location.type)}>
              <Popup>
                <p className="text-[13px] font-semibold text-foreground">{location.name}</p>
                {location.address && <p className="text-[11px] text-muted-foreground">{location.address}</p>}
                {location.description && (
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{location.description}</p>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <aside className="w-72 shrink-0 border-l border-border bg-card overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Locations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{locations.length} mapped on this case</p>
        </div>
        <ul className="divide-y divide-border/60">
          {locations.map((location) => (
            <li key={location._id} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 size-2.5 rounded-full shrink-0"
                  style={{ background: markerColour(location.type) }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{location.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{location.type.replace('_', ' ')}</p>
                  {location.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{location.description}</p>
                  )}
                  {location.personIds?.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {location.personIds.map((p) => p.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
