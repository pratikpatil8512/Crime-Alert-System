import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import API from '../utils/api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { AlertCircle, MapPin } from 'lucide-react';

// Default marker icon fix for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ReportCrime() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    severity: '',
  });
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [alert, setAlert] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  // 🧭 Auto-get user's current location on page load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setAlert({
            message: 'Unable to access your location. You can manually select it on the map.',
            type: 'error',
          });
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 📍 Allow user to manually change location on map
  function LocationPicker() {
    useMapEvents({
      click(e) {
        setLocation({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
        });
      },
    });
    return location.lat && location.lng ? (
      <Marker position={[location.lat, location.lng]}></Marker>
    ) : null;
  }

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    const { title, description, category, severity } = form;
    if (!title || !description || !category || !severity) {
      setAlert({ message: 'Please fill all fields.', type: 'error' });
      return;
    }

    // 🧭 Ensure location exists before submitting
    if (!location.lat || !location.lng) {
      setAlert({
        message: 'Location not detected. Please click on the map to mark it.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      // 🚀 Send report with current user location
      const res = await API.post('/crimes/report', {
        title,
        description,
        category,
        severity,
        latitude: location.lat,
        longitude: location.lng,
      });

      setAlert({
        message: res.data.message || 'Crime reported successfully!',
        type: 'success',
      });

      // Clear form after submission
      setForm({ title: '', description: '', category: '', severity: '' });
    } catch (err) {
      console.error(err);
      setAlert({
        message: err.response?.data?.error || 'Failed to report crime.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar userName="Citizen" />

        <main className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-indigo-700 flex items-center space-x-2">
              <AlertCircle size={24} /> <span>Report a Crime</span>
            </h2>
          </div>

          {/* Alert Message */}
          {alert.message && (
            <div
              className={`p-3 mb-4 rounded-md text-white ${
                alert.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {alert.message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="bg-white shadow-lg rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Theft at Main Market"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  placeholder="Briefly describe what happened..."
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Category</option>
                    <option value="theft">Theft</option>
                    <option value="assault">Assault</option>
                    <option value="fraud">Fraud</option>
                    <option value="accident">Accident</option>
                    <option value="harassment">Harassment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Severity
                  </label>
                  <select
                    name="severity"
                    value={form.severity}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Severity</option>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>

            {/* Map Section */}
            <div className="bg-white shadow-lg rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2 text-indigo-700">
                <MapPin size={20} /> <span>Select Location</span>
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Your current location is auto-detected. Click on map to change.
              </p>

              <MapContainer
                center={[location.lat || 16.7, location.lng || 74.23]}
                zoom={13}
                className="h-[350px] rounded-lg"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker />
                {location.lat && location.lng && (
                  <Marker position={[location.lat, location.lng]}></Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
