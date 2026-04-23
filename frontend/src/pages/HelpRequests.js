import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, Handshake, LocateFixed, PhoneCall, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const SOCKET_URL = 'http://localhost:5000';

export default function HelpRequests() {
  const [userName, setUserName] = useState('Responder');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState('');
  const seenIds = useRef(new Set());

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await API.get('/alerts/help');
      const rows = res.data || [];
      setRequests(rows);
      seenIds.current = new Set(rows.map((row) => row.id));
    } catch (err) {
      console.error('Failed to load help requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserName(localStorage.getItem('name') || 'Responder');
    loadRequests();
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('help-request:new', (payload) => {
      setRequests((prev) => [payload, ...prev.filter((item) => item.id !== payload.id)]);
      if (!seenIds.current.has(payload.id)) {
        seenIds.current.add(payload.id);
        setBanner(`New help request from ${payload.reporter?.name || payload.reporter?.email || 'a user'}`);
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('New Help Request', {
            body: payload.message || payload.title,
          });
        }
      }
    });

    socket.on('help-request:resolved', (payload) => {
      setRequests((prev) =>
        prev.map((item) => (item.id === payload.id ? { ...item, ...payload, active: false } : item))
      );
    });

    socket.on('help-request:claimed', (payload) => {
      setRequests((prev) =>
        prev.map((item) => (item.id === payload.id ? { ...item, ...payload } : item))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const resolveRequest = async (id) => {
    try {
      const res = await API.patch(`/alerts/help/${id}/resolve`);
      setRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...res.data, active: false } : item))
      );
    } catch (err) {
      console.error('Failed to resolve request:', err);
    }
  };

  const claimRequest = async (id) => {
    try {
      const res = await API.patch(`/alerts/help/${id}/claim`);
      setRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...res.data } : item))
      );
    } catch (err) {
      console.error('Failed to claim request:', err);
    }
  };

  const activeCount = requests.filter((item) => item.active).length;

  return (
    <div className="flex h-screen bg-[#f5f7fb] relative">
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
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="rounded-[30px] border border-white/30 bg-gradient-to-br from-indigo-700 via-indigo-600 to-red-500 p-6 text-white shadow-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                <ShieldAlert size={16} />
                Responder Desk
              </div>
              <h1 className="mt-4 text-3xl font-bold">Help Requests</h1>
              <p className="mt-2 text-sm text-white/85 sm:text-base">
                Live incoming distress requests from tourists and citizens with location and contact details.
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 font-semibold backdrop-blur">
                <Bell size={16} />
                {activeCount} active request{activeCount === 1 ? '' : 's'}
              </div>
            </section>

            {banner && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
                {banner}
              </div>
            )}

            <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900">Live queue</h2>
              <div className="mt-5 space-y-4">
                {loading && (
                  <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">Loading help requests...</div>
                )}

                {!loading && requests.length === 0 && (
                  <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">No help requests yet.</div>
                )}

                {!loading &&
                  requests.map((request) => (
                    <div key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {request.active ? 'Active' : 'Resolved'}
                            </span>
                            {request.status === 'claimed' && (
                              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                Claimed
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">{request.message}</p>
                          {request.acknowledgedBy && (
                            <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                              Claimed by {request.acknowledgedBy.name || request.acknowledgedBy.email || 'Responder'}
                              {request.acknowledged_at ? ` at ${new Date(request.acknowledged_at).toLocaleString()}` : ''}.
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500">
                          {request.created_at ? new Date(request.created_at).toLocaleString() : '-'}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Reporter</div>
                          <div className="mt-1 font-semibold text-gray-900">{request.reporter?.name || '-'}</div>
                          <div className="text-xs text-gray-500">{request.reporter?.role || '-'}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Email</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">{request.reporter?.email || '-'}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Phone</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">{request.reporter?.phone || '-'}</div>
                        </div>
                        <div className="rounded-xl bg-white p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Coordinates</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900">
                            {request.latitude && request.longitude
                              ? `${Number(request.latitude).toFixed(5)}, ${Number(request.longitude).toFixed(5)}`
                              : '-'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {request.latitude && request.longitude && (
                          <a
                            href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <LocateFixed size={16} />
                            Open Location
                          </a>
                        )}

                        {request.reporter?.phone && (
                          <a
                            href={`tel:${request.reporter.phone}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 font-semibold text-green-700 hover:bg-green-100"
                          >
                            <PhoneCall size={16} />
                            Call Reporter
                          </a>
                        )}

                        {request.active && (
                          !request.acknowledgedBy ? (
                            <button
                              type="button"
                              onClick={() => claimRequest(request.id)}
                              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-100"
                            >
                              <Handshake size={16} />
                              Claim Request
                            </button>
                          ) : null
                        )}

                        {request.active && (
                          <button
                            type="button"
                            onClick={() => resolveRequest(request.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white shadow hover:bg-red-700"
                          >
                            <CheckCircle2 size={16} />
                            Mark Resolved
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
