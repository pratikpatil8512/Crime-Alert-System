import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const TAB = [
  { id: 'daily', label: 'Daily (90d)' },
  { id: 'weekly', label: 'Weekly (~12w)' },
  { id: 'monthly', label: 'Monthly (24m)' },
];

function pickData(stats, mode) {
  if (!stats) return [];
  if (mode === 'daily') return stats.crimesTrendDaily || [];
  if (mode === 'weekly') return stats.crimesTrendWeekly || [];
  return stats.crimesTrendMonthly || [];
}

function tickFormatter(mode, value) {
  if (!value) return '';
  if (mode === 'monthly') return value;
  if (mode === 'weekly') return value.slice(5);
  return value.slice(5);
}

export default function CrimeTrendSection({ stats }) {
  const [mode, setMode] = useState('daily');
  const data = useMemo(() => pickData(stats, mode), [stats, mode]);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Crime trend over time</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Reported incidents aggregated by day, week, or month.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAB.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === t.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80 sm:h-96 w-full">
        {data.length === 0 ? (
          <p className="text-gray-500 text-sm py-12 text-center">No crime records in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(v) => tickFormatter(mode, v)}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                labelFormatter={(label) =>
                  mode === 'weekly' ? `Week starting ${label}` : label
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Crimes"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
