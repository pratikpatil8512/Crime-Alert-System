import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup
} from 'react-leaflet';
import L from 'leaflet';
import API from '../utils/api';
import { Filter, AlertTriangle, Flame } from 'lucide-react';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Fix icons for leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function CrimeMap() {
  const [userLocation, setUserLocation] = useState({ lat: null, lng: null });
  const [crimes, setCrimes] = useState([]);
  const [filters, setFilters] = useState({ severity: 'all', category: 'all' });
  const [heatmap, setHeatmap] = useState(false);
  const [loading, setLoading] = useState(true);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'moderate': return 'orange';
      case 'minor': return 'green';
      default: return 'blue';
    }
  };

  // Get location + crimes
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });

          try {
            const res = await API.get(`/crimes/nearby?lat=${latitude}&lng=${longitude}`);
            setCrimes(res.data || []);
          } catch (err) {
            console.error('Error fetching crimes:', err);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.error('Location error:', err);
          setLoading(false);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const filteredCrimes = crimes.filter((crime) => {
    return (
      (filters.severity === 'all' || crime.severity === filters.severity) &&
      (filters.category === 'all' || crime.category === filters.category)
    );
  });

  const toggleHeatmap = () => setHeatmap((prev) => !prev);

  return (
    <div className="h-screen w-full bg-gradient-to-br from-indigo-800 to-indigo-950 relative overflow-hidden">
      <div className="absolute z-20 top-4 left-4 bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4">
        <h2 className="text-lg font-semibold text-indigo-700 flex items-center space-x-2 mb-2">
          <Filter size={20} />
          <span>Filters</span>
        </h2>
        <div className="space-y-2 text-sm">
          <div>
            <label className="block font-medium">Severity:</label>
            <select
              className="border rounded-md px-2 py-1 w-full text-gray-700"
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
            >
              <option value="all">All</option>
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block font-medium">Category:</label>
            <select
              className="border rounded-md px-2 py-1 w-full text-gray-700"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="all">All</option>
              <option value="theft">Theft</option>
              <option value="assault">Assault</option>
              <option value="harassment">Harassment</option>
              <option value="vandalism">Vandalism</option>
            </select>
          </div>

          <button
            onClick={toggleHeatmap}
            className={`mt-3 w-full px-2 py-1.5 rounded-lg flex items-center justify-center space-x-1 font-medium transition ${
              heatmap ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 border border-indigo-500'
            }`}
          >
            <Flame size={18} />
            <span>{heatmap ? 'Hide Heatmap' : 'Show Heatmap'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-full text-indigo-300 text-lg">
          Loading map data...
        </div>
      ) : (
        <MapContainer
          center={[userLocation.lat || 16.705, userLocation.lng || 74.233]}
          zoom={13}
          className="h-full w-full z-10"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* User’s current location */}
          {userLocation.lat && userLocation.lng && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>You are here</Popup>
              </Marker>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={5000}
                pathOptions={{ color: '#4f46e5', fillOpacity: 0.05 }}
              />
            </>
          )}

          {/* Crimes */}
          {filteredCrimes.map((crime) => (
            <Marker
              key={crime.id}
              position={[crime.latitude, crime.longitude]}
              icon={L.divIcon({
                className: 'crime-icon',
                html: `
                  <div style="
                    background:${getSeverityColor(crime.severity)};
                    width:16px; height:16px;
                    border-radius:50%;
                    border:2px solid white;
                    box-shadow:0 0 6px rgba(0,0,0,0.5);
                  "></div>`,
              })}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{crime.title}</strong><br />
                  {crime.category}<br />
                  Severity: {crime.severity}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}

      {/* Floating Risk Label */}
      <div className="absolute bottom-6 right-6 bg-white/80 backdrop-blur-lg rounded-xl shadow-md p-3 flex items-center space-x-2">
        <AlertTriangle size={18} className="text-indigo-700" />
        <span className="text-sm text-gray-800">
          Showing {filteredCrimes.length} crimes nearby
        </span>
      </div>
    </div>
  );
}
