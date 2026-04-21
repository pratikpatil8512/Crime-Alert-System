import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function SevenDayTrendMini({ rows }) {
  const data = rows || [];

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900">Last 7 days snapshot</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">Quick view of daily counts this week.</p>
      <div className="h-56">
        {data.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-10">No data in the last 7 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fill7d" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v?.slice(5) || v} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                name="Crimes"
                stroke="#4f46e5"
                fill="url(#fill7d)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
