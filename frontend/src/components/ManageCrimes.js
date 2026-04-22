import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  Download,
  Filter,
  MapPin,
  Search,
  Shield,
  StickyNote,
  UserRoundCog,
  X,
} from 'lucide-react';
import API from '../utils/api';

const STATUS_OPTIONS = [
  { value: 'reported', label: 'Reported' },
  { value: 'verified', label: 'Verified' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'critical', label: 'Critical' },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

function toCsv(rows) {
  const header = [
    'id',
    'title',
    'city',
    'category',
    'severity',
    'status',
    'incident_time',
    'assigned_to',
    'archived_at',
  ];
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replaceAll('"', '""')}"`;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.title,
        r.city,
        r.category,
        r.severity,
        r.status,
        r.incident_time,
        r.assigned_to,
        r.archived_at,
      ].map(esc).join(',')
    );
  }
  return lines.join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ManageCrimesContent() {
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    city: '',
    status: '',
    severity: '',
    category: '',
    archived: 'false', // 'false' | 'include' | 'only'
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState(() => new Set());
  const selectedCount = selected.size;

  const [policeUsers, setPoliceUsers] = useState([]);

  const [drawerCrimeId, setDrawerCrimeId] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState(null); // {crime, notes, activity}

  const [noteModal, setNoteModal] = useState({ open: false, note: '' });
  const [archiveModal, setArchiveModal] = useState({ open: false, reason: '' });
  const [undo, setUndo] = useState(null); // { ids: string[], expiresAt: number }

  const debounceRef = useRef(null);
  const searchRef = useRef(null);
  const undoTimerRef = useRef(null);

  const listParams = useMemo(() => {
    const p = {
      page,
      pageSize,
      q: query.trim() || undefined,
      city: filters.city.trim() || undefined,
      status: filters.status || undefined,
      severity: filters.severity || undefined,
      category: filters.category.trim() || undefined,
      archived: filters.archived || 'false',
    };
    return p;
  }, [page, pageSize, query, filters]);

  const fetchList = async (params) => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/crimes', { params });
      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
      setSelected(new Set());
    } catch (e) {
      console.error(e);
      setError('Failed to load crimes. Please try again.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList(listParams), 250);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listParams]);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get('/crimes/police-users');
        setPoliceUsers(res.data || []);
      } catch (e) {
        console.warn('Failed to load police users', e);
        setPoliceUsers([]);
      }
    })();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNoteModal({ open: false, note: '' });
        setArchiveModal({ open: false, reason: '' });
        closeDrawer();
        setFiltersOpen(false);
      }
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageAllSelected = useMemo(() => {
    if (!rows.length) return false;
    return rows.every((r) => selected.has(r.id));
  }, [rows, selected]);

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = rows.length > 0 && rows.every((r) => next.has(r.id));
      if (allSelected) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const openDrawer = async (crimeId) => {
    setDrawerCrimeId(crimeId);
    setDrawerLoading(true);
    setDrawerData(null);
    try {
      const res = await API.get(`/crimes/${crimeId}`);
      setDrawerData(res.data);
    } catch (e) {
      console.error(e);
      setDrawerData(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerCrimeId(null);
    setDrawerData(null);
  };

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const bulkPatch = async (patch) => {
    if (!selectedIds.length) return;
    try {
      await API.post('/crimes/bulk', { ids: selectedIds, patch });
      await fetchList(listParams);
    } catch (e) {
      console.error(e);
      alert('Bulk action failed.');
    }
  };

  const bulkAddNote = async (note) => {
    if (!selectedIds.length) return;
    try {
      await API.post('/crimes/bulk/notes', { ids: selectedIds, note });
      await fetchList(listParams);
      if (drawerCrimeId) await openDrawer(drawerCrimeId);
    } catch (e) {
      console.error(e);
      alert('Failed to add note.');
    }
  };

  const bulkArchive = async (reason) => {
    if (!selectedIds.length) return;
    try {
      await API.post('/crimes/bulk/archive', { ids: selectedIds, reason });
      const expiresAt = Date.now() + 8000;
      setUndo({ ids: selectedIds, expiresAt });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setUndo(null), 8200);
      await fetchList(listParams);
      closeDrawer();
    } catch (e) {
      console.error(e);
      alert('Failed to archive selected cases.');
    }
  };

  const bulkRestore = async () => {
    if (!selectedIds.length) return;
    try {
      await API.post('/crimes/bulk/restore', { ids: selectedIds });
      await fetchList(listParams);
    } catch (e) {
      console.error(e);
      alert('Failed to restore selected cases.');
    }
  };

  const exportSelected = () => {
    const selectedRows = rows.filter((r) => selected.has(r.id));
    const csv = toCsv(selectedRows);
    downloadText(`crimes_selected_${Date.now()}.csv`, csv);
  };

  const exportCurrentPage = () => {
    const csv = toCsv(rows);
    downloadText(`crimes_page_${page}_${Date.now()}.csv`, csv);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const viewingArchivedOnly = filters.archived === 'only';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-indigo-700">Manage Crimes</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Review, assign, and take action on reported cases.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setFilters((f) => ({ ...f, archived: 'false' }));
              }}
              className={classNames(
                'px-3 py-2 rounded-xl border shadow-sm bg-white text-sm font-semibold transition',
                !viewingArchivedOnly ? 'border-indigo-300 ring-2 ring-indigo-200 text-indigo-700' : 'hover:bg-indigo-50 text-gray-700'
              )}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setFilters((f) => ({ ...f, archived: 'only' }));
              }}
              className={classNames(
                'px-3 py-2 rounded-xl border shadow-sm bg-white text-sm font-semibold transition',
                viewingArchivedOnly ? 'border-indigo-300 ring-2 ring-indigo-200 text-indigo-700' : 'hover:bg-indigo-50 text-gray-700'
              )}
            >
              Archived
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search title, description, or id…"
              className="w-full sm:w-[340px] pl-9 pr-3 py-2 rounded-xl border bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((s) => !s)}
            className={classNames(
              'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border shadow-sm bg-white transition',
              filtersOpen ? 'border-indigo-300 ring-2 ring-indigo-200' : 'hover:bg-indigo-50'
            )}
          >
            <Filter size={16} className="text-indigo-700" />
            <span className="text-sm font-semibold text-indigo-700">Filters</span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-2xl shadow border border-gray-100 p-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                value={filters.city}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, city: e.target.value }));
                }}
                placeholder="City"
                className="px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
              />

              <select
                value={filters.status}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, status: e.target.value }));
                }}
                className="px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.severity}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, severity: e.target.value }));
                }}
                className="px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Severity</option>
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <input
                value={filters.category}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, category: e.target.value }));
                }}
                placeholder="Category (e.g. theft)"
                className="px-3 py-2 rounded-xl border focus:ring-2 focus:ring-indigo-500"
              />

              <select
                value={filters.archived}
                onChange={(e) => {
                  setPage(1);
                  setFilters((f) => ({ ...f, archived: e.target.value }));
                }}
                className="px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="false">Hide archived</option>
                <option value="include">Include archived</option>
                <option value="only">Only archived</option>
              </select>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Tip: select multiple rows to enable bulk actions.
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setPage(1);
                  setFilters({ city: '', status: '', severity: '', category: '', archived: 'false' });
                }}
                className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
              >
                Reset
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="py-3 px-4 text-left w-10">
                  <input
                    type="checkbox"
                    checked={pageAllSelected}
                    onChange={toggleAllOnPage}
                    className="h-4 w-4 rounded border-white/40 bg-white/10 text-white focus:ring-2 focus:ring-white/60"
                  />
                </th>
                <th className="py-3 px-4 text-left">Case</th>
                <th className="py-3 px-4 text-left">City</th>
                <th className="py-3 px-4 text-left">Category</th>
                <th className="py-3 px-4 text-left">Severity</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-left">Assigned</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                      <div className="h-4 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                    </div>
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={8} className="p-6 text-red-600">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500">
                    No cases found for the current filters.
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                rows.map((crime) => {
                  const isSelected = selected.has(crime.id);
                  const archived = Boolean(crime.archived_at);
                  return (
                    <motion.tr
                      key={crime.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={classNames(
                        'border-b hover:bg-indigo-50/40 transition',
                        isSelected ? 'bg-indigo-50/60' : '',
                        archived ? 'opacity-75' : ''
                      )}
                    >
                      <td className="py-2 px-4 align-top">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(crime.id)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <span className="truncate max-w-[320px]">{crime.title}</span>
                          {archived && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border">
                              Archived
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {crime.incident_time ? new Date(crime.incident_time).toLocaleString() : '—'}
                        </div>
                      </td>
                      <td className="py-2 px-4">{crime.city || '—'}</td>
                      <td className="py-2 px-4 capitalize">{crime.category || '—'}</td>
                      <td className="py-2 px-4 capitalize">{crime.severity || '—'}</td>
                      <td className="py-2 px-4 capitalize">
                        <span
                          className={classNames(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                            crime.status === 'resolved'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : crime.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : crime.status === 'verified'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : crime.status === 'dismissed'
                                    ? 'bg-gray-50 text-gray-700 border-gray-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                          )}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === crime.status)?.label || crime.status}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        {crime.assigned_to ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
                            <UserRoundCog size={14} />
                            Assigned
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Unassigned</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openDrawer(crime.id)}
                          className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-semibold"
                        >
                          View <ChevronRight size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className="p-3 flex items-center justify-between text-sm text-gray-600">
          <div>
            Page <span className="font-semibold">{page}</span> of{' '}
            <span className="font-semibold">{totalPages}</span>{' '}
            <span className="text-gray-400">({total} total)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
            <button
              type="button"
              onClick={exportCurrentPage}
              className="px-3 py-1.5 rounded-lg border bg-white hover:bg-indigo-50 text-indigo-700 font-semibold inline-flex items-center gap-2"
            >
              <Download size={16} /> Export page
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action tray */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-4 z-30 w-[min(920px,92vw)]"
          >
            <div className="bg-white border border-gray-200 shadow-2xl rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-indigo-600" size={18} />
                <div className="text-sm">
                  <span className="font-bold text-gray-900">{selectedCount}</span>{' '}
                  selected
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="ml-2 text-gray-500 hover:text-gray-800"
                  title="Clear selection"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 items-center justify-end">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    bulkPatch({ status: v });
                    e.target.value = '';
                  }}
                  className="px-3 py-2 rounded-xl border bg-white text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Set status…</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <select
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    bulkPatch({ assigned_to: v === 'unassign' ? null : v });
                    e.target.value = '';
                  }}
                  className="px-3 py-2 rounded-xl border bg-white text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Assign…</option>
                  <option value="unassign">Unassign</option>
                  {policeUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setNoteModal({ open: true, note: '' })}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-indigo-50 text-indigo-700 font-semibold inline-flex items-center gap-2"
                >
                  <StickyNote size={16} /> Add note
                </button>

                {filters.archived === 'only' ? (
                  <button
                    type="button"
                    onClick={bulkRestore}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold inline-flex items-center gap-2 shadow"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setArchiveModal({ open: true, reason: '' })}
                    className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold inline-flex items-center gap-2 shadow"
                  >
                    <Archive size={16} /> Archive
                  </button>
                )}

                <button
                  type="button"
                  onClick={exportSelected}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-indigo-50 text-indigo-700 font-semibold inline-flex items-center gap-2"
                >
                  <Download size={16} /> Export selected
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note modal */}
      <AnimatePresence>
        {noteModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setNoteModal({ open: false, note: '' })}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Add internal note</h3>
                <button
                  type="button"
                  onClick={() => setNoteModal({ open: false, note: '' })}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                This note is visible to police/admin only and will be logged in the case timeline.
              </p>
              <textarea
                value={noteModal.note}
                onChange={(e) => setNoteModal((m) => ({ ...m, note: e.target.value }))}
                className="mt-3 w-full h-28 rounded-xl border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Write the note…"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNoteModal({ open: false, note: '' })}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const note = noteModal.note.trim();
                    if (!note) return;
                    await bulkAddNote(note);
                    setNoteModal({ open: false, note: '' });
                  }}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow"
                >
                  Add note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive modal */}
      <AnimatePresence>
        {archiveModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setArchiveModal({ open: false, reason: '' })}
          >
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Delete selected cases</h3>
                <button
                  type="button"
                  onClick={() => setArchiveModal({ open: false, reason: '' })}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                This is a soft delete. Deleted cases are moved to Archived and can be restored later.
              </p>
              <input
                value={archiveModal.reason}
                onChange={(e) => setArchiveModal((m) => ({ ...m, reason: e.target.value }))}
                className="mt-3 w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                placeholder="Reason (optional)"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setArchiveModal({ open: false, reason: '' })}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await bulkArchive(archiveModal.reason.trim() || null);
                    setArchiveModal({ open: false, reason: '' });
                  }}
                  className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow inline-flex items-center gap-2"
                >
                  <Archive size={16} /> Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {drawerCrimeId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
          >
            <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[520px] bg-white shadow-2xl border-l flex flex-col"
            >
              <div className="p-4 border-b flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">Case</div>
                  <div className="text-lg font-bold text-gray-900">
                    {drawerData?.crime?.title || 'Loading…'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {drawerData?.crime?.id ? drawerData.crime.id : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="p-2 rounded-xl border hover:bg-gray-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {drawerLoading && (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-32 bg-gray-100 rounded" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                )}

                {!drawerLoading && !drawerData && (
                  <div className="text-sm text-gray-600">
                    Failed to load case details.
                  </div>
                )}

                {!drawerLoading && drawerData?.crime && (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-xl p-3 border">
                        <div className="text-xs text-gray-500">Status</div>
                        <div className="font-semibold capitalize">{drawerData.crime.status}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border">
                        <div className="text-xs text-gray-500">Severity</div>
                        <div className="font-semibold capitalize">{drawerData.crime.severity}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border">
                        <div className="text-xs text-gray-500">City</div>
                        <div className="font-semibold">{drawerData.crime.city || '—'}</div>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 border">
                        <div className="text-xs text-gray-500">Category</div>
                        <div className="font-semibold capitalize">{drawerData.crime.category || '—'}</div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                      <div className="p-3 border-b flex items-center gap-2 text-indigo-700 font-semibold">
                        <MapPin size={16} /> Location preview
                      </div>
                      <div className="h-[240px]">
                        <MapContainer
                          center={[
                            drawerData.crime.latitude || 16.7,
                            drawerData.crime.longitude || 74.23,
                          ]}
                          zoom={12}
                          className="h-full w-full"
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          {drawerData.crime.latitude && drawerData.crime.longitude && (
                            <Marker position={[drawerData.crime.latitude, drawerData.crime.longitude]}>
                              <Popup>
                                <strong>{drawerData.crime.title}</strong>
                                <br />
                                {drawerData.crime.city} — {drawerData.crime.severity}
                              </Popup>
                            </Marker>
                          )}
                        </MapContainer>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-gray-900">Internal notes</div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(new Set([drawerData.crime.id]));
                            setNoteModal({ open: true, note: '' });
                          }}
                          className="text-indigo-700 font-semibold hover:text-indigo-900"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-3 space-y-3">
                        {(drawerData.notes || []).length === 0 && (
                          <div className="text-sm text-gray-500">No notes yet.</div>
                        )}
                        {(drawerData.notes || []).slice(0, 20).map((n) => (
                          <div key={n.id} className="border rounded-xl p-3 bg-gray-50">
                            <div className="text-xs text-gray-500 flex items-center justify-between">
                              <span>{n.author_name || 'Unknown'}</span>
                              <span>{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{n.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border shadow-sm p-4">
                      <div className="font-bold text-gray-900">Activity timeline</div>
                      <div className="mt-3 space-y-2">
                        {(drawerData.activity || []).length === 0 && (
                          <div className="text-sm text-gray-500">No activity yet.</div>
                        )}
                        {(drawerData.activity || []).slice(0, 25).map((a) => (
                          <div key={a.id} className="flex items-start gap-3">
                            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-600" />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">
                                {a.action}
                              </div>
                              <div className="text-xs text-gray-500">
                                {a.actor_name || 'System'} • {new Date(a.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo snackbar */}
      <AnimatePresence>
        {undo && Date.now() < undo.expiresAt && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 w-[min(560px,92vw)]"
          >
            <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                Deleted <span className="font-bold">{undo.ids.length}</span> case(s).
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await API.post('/crimes/bulk/restore', { ids: undo.ids });
                      setUndo(null);
                      await fetchList(listParams);
                    } catch (e) {
                      console.error(e);
                      alert('Undo failed.');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white text-gray-900 font-semibold hover:bg-gray-100"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={() => setUndo(null)}
                  className="p-2 rounded-xl hover:bg-white/10"
                  title="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
