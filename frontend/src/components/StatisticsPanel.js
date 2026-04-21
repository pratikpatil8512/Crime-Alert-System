import StatCard from './StatCard';
import SafetyAlert from './SafetyAlert';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, Users, Activity, FileWarning } from 'lucide-react';

const COLORS = [
  '#4F46E5',
  '#22C55E',
  '#F59E0B',
  '#EF4444',
  '#06B6D4',
  '#9333EA',
];

export default function StatisticsPanel({ stats, userLocation }) {
  if (!stats?.overview) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard
          title="Total Crimes"
          value={stats.overview.totalCrimes}
          icon={<AlertCircle />}
          color="bg-red-500"
        />
        <StatCard
          title="Active Alerts"
          value={stats.overview.activeAlerts}
          icon={<Activity />}
          color="bg-yellow-500"
        />
        <StatCard
          title="Unresolved Complaints"
          value={stats.overview.unresolvedComplaints}
          icon={<FileWarning />}
          color="bg-orange-500"
        />
        <StatCard
          title="Total Users"
          value={stats.overview.totalUsers}
          icon={<Users />}
          color="bg-green-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-gray-700">Crimes by Category</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.crimesByCategory}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={55}
                  paddingAngle={4}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(1)}%`
                  }
                >
                  {stats.crimesByCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {userLocation && <SafetyAlert location={userLocation} />}
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Crimes by Severity</h3>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.crimesBySeverity}>
                <XAxis dataKey="severity" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
