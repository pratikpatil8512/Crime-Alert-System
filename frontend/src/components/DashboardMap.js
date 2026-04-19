import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import API from '../utils/api';
import { AlertTriangle } from 'lucide-react';

// 🧩 Fix leaflet icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 🔹 Helper to recenter map with fly animation
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 14, { animate: true, duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

export default function DashboardMap() {
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [crimes, setCrimes] = useState([]);
  const [riskLevel, setRiskLevel] = useState('safe');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 🎯 Determine risk level based on nearby crimes
  const evaluateRiskLevel = (crimes) => {
    const criticalCount = crimes.filter((c) => c.severity === 'critical').length;
    const moderateCount = crimes.filter((c) => c.severity === 'moderate').length;
    if (criticalCount >= 3 || crimes.length >= 10) return 'high';
    if (criticalCount > 0 || moderateCount >= 3) return 'moderate';
    return 'safe';
  };

  // 🧭 Fetch location + nearby crimes
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lng: longitude });
          try {
            const res = await API.get(`/crimes/nearby?lat=${latitude}&lng=${longitude}`);
            const nearby = res.data || [];
            setCrimes(nearby);
            setRiskLevel(evaluateRiskLevel(nearby));
          } catch (err) {
            console.error('Nearby crimes fetch error:', err);
            setError('Unable to fetch nearby crimes.');
          }
        },
        (err) => {
          console.error('Location error:', err);
          setError('Unable to access your location.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setError('Geolocation not supported by your browser.');
    }
  }, []);

  // 🧠 Dynamic pulse color based on risk level
  const getPulseColor = () => {
    switch (riskLevel) {
      case 'high': return '#ef4444';    // red
      case 'moderate': return '#f97316'; // orange
      default: return '#3b82f6';        // blue
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'moderate': return 'orange';
      case 'minor': return 'green';
      default: return 'blue';
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white rounded-2xl shadow-xl p-6 relative overflow-hidden">
      {/* 🌫️ Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-800/50 to-indigo-900/40 animate-gradient opacity-40 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-xl font-semibold flex items-center space-x-2">
          <AlertTriangle size={22} />
          <span>Live Safety Map (5 km Radius)</span>
        </h3>
        <button
          onClick={() => navigate('/map')}
          className="bg-indigo-500 hover:bg-indigo-400 text-sm px-3 py-1.5 rounded-lg transition-all"
        >
          Explore Full Map →
        </button>
      </div>

      {error && (
        <p className="text-red-300 text-sm mb-3 bg-red-900/30 px-3 py-2 rounded-md relative z-10">
          {error}
        </p>
      )}

      <div className="rounded-xl overflow-hidden border border-indigo-500/40 shadow-inner relative z-10">
        <MapContainer
          center={[location.lat || 16.705, location.lng || 74.233]}
          zoom={13}
          className="h-[420px] w-full"
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap lat={location.lat} lng={location.lng} />

          {/* 🔵 User’s current location with pulsing ripple */}
          {location.lat && location.lng && (
            <>
              <Marker position={[location.lat, location.lng]}>
                <Popup>You are here</Popup>
              </Marker>

              {/* Subtle 5 km range circle */}
              <Circle
                center={[location.lat, location.lng]}
                radius={5000}
                pathOptions={{
                  color: getPulseColor(),
                  fillColor: getPulseColor(),
                  fillOpacity: 0.07,
                  weight: 1,
                }}
              />

              {/* 🌊 Glowing Ripple Animation */}
              <div
                className="absolute w-8 h-8 rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: getPulseColor(),
                  boxShadow: `0 0 20px ${getPulseColor()}`,
                  animation: 'ripple 3s infinite ease-out',
                }}
              />
            </>
          )}

          {/* 🔴 Crime markers */}
          {crimes.map((crime) => (
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
                  Category: {crime.category}<br />
                  <span className="text-xs text-gray-500">Severity: {crime.severity}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* 🧠 Risk label */}
      <div className="mt-3 text-center text-sm">
        {riskLevel === 'safe' && (
          <p className="text-green-400">✅ Your area looks safe right now</p>
        )}
        {riskLevel === 'moderate' && (
          <p className="text-yellow-400">⚠️ Moderate risk: few crimes nearby</p>
        )}
        {riskLevel === 'high' && (
          <p className="text-red-400 font-medium">🚨 High risk: several crimes near you</p>
        )}
      </div>

      {/* 🎨 Legend */}
      <div className="flex justify-center mt-3 space-x-4 text-xs text-gray-200">
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span><span>Minor</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span><span>Moderate</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span><span>Critical</span>
        </div>
      </div>

      {/* ✨ Animations */}
      <style>{`
        @keyframes ripple {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.8; }
          70% { transform: translate(-50%, -50%) scale(2.2); opacity: 0.1; }
          100% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.8; }
        }
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 10s ease infinite;
        }
      `}</style>
    </div>
  );
}
