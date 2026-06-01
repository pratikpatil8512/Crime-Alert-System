import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileSearch, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import api from '../utils/api';
import TipLocationPreview from '../components/TipLocationPreview';
import AppShell from '../components/AppShell';
import { getUserName } from '../utils/auth';

const CATEGORY_OPTIONS = ['theft', 'assault', 'robbery', 'harassment', 'fraud', 'vandalism', 'other'];
const SEVERITY_OPTIONS = ['minor', 'moderate', 'critical'];

function ActionButton({ onClick, color, children, className = '', disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 font-semibold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 ${color} ${className}`}
    >
      {children}
    </button>
  );
}

export default function TipModeration() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [drafts, setDrafts] = useState({});
  const [modal, setModal] = useState({ open: false, tip: null, action: null, notes: '' });

  const fetchTips = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/tips/pending');
      const rows = res.data || [];
      setTips(rows);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const tip of rows) {
          if (!next[tip.id]) {
            next[tip.id] = {
              category: (tip.category || '').toLowerCase(),
              severity: (tip.severity || '').toLowerCase(),
            };
          }
        }
        return next;
      });
    } catch (err) {
      console.error('Error fetching tips:', err);
      setError('Unable to load pending tips right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, []);

  const pendingCount = tips.length;

  const modalTitle = useMemo(() => {
    if (modal.action === 'approve') return 'Confirm Approval';
    if (modal.action === 'deny') return 'Confirm Denial';
    return '';
  }, [modal.action]);

  const openModal = (tip, action) => {
    setStatusMessage({ type: '', text: '' });
    setModal({ open: true, tip, action, notes: '' });
  };

  const closeModal = () => {
    setModal({ open: false, tip: null, action: null, notes: '' });
  };

  const updateDraft = (tipId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [tipId]: {
        ...prev[tipId],
        [key]: value,
      },
    }));
  };

  const handleAction = async () => {
    if (!modal.tip) return;

    try {
      if (modal.action === 'approve') {
        const draft = drafts[modal.tip.id] || {};
        await api.post(`/tips/${modal.tip.id}/approve`, {
          category: draft.category,
          severity: draft.severity,
          notes: modal.notes,
        });
        setStatusMessage({ type: 'success', text: `Approved "${modal.tip.title}" successfully.` });
      } else if (modal.action === 'deny') {
        await api.post(`/tips/${modal.tip.id}/deny`, { reason: modal.notes });
        setStatusMessage({ type: 'success', text: `Denied "${modal.tip.title}" successfully.` });
      }

      closeModal();
      fetchTips();
    } catch (err) {
      console.error('Error approving/denying tip:', err);
      setStatusMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update tip status.' });
    }
  };

  const inputClass = 'w-full rounded-xl border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
  const selectClass = 'block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';

  return (
    <AppShell userName={getUserName()}>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[30px] border border-white/30 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-500 p-6 text-white shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
            <ShieldAlert size={16} />
            Tip Moderation
          </div>
          <h1 className="mt-4 text-3xl font-bold">Moderate incoming tips</h1>
          <p className="mt-2 text-sm text-white/85 sm:text-base">
            Review pending submissions, verify details, and convert valid reports into official cases.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 font-semibold backdrop-blur">
            <FileSearch size={16} />
            {pendingCount} pending tip{pendingCount === 1 ? '' : 's'}
          </div>
        </section>

        {statusMessage.text && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${statusMessage.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {statusMessage.text}
          </div>
        )}

        <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Pending queue</h2>
              <p className="text-sm text-gray-500">Each tip includes reporter details and location preview.</p>
            </div>
            <button
              type="button"
              onClick={fetchTips}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center rounded-2xl bg-gray-50 p-10 text-gray-600">
              Loading pending tips...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {!loading && !error && tips.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
              <p className="text-xl font-semibold text-gray-600">No pending tips right now.</p>
            </div>
          )}

          {!loading && !error && tips.length > 0 && (
            <div className="space-y-6">
              {tips.map((tip) => {
                const draft = drafts[tip.id] || { category: '', severity: '' };
                const canApprove = Boolean(draft.category && draft.severity);

                return (
                  <article key={tip.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-xl font-bold text-indigo-700">{tip.title}</h3>
                        <p className="mt-1 text-gray-600">{tip.description}</p>
                      </div>
                      <div className="text-sm text-gray-400">
                        Reported {tip.reported_at ? new Date(tip.reported_at).toLocaleString() : '-'}
                      </div>
                    </div>

                    <div className="my-4 border-t border-gray-200" />

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 text-sm">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Name</div>
                        <div className="mt-1 font-semibold text-gray-900 break-words">{tip.reporter?.name ?? 'Anonymous'}</div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Email</div>
                        <div className="mt-1 font-semibold text-gray-900 break-all">{tip.reporter?.email ?? 'N/A'}</div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Phone</div>
                        <div className="mt-1 font-semibold text-gray-900 break-all">{tip.reporter?.phone ?? 'N/A'}</div>
                      </div>
                      <div className="rounded-xl bg-gray-50 p-3">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Verified</div>
                        <div className={`mt-1 font-semibold ${tip.reporter?.is_verified ? 'text-green-600' : 'text-red-500'}`}>
                          {tip.reporter?.is_verified ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>

                    <div className="my-4 border-t border-gray-200" />

                    <TipLocationPreview latitude={tip.latitude} longitude={tip.longitude} title={tip.title} />

                    <div className="my-4 border-t border-gray-200" />

                    <h4 className="mb-3 text-lg font-semibold text-gray-800">Set final classification</h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Category</label>
                        <select value={draft.category} onChange={(e) => updateDraft(tip.id, 'category', e.target.value)} className={selectClass}>
                          <option value="">Select category</option>
                          {CATEGORY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Severity</label>
                        <select value={draft.severity} onChange={(e) => updateDraft(tip.id, 'severity', e.target.value)} className={selectClass}>
                          <option value="">Select severity</option>
                          {SEVERITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <ActionButton color="bg-green-600 hover:bg-green-700" onClick={() => openModal(tip, 'approve')} disabled={!canApprove} className="sm:min-w-[160px]">
                        <CheckCircle2 size={18} className="mr-2" />
                        Approve
                      </ActionButton>
                      <ActionButton color="bg-red-600 hover:bg-red-700" onClick={() => openModal(tip, 'deny')} className="sm:min-w-[160px]">
                        <XCircle size={18} className="mr-2" />
                        Deny
                      </ActionButton>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {modal.open && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/60 p-4" onClick={closeModal}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className={`text-2xl font-bold ${modal.action === 'approve' ? 'text-green-700' : 'text-red-700'}`}>{modalTitle}</h3>
            <p className="mt-2 text-sm text-gray-600">
              {modal.action === 'approve'
                ? 'Add any final moderation notes before marking this tip as official.'
                : 'Provide a brief reason for denying the tip.'}
            </p>

            {modal.tip && (
              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <div className="font-semibold text-gray-900">{modal.tip.title}</div>
                <p className="mt-1 text-sm text-gray-600">{modal.tip.description}</p>
              </div>
            )}

            <div className="mt-4">
              <label className={labelClass}>{modal.action === 'approve' ? 'Moderator notes' : 'Denial reason'}</label>
              <textarea
                value={modal.notes}
                onChange={(e) => setModal((prev) => ({ ...prev, notes: e.target.value }))}
                className={`${inputClass} min-h-[120px] resize-none`}
                placeholder="Enter notes here..."
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeModal} className="rounded-xl border border-gray-200 px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <ActionButton onClick={handleAction} color={modal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                Confirm {modal.action === 'approve' ? 'Approve' : 'Deny'}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
