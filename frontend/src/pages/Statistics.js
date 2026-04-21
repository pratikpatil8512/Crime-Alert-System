import { useEffect, useState } from 'react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import StatisticsPanel from '../components/StatisticsPanel';
import CrimeTrendSection from '../components/statistics/CrimeTrendSection';
import CrimeDensityMap from '../components/statistics/CrimeDensityMap';
import CrimesByCitySection from '../components/statistics/CrimesByCitySection';
import SevenDayTrendMini from '../components/statistics/SevenDayTrendMini';
import { getUserName } from '../utils/auth';

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName] = useState(() => getUserName() || 'User');
  const [userLocation, setUserLocation] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get('/statistics');
        if (!cancelled) setStats(res.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err.response?.data?.error || 'Unable to load statistics.');
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      <div className="hidden md:block">
        <Sidebar />
      </div>

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

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          userName={userName}
          onLogout={handleLogout}
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pt-24">
          <header className="mb-6 pb-3 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
            <p className="text-gray-500 text-sm mt-1">
              System-wide aggregates (admin and police only).
            </p>
          </header>

          {loading && (
            <p className="text-gray-500 animate-pulse">Loading statistics...</p>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && stats && (
            <div className="space-y-8">
              <StatisticsPanel stats={stats} userLocation={userLocation} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SevenDayTrendMini rows={stats.crimesLast7Days} />
                <CrimesByCitySection cities={stats.crimesByCity} />
              </div>

              <CrimeTrendSection stats={stats} />

              <CrimeDensityMap points={stats.heatmapPoints} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
