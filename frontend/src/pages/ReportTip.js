import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import AppShell from '../components/AppShell';
import { getUserName } from '../utils/auth';

export default function ReportTip() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => setLoc(null),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setStatus({ type: '', text: '' });

    if (!title || !desc || !category || !severity || !loc) {
      setStatus({ type: 'error', text: 'Please fill all fields and allow location.' });
      return;
    }

    setLoading(true);
    try {
      await API.post('/tips/report', {
        title,
        description: desc,
        category,
        severity,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });

      setStatus({ type: 'success', text: 'Tip submitted successfully. Redirecting to My Reports...' });
      setTimeout(() => navigate('/my-reports'), 900);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', text: err.response?.data?.error || 'Failed to submit tip' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full rounded-2xl border border-gray-300 px-4 py-3 shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
  const selectClass = 'w-full appearance-none rounded-2xl border border-gray-300 bg-white px-4 py-3 shadow-sm transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700';
  const locTextColor = loc ? 'text-green-700' : 'text-red-600';

  return (
    <AppShell userName={getUserName()}>
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <section className="rounded-[30px] border border-white/30 bg-gradient-to-br from-indigo-700 via-indigo-600 to-sky-500 p-6 text-white shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
            Report Tip
          </div>
          <h1 className="mt-4 text-3xl font-bold">Share a crime tip securely</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
            Your report goes to moderators for review. After submission, you can track it in My Reports.
          </p>
        </section>

        {status.text && (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
            {status.text}
          </div>
        )}

        <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-lg sm:p-6">
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label htmlFor="title" className={labelClass}>Short title</label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Suspicious activity near school"
                className={inputClass}
                type="text"
              />
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>Describe the incident</label>
              <textarea
                id="description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Provide detailed information about the incident, location, time, and any persons involved."
                className={`${inputClass} min-h-[140px] resize-y`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="category" className={labelClass}>Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled>Select category</option>
                  <option value="theft">Theft</option>
                  <option value="assault">Assault</option>
                  <option value="robbery">Robbery</option>
                  <option value="fraud">Fraud</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="severity" className={labelClass}>Severity</label>
                <select
                  id="severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className={selectClass}
                >
                  <option value="" disabled>Select severity</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-base font-semibold text-gray-900">Incident location</h2>
              <div className={`rounded-2xl border-2 p-4 ${loc ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <p className={`text-sm font-mono ${locTextColor}`}>
                  {loc
                    ? `Latitude: ${loc.latitude.toFixed(5)}, Longitude: ${loc.longitude.toFixed(5)}`
                    : 'Location not available. Please allow location access to submit the tip.'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-base font-bold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Tip Securely'}
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
