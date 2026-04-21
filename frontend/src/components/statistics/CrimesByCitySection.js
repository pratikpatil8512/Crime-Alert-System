import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function CrimesByCitySection({ cities }) {
  const data = cities || [];
  // Recharts lists first Y row at bottom — sort ascending so highest count sits at top.
  const chartData = [...data].sort((a, b) => a.count - b.count);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md border border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900">Crimes by city</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">
        Horizontal view of recorded incidents where city is set.
      </p>
      {chartData.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">No city breakdown available.</p>
      ) : (
        <div className="h-80 sm:h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="city"
                width={100}
                tick={{ fontSize: 11 }}
                interval={0}
              />
              <Tooltip />
              <Bar dataKey="count" name="Crimes" fill="#6366f1" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
