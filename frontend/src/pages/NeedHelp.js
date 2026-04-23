import { useEffect, useState } from 'react';
import { AlertTriangle, LocateFixed, Send, ShieldAlert } from 'lucide-react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function NeedHelp() {
  const [userName, setUserName] = useState('User');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState('Need help at my current location. Please respond urgently.');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [myRequests, setMyRequests] = useState([]);

  const requestStatusTone = (request) => {
    if (request.status === 'resolved') return 'bg-green-100 text-green-700';
    if (request.status === 'claimed') return 'bg-indigo-100 text-indigo-700';
    return 'bg-red-100 text-red-700';
  };

  const requestStatusLabel = (request) => {
    if (request.status === 'resolved') return 'Resolved';
    if (request.status === 'claimed') return 'Acknowledged';
    return 'Active';
  };

  const loadMyRequests = async () => {
    try {
      const res = await API.get('/alerts/help/mine');
      setMyRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load your help requests:', err);
    }
  };

  useEffect(() => {
    setUserName(localStorage.getItem('name') || 'User');
    loadMyRequests();
    const interval = window.setInterval(loadMyRequests, 15000);

    if (!navigator.geolocation) {
      setStatus({ type: 'error', text: 'Geolocation is not supported on this device.' });
      setLoadingLocation(false);
      return () => window.clearInterval(interval);
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
      },
      () => {
        setStatus({ type: 'error', text: 'Allow location access before sending a help request.' });
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true }
    );

    return () => window.clearInterval(interval);
  }, []);

  const sendHelpRequest = async () => {
    if (!location) {
      setStatus({ type: 'error', text: 'Current location is required to send a help request.' });
      return;
    }

    setSending(true);
    setStatus({ type: '', text: '' });
    try {
      await API.post('/alerts/help', {
        latitude: location.lat,
        longitude: location.lng,
        message,
      });
      setStatus({
        type: 'success',
        text: 'Your help request was sent to police and admin with your live location.',
      });
      await loadMyRequests();
    } catch (err) {
      console.error('Failed to send help request:', err);
      setStatus({
        type: 'error',
        text: err.response?.data?.error || 'Failed to send help request.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] relative">
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
        <Topbar userName={userName} onMenuToggle={() => setIsSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pt-24">
          <div className="mx-auto max-w-5xl space-y-6">
            <section className="rounded-[30px] border border-white/30 bg-gradient-to-br from-red-700 via-red-600 to-orange-500 p-6 text-white shadow-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                <ShieldAlert size={16} />
                Need Help
              </div>
              <h1 className="mt-4 text-3xl font-bold">Send an urgent help request</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                This will send your current live location and your message to police and admin responders immediately.
              </p>
            </section>

            {status.text && (
              <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
                {status.text}
              </div>
            )}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                <h2 className="text-xl font-semibold text-gray-900">Current location</h2>
                <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                  {loadingLocation ? (
                    <div className="text-sm text-gray-500">Detecting your location...</div>
                  ) : location ? (
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 text-indigo-700 font-semibold">
                        <LocateFixed size={16} />
                        Live coordinates captured
                      </div>
                      <div className="text-sm text-gray-700">
                        Latitude: {location.lat.toFixed(6)}
                      </div>
                      <div className="text-sm text-gray-700">
                        Longitude: {location.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      We could not capture your location. Please allow geolocation and refresh this page.
                    </div>
                  )}
                </div>

                <label className="mt-5 block text-sm font-semibold text-gray-700">
                  Help message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 h-36 w-full rounded-2xl border border-gray-300 px-4 py-3 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Describe what kind of help you need..."
                />

                <button
                  type="button"
                  onClick={sendHelpRequest}
                  disabled={sending || !location}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white shadow-lg hover:bg-red-700 disabled:opacity-60"
                >
                  <Send size={18} />
                  {sending ? 'Sending Help Request...' : 'Send Help Request'}
                </button>
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                  <h2 className="text-xl font-semibold text-gray-900">What happens next</h2>
                  <div className="mt-4 space-y-3 text-sm text-gray-600">
                    <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4">
                      <AlertTriangle size={16} className="mt-0.5 text-red-600" />
                      <span>Police and admin responders receive your help request with your message and live location.</span>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-indigo-50 p-4">
                      <LocateFixed size={16} className="mt-0.5 text-indigo-600" />
                      <span>Your latest coordinates are included so responders can navigate quickly.</span>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4">
                      <ShieldAlert size={16} className="mt-0.5 text-amber-600" />
                      <span>Keep your phone with you and move toward a safe public place if you can.</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
                  <h2 className="text-xl font-semibold text-gray-900">Your recent help requests</h2>
                  <div className="mt-4 space-y-3">
                    {myRequests.length === 0 && (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                        No help requests sent yet.
                      </div>
                    )}

                    {myRequests.map((request) => (
                      <div key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-gray-900">{request.title}</div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${requestStatusTone(request)}`}>
                            {requestStatusLabel(request)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{request.message}</p>
                        {request.acknowledgedBy && (
                          <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                            A responder has acknowledged your request.
                            {request.acknowledgedBy.name ? ` Handled by ${request.acknowledgedBy.name}.` : ''}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          Sent {request.created_at ? new Date(request.created_at).toLocaleString() : '-'}
                        </div>
                      </div>
                    ))}
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
