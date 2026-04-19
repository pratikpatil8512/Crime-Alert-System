import { useEffect, useState } from 'react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatCard from '../components/StatCard';
import DashboardMap from '../components/DashboardMap';
import SafetyAlert from '../components/SafetyAlert';
import NearbyStats from '../components/NearbyStats';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { AlertCircle, Users, Activity, FileWarning } from 'lucide-react';

// 🔔 SOUND EFFECTS
const alertSound = new Audio('/alerts/high_alert.mp3');
alertSound.volume = 0.6;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [crimes, setCrimes] = useState([]);
  const [userName, setUserName] = useState('User');
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  const [riskPopup, setRiskPopup] = useState(null); // 🔥 NEW UI POPUP
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 📱 mobile sidebar

  // 🧠 Load user info + stats
  useEffect(() => {
    const name = localStorage.getItem('name') || 'User';
    setUserName(name);
    fetchStats();
  }, []);

  // 🧭 Get user location + fetch crimes
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });

          try {
            await API.put('/users/update-location', { latitude, longitude });

            const res = await API.get(
              `/crimes/nearby?lat=${latitude}&lng=${longitude}`
            );
            const nearby = res.data || [];

            const withUser = [
              ...nearby,
              {
                latitude,
                longitude,
                severity: 'self',
                category: 'Your Location',
                city: 'Current Position',
              },
            ];
            setCrimes(withUser);

            // 🔥 NEW: Fetch local risk alert
            checkRiskLevel(latitude, longitude);
          } catch (err) {
            console.error('Error updating location or fetching crimes:', err);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.warn('Geolocation denied:', err);
          fetchAllCrimesFallback();
        },
        { enableHighAccuracy: true }
      );
    } else {
      console.warn('Geolocation not supported');
      fetchAllCrimesFallback();
    }
  }, []);

  

  // 📍 Risk Level Logic (New)
  const checkRiskLevel = async (lat, lng) => {
    try {
      const res = await API.get(`/crimes/risk-level?lat=${lat}&lng=${lng}`);
      const { risk, crimeCount } = res.data;

      // Create popup UI message
      const messages = {
        safe: `🟢 Safe Zone — Only ${crimeCount} incidents nearby.`,
        moderate: `⚠ Moderate Risk — ${crimeCount} crimes reported close.`,
        high: `🚨 HIGH RISK WARNING — ${crimeCount} crime incidents detected near your location.`,
      };

      setRiskPopup({ risk, message: messages[risk] });

      // 🔥 Play alert sound only for high risk
      if (risk === 'high') {
        alertSound.play().catch(() => console.warn('Sound autoplay blocked.'));
      }

      // Auto-hide after 10s
      setTimeout(() => setRiskPopup(null), 10000);
      console.log('📌 Risk API Response:', res.data);
    } catch (err) {
      console.error('Risk check failed:', err);
    }
  };

  // 🔸 Fallback if location fetch fails
  const fetchAllCrimesFallback = async () => {
    try {
      const res = await API.get('/crimes/heatmap');
      setCrimes(res.data || []);
    } catch (err) {
      console.error('Error fetching fallback crime list:', err);
    } finally {
      setLoading(false);
    }
  };

  // 📊 Fetch stats
  const fetchStats = async () => {
    try {
      const res = await API.get('/statistics');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats', err);
    }
  };

  // 🚪 Logout
  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  // Chart colors
  const COLORS = [
    '#4F46E5',
    '#22C55E',
    '#F59E0B',
    '#EF4444',
    '#06B6D4',
    '#9333EA',
  ];

  if (!stats || loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-500 text-lg animate-pulse">
          Loading Dashboard...
        </p>
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* 🖥 Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 📱 Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="w-64 bg-indigo-700 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Container for Topbar and Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          userName={userName}
          onLogout={handleLogout}
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* 🔥 Floating alert popup - stays on top, responsive width */}
        {riskPopup && (
          <div className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4 sm:px-6">
            <div
              className={`max-w-xl w-full text-center px-4 sm:px-6 py-3 text-white rounded-xl shadow-xl backdrop-blur-md transition-all text-sm sm:text-base
                ${
                  riskPopup.risk === 'high'
                    ? 'bg-red-600 animate-pulse'
                    : riskPopup.risk === 'moderate'
                    ? 'bg-yellow-500'
                    : 'bg-green-600'
                }`}
            >
              {riskPopup.message}
            </div>
          </div>
        )}

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pt-24">
          {/* 📊 Stats Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <StatCard
              title="Total Crimes"
              value={stats.overview.totalCrimes}
              icon={<AlertCircle />}
              color="bg-red-500"
            />
            <StatCard
              title="Active Alerts"
              value={stats.overview.activeAlerts}
              icon={<Activity />}
              color="bg-yellow-500"
            />
            <StatCard
              title="Unresolved Complaints"
              value={stats.overview.unresolvedComplaints}
              icon={<FileWarning />}
              color="bg-orange-500"
            />
            <StatCard
              title="Total Users"
              value={stats.overview.totalUsers}
              icon={<Users />}
              color="bg-green-500"
            />
          </div>

          {/* Charts, DashboardMap, and NearbyStats */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            {/* Pie Chart Card */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Crimes by Category
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.crimesByCategory}
                      dataKey="count"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={55}
                      paddingAngle={4}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(1)}%`
                      }
                    >
                      {stats.crimesByCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Risk alert for current location inside card */}
              {userLocation && <SafetyAlert location={userLocation} />}
            </div>

            {/* Map + Nearby Stats stacked on larger screens */}
            <DashboardMap />

            <NearbyStats location={userLocation} />

            {/* Bar Chart Card */}
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                Crimes by Severity
              </h3>
              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.crimesBySeverity}>
                    <XAxis dataKey="severity" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366F1" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Live Crime Map Section */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Live Crime Map (Near You)
            </h3>

            <MapContainer
              center={
                userLocation
                  ? [userLocation.lat, userLocation.lng]
                  : [19.7515, 75.7139]
              }
              zoom={userLocation ? 13 : 7}
              className="h-72 md:h-[400px] rounded-lg z-0"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {/* User Marker */}
              {userLocation && (
                <CircleMarker
                  center={[userLocation.lat, userLocation.lng]}
                  radius={10}
                  color="blue"
                >
                  <Popup>You are here</Popup>
                </CircleMarker>
              )}

              {/* Crime Markers */}
              {crimes.map((crime, idx) => (
                <CircleMarker
                  key={idx}
                  center={[crime.latitude, crime.longitude]}
                  radius={crime.severity === 'self' ? 10 : 6}
                  color={
                    crime.severity === 'self'
                      ? 'blue'
                      : crime.severity === 'critical'
                      ? 'red'
                      : crime.severity === 'moderate'
                      ? 'orange'
                      : 'green'
                  }
                >
                  <Popup>
                    <b>{crime.category}</b> <br />
                    {crime.city}
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </main>
      </div>
    </div>
  );
}
