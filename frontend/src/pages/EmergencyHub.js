import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Copy,
  MapPin,
  Navigation,
  PhoneCall,
  Shield,
  Siren,
  UserRound,
} from 'lucide-react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const EMERGENCY_CONTACTS = [
  {
    label: 'National Emergency',
    number: '112',
    note: 'Unified response for police, fire, and medical help.',
    tone: 'bg-red-50 border-red-100 text-red-900',
  },
  {
    label: 'Police',
    number: '100',
    note: 'Immediate police support in urgent situations.',
    tone: 'bg-indigo-50 border-indigo-100 text-indigo-900',
  },
  {
    label: 'Ambulance',
    number: '108',
    note: 'Emergency medical transport and urgent care.',
    tone: 'bg-emerald-50 border-emerald-100 text-emerald-900',
  },
  {
    label: 'Women Helpline',
    number: '1091',
    note: 'Dedicated support for women in distress.',
    tone: 'bg-amber-50 border-amber-100 text-amber-900',
  },
];

function formatCoords(location) {
  if (!location?.lat || !location?.lng) return 'Location unavailable';
  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

function openMapsSearch(location, query) {
  if (!location?.lat || !location?.lng) return;
  const q = encodeURIComponent(`${query} near ${location.lat},${location.lng}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer');
}

function riskTone(risk) {
  switch (risk) {
    case 'high':
      return 'bg-red-600 text-white';
    case 'moderate':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-green-600 text-white';
  }
}

export default function EmergencyHub() {
  const [userName, setUserName] = useState('User');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [riskInfo, setRiskInfo] = useState(null);
  const [nearbyStats, setNearbyStats] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUserName(localStorage.getItem('name') || 'User');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadEmergencyContext = async (latitude, longitude) => {
      try {
        const [riskRes, statsRes] = await Promise.all([
          API.get(`/crimes/risk-level?lat=${latitude}&lng=${longitude}&radius=5000`),
          API.get(`/crimes/nearby/stats?lat=${latitude}&lng=${longitude}`),
        ]);

        if (!cancelled) {
          setRiskInfo(riskRes.data || null);
          setNearbyStats((statsRes.data || []).slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to load emergency context:', error);
        if (!cancelled) {
          setStatusMessage('We could not load nearby emergency context right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported on this device.');
      setLoading(false);
      return undefined;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!cancelled) setLocation(nextLocation);
        loadEmergencyContext(nextLocation.lat, nextLocation.lng);
      },
      () => {
        if (!cancelled) {
          setStatusMessage('Allow location access to unlock nearby hospitals, police stations, and live safety guidance.');
          setLoading(false);
        }
      },
      { enableHighAccuracy: true }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const shareLocation = async () => {
    if (!location) {
      setStatusMessage('Location is not available yet.');
      return;
    }
    const text = `I am sharing my current location: https://www.google.com/maps?q=${location.lat},${location.lng}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My current location',
          text,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setStatusMessage('Location link copied to clipboard.');
      } else {
        setStatusMessage(text);
      }
    } catch (error) {
      console.error('Share location failed:', error);
      setStatusMessage('Unable to share your location right now.');
    }
  };

  const copyEmergencyBundle = async () => {
    const text = `Emergency numbers: 112 National Emergency, 100 Police, 108 Ambulance, 1091 Women Helpline. Current location: ${location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : 'Unavailable'}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setStatusMessage('Emergency details copied to clipboard.');
      } else {
        setStatusMessage(text);
      }
    } catch (error) {
      console.error('Copy emergency details failed:', error);
      setStatusMessage('Unable to copy emergency details right now.');
    }
  };

  const topCategories = useMemo(() => nearbyStats.slice(0, 3), [nearbyStats]);

  return (
    <div className="flex h-screen bg-[#f4f7fb] relative">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setIsSidebarOpen(false)} />
          <div className="w-64 bg-indigo-700 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          userName={userName}
          onMenuToggle={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pt-24">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="overflow-hidden rounded-[30px] border border-white/30 bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 p-6 text-white shadow-2xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                    <Siren size={16} />
                    Emergency Hub
                  </div>
                  <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Fast help when every second matters</h1>
                  <p className="mt-3 text-sm sm:text-base text-white/90">
                    Call emergency services, share your live location, and quickly open nearby police stations or hospitals from one place.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={shareLocation}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 font-semibold backdrop-blur hover:bg-white/20"
                  >
                    <Navigation size={16} />
                    Share Location
                  </button>
                  <button
                    type="button"
                    onClick={copyEmergencyBundle}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 font-semibold backdrop-blur hover:bg-white/20"
                  >
                    <Copy size={16} />
                    Copy Emergency Info
                  </button>
                  <button
                    type="button"
                    onClick={() => openMapsSearch(location, 'police station')}
                    disabled={!location}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 font-semibold backdrop-blur hover:bg-white/20 disabled:opacity-50"
                  >
                    <Shield size={16} />
                    Nearby Police
                  </button>
                  <button
                    type="button"
                    onClick={() => openMapsSearch(location, 'hospital')}
                    disabled={!location}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/15 px-4 py-3 font-semibold backdrop-blur hover:bg-white/20 disabled:opacity-50"
                  >
                    <PhoneCall size={16} />
                    Nearby Hospital
                  </button>
                </div>
              </div>
            </section>

            {statusMessage && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                {statusMessage}
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              {EMERGENCY_CONTACTS.map((item) => (
                <a
                  key={item.number}
                  href={`tel:${item.number}`}
                  className={`rounded-2xl border p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${item.tone}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold opacity-80">{item.label}</div>
                    <PhoneCall size={16} />
                  </div>
                  <div className="mt-3 text-3xl font-bold">{item.number}</div>
                  <p className="mt-2 text-sm opacity-80">{item.note}</p>
                </a>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Live safety snapshot</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Your immediate surroundings based on the latest nearby incidents.
                    </p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-sm font-semibold ${riskInfo ? riskTone(riskInfo.risk) : 'bg-gray-200 text-gray-700'}`}>
                    {riskInfo ? String(riskInfo.risk).toUpperCase() : 'CHECKING'}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Current coordinates</div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">{formatCoords(location)}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Nearby incidents</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {riskInfo?.crimeCount ?? (loading ? '...' : 0)}
                    </div>
                    <div className="text-sm text-gray-500">within 5 km</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Overall score</div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {riskInfo?.overallScore ?? (loading ? '...' : 0)}
                    </div>
                    <div className="text-sm text-gray-500">severity weighted</div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
                  <div className="text-sm font-semibold text-white/80">Recommended action</div>
                  <div className="mt-2 text-xl font-bold">
                    {riskInfo?.alertMessage || 'Enable location to receive a local emergency recommendation.'}
                  </div>
                  <p className="mt-2 text-sm text-white/75">
                    {riskInfo
                      ? `${riskInfo.crimeCount} incidents were recorded in the last ${riskInfo.timeWindowDays || 7} days around you.`
                      : 'Once location is available, this panel will summarize your nearby risk situation.'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                  <h2 className="text-xl font-semibold text-gray-900">Nearby incident categories</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Top categories around you so you know what to watch for.
                  </p>

                  <div className="mt-4 space-y-3">
                    {topCategories.length === 0 && (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                        {loading ? 'Loading nearby categories...' : 'No nearby category data available right now.'}
                      </div>
                    )}

                    {topCategories.map((item) => (
                      <div key={item.category} className="rounded-2xl bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm font-semibold capitalize text-gray-900">{item.category}</div>
                          <div className="text-lg font-bold text-indigo-700">{item.count}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                  <h2 className="text-xl font-semibold text-gray-900">If you feel unsafe now</h2>
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4">
                      <Siren size={16} className="mt-0.5 text-red-600" />
                      <span>Call `112` immediately if there is active danger or someone needs urgent help.</span>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 p-4">
                      <UserRound size={16} className="mt-0.5 text-indigo-600" />
                      <span>Share your live location with a trusted contact before moving.</span>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
                      <MapPin size={16} className="mt-0.5 text-amber-600" />
                      <span>Move toward a busy, well-lit place and open nearby police or hospital navigation.</span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href="tel:112"
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white shadow hover:bg-red-700"
                    >
                      <PhoneCall size={16} />
                      Call 112
                    </a>
                    <Link
                      to="/report-tip"
                      className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      <AlertCircle size={16} />
                      Send a Tip
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
