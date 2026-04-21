import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

let leafletIconsPatched = false;
function ensureLeafletIcons() {
  if (leafletIconsPatched) return;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
  leafletIconsPatched = true;
}

function severityStyle(severity) {
  switch (severity) {
    case 'critical':
      return { color: '#dc2626', fill: '#ef4444', radius: 14, opacity: 0.45 };
    case 'moderate':
      return { color: '#ea580c', fill: '#fb923c', radius: 12, opacity: 0.4 };
    case 'minor':
      return { color: '#16a34a', fill: '#4ade80', radius: 10, opacity: 0.35 };
    default:
      return { color: '#4f46e5', fill: '#818cf8', radius: 10, opacity: 0.35 };
  }
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const south = Math.min(...lats);
    const north = Math.max(...lats);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);
    if (south === north && west === east) {
      map.setView([south, west], 13);
      return;
    }
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [40, 40], maxZoom: 13 }
    );
  }, [map, points]);
  return null;
}

const DEFAULT_CENTER = [16.705, 74.233];

export default function CrimeDensityMap({ points }) {
  ensureLeafletIcons();
  const valid = useMemo(
    () =>
      (points || []).filter(
        (p) =>
          Number.isFinite(Number(p.latitude)) &&
          Number.isFinite(Number(p.longitude))
      ),
    [points]
  );

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900">Crime density map</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">
        Recent incident locations (overlapping circles mimic a heatmap). Zoom and pan to explore.
      </p>
      <div className="rounded-xl overflow-hidden border border-gray-200 h-[min(420px,55vh)] sm:h-[480px]">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {valid.length > 0 && <FitBounds points={valid} />}
          {valid.map((p, i) => {
            const lat = Number(p.latitude);
            const lng = Number(p.longitude);
            const s = severityStyle(p.severity);
            return (
              <CircleMarker
                key={`${lat}-${lng}-${i}`}
                center={[lat, lng]}
                radius={s.radius}
                pathOptions={{
                  color: s.color,
                  fillColor: s.fill,
                  fillOpacity: s.opacity,
                  weight: 1,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{p.category || 'Crime'}</strong>
                    <br />
                    Severity: {p.severity}
                    <br />
                    <span className="text-gray-500">{p.date}</span>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500 opacity-70" /> Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-orange-400 opacity-70" /> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-green-500 opacity-70" /> Minor
        </span>
      </div>
    </div>
  );
}
