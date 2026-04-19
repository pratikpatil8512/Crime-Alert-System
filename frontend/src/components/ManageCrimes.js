import { useEffect, useState } from 'react';
import API from '../utils/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { getUserRole } from '../utils/auth';
import { Shield, MapPin } from 'lucide-react';

export default function ManageCrimes() {
  const [crimes, setCrimes] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ city: '', severity: '', status: '' });
  const [loading, setLoading] = useState(true);
  const role = getUserRole();

  useEffect(() => {
    fetchCrimes();
  }, []);

  const fetchCrimes = async () => {
    try {
      const res = await API.get('/crimes');
      setCrimes(res.data);
      setFiltered(res.data);
    } catch (err) {
      console.error('Error fetching crimes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);

    const filteredData = crimes.filter((c) => {
      return (
        (!newFilters.city || c.city.toLowerCase().includes(newFilters.city.toLowerCase())) &&
        (!newFilters.severity || c.severity === newFilters.severity) &&
        (!newFilters.status || c.status === newFilters.status)
      );
    });
    setFiltered(filteredData);
  };

  const updateCrimeStatus = async (id, newStatus) => {
    try {
      await API.put(`/crimes/${id}/status`, { status: newStatus });
      setCrimes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
      setFiltered((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update crime status');
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Loading Crimes...
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar userName="Officer" />

        <main className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-indigo-700 flex items-center space-x-2">
              <Shield size={24} /> <span>Manage Crimes</span>
            </h2>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              name="city"
              value={filters.city}
              onChange={handleFilter}
              placeholder="Search by City"
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <select
              name="severity"
              value={filters.severity}
              onChange={handleFilter}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Severities</option>
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="critical">Critical</option>
            </select>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilter}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="verified">Verified</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="min-w-full text-sm">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="py-3 px-4 text-left">Title</th>
                  <th className="py-3 px-4 text-left">City</th>
                  <th className="py-3 px-4 text-left">Category</th>
                  <th className="py-3 px-4 text-left">Severity</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((crime) => (
                  <tr key={crime.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">{crime.title}</td>
                    <td className="py-2 px-4">{crime.city}</td>
                    <td className="py-2 px-4 capitalize">{crime.category}</td>
                    <td className="py-2 px-4 capitalize">{crime.severity}</td>
                    <td className="py-2 px-4 capitalize">{crime.status}</td>
                    <td className="py-2 px-4">
                      {(role === 'admin' || role === 'police') && (
                        <select
                          value={crime.status}
                          onChange={(e) => updateCrimeStatus(crime.id, e.target.value)}
                          className="px-2 py-1 border rounded-md focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="reported">Reported</option>
                          <option value="verified">Verified</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Small Map */}
          <div className="bg-white rounded-xl shadow mt-8 p-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2 text-indigo-700">
              <MapPin size={20} /> <span>Crime Map Preview</span>
            </h3>
            <MapContainer
              center={[16.7, 74.23]}
              zoom={8}
              className="h-[300px] rounded-lg"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.map((crime, i) => (
                <Marker key={i} position={[crime.latitude, crime.longitude]}>
                  <Popup>
                    <strong>{crime.title}</strong>
                    <br />
                    {crime.city} — {crime.severity}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </main>
      </div>
    </div>
  );
}
