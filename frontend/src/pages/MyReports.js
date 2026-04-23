import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import { AlertCircle, CheckCircle2, Clock3, FileText, MapPin, RefreshCw, XCircle } from 'lucide-react';

function statusClasses(status) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'denied':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-amber-100 text-amber-800 border-amber-200';
  }
}

function statusLabel(status) {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'denied':
      return 'Denied';
    default:
      return 'Pending Review';
  }
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/80 p-2 shadow-sm">{icon}</div>
        <div>
          <div className="text-sm font-medium opacity-80">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function MyReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchReports = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get('/tips/mine');
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to load your reports:', err);
      setError('Unable to load your reports right now.');
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') return reports;
    return reports.filter((report) => report.status === statusFilter);
  }, [reports, statusFilter]);

  const summary = useMemo(() => {
    return reports.reduce(
      (acc, report) => {
        acc.total += 1;
        if (report.status === 'approved') acc.approved += 1;
        else if (report.status === 'denied') acc.denied += 1;
        else acc.pending += 1;
        return acc;
      },
      { total: 0, approved: 0, denied: 0, pending: 0 }
    );
  }, [reports]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-[#edf6ff] to-[#f4f7fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[30px] border border-white/40 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
                <FileText size={16} />
                My Reports
              </div>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">Track your submitted tips</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-base">
                See what you have reported, whether it is still under review, and what action was taken.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/report-tip"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-700"
              >
                <AlertCircle size={16} />
                New Tip
              </Link>
              <button
                type="button"
                onClick={fetchReports}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<FileText className="text-sky-700" size={18} />}
            label="Total Reports"
            value={summary.total}
            tone="bg-sky-50 text-sky-900 border-sky-100"
          />
          <StatCard
            icon={<Clock3 className="text-amber-700" size={18} />}
            label="Pending"
            value={summary.pending}
            tone="bg-amber-50 text-amber-900 border-amber-100"
          />
          <StatCard
            icon={<CheckCircle2 className="text-green-700" size={18} />}
            label="Approved"
            value={summary.approved}
            tone="bg-green-50 text-green-900 border-green-100"
          />
          <StatCard
            icon={<XCircle className="text-red-700" size={18} />}
            label="Denied"
            value={summary.denied}
            tone="bg-red-50 text-red-900 border-red-100"
          />
        </div>

        <div className="rounded-[30px] border border-white/40 bg-white/85 p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent submissions</h2>
              <p className="text-sm text-gray-500">Review the latest status for each tip you submitted.</p>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
            </select>
          </div>

          {loading && (
            <div className="mt-5 space-y-3">
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
          )}

          {!loading && error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && filteredReports.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <FileText className="text-indigo-600" size={20} />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {reports.length === 0 ? 'No reports yet' : 'No reports match this filter'}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {reports.length === 0
                  ? 'When you submit a tip, it will appear here with its review status.'
                  : 'Try switching the status filter to see your other submissions.'}
              </p>
              <Link
                to="/report-tip"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow hover:bg-indigo-700"
              >
                <AlertCircle size={16} />
                Submit a Tip
              </Link>
            </div>
          )}

          {!loading && !error && filteredReports.length > 0 && (
            <div className="mt-5 space-y-4">
              {filteredReports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-2xl border border-gray-100 bg-gradient-to-r from-white to-slate-50 p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses(report.status)}`}>
                          {statusLabel(report.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{report.description}</p>
                    </div>

                    <div className="text-xs text-gray-500">
                      Reported {report.reported_at ? new Date(report.reported_at).toLocaleString() : '-'}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Category</div>
                      <div className="mt-1 font-semibold capitalize text-gray-900">{report.category || '-'}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Severity</div>
                      <div className="mt-1 font-semibold capitalize text-gray-900">{report.severity || '-'}</div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Coordinates</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {report.latitude && report.longitude
                          ? `${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`
                          : '-'}
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Moderated</div>
                      <div className="mt-1 text-sm font-semibold text-gray-900">
                        {report.moderated_at ? new Date(report.moderated_at).toLocaleString() : 'Waiting for review'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[1.3fr_0.7fr]">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900">Moderator notes</div>
                      <p className="mt-2 text-sm text-gray-600">
                        {report.moderator_notes || 'No moderation note has been added yet.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900">Outcome</div>
                      <div className="mt-2 space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-indigo-600" />
                          <span>
                            {report.crime_id
                              ? `Converted into case ${report.crime_id}`
                              : report.status === 'denied'
                              ? 'This tip was not converted into a case.'
                              : 'No linked case yet.'}
                          </span>
                        </div>
                        {report.status === 'pending' && (
                          <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
                            Authorities are still reviewing this submission.
                          </div>
                        )}
                        {report.status === 'approved' && (
                          <div className="rounded-xl bg-green-50 px-3 py-2 text-green-700">
                            This tip was accepted and moved into the workflow.
                          </div>
                        )}
                        {report.status === 'denied' && (
                          <div className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
                            This tip was reviewed but not accepted.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
