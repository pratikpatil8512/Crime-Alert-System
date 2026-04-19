import { useEffect, useState } from 'react';
import API from '../utils/api';
import { BarChart3 } from 'lucide-react';

export default function NearbyStats({ location }) {
  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      if (location.lat && location.lng) {
        try {
          const res = await API.get(
            `/crimes/nearby/stats?lat=${location.lat}&lng=${location.lng}`
          );
          setStats(res.data || []);
        } catch (err) {
          console.error('Error fetching stats:', err);
          setError('Failed to load nearby crime stats.');
        }
      }
    };
    fetchStats();
  }, [location]);

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <div className="flex items-center space-x-2 mb-3 text-indigo-700">
        <BarChart3 size={22} />
        <h3 className="text-lg font-semibold">Crime Summary (5 km radius)</h3>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {stats.length > 0 ? (
        <ul className="space-y-1">
          {stats.map((item) => (
            <li
              key={item.category}
              className="flex justify-between text-gray-800 text-sm border-b border-gray-100 pb-1"
            >
              <span className="capitalize">{item.category}</span>
              <span className="font-medium">{item.count}</span>
            </li>
          ))}
          <li className="flex justify-between text-gray-700 font-semibold mt-2">
            <span>Total</span>
            <span>{stats.reduce((acc, item) => acc + parseInt(item.count), 0)}</span>
          </li>
        </ul>
      ) : (
        <p className="text-gray-500 text-sm italic">No crimes reported nearby.</p>
      )}
    </div>
  );
}
