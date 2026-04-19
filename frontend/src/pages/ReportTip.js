// frontend/src/pages/ReportTip.js
import { useState, useEffect } from 'react';
import API from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function ReportTip() {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [loc, setLoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Logic: Request location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLoc({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      }, () => setLoc(null), { enableHighAccuracy: true });
    }
  }, []);

  const submit = async (e) => {
    // Logic: Submission handler (preserved)
    e.preventDefault();
    if (!title || !desc || !category || !severity || !loc) {
      return alert('Please fill all fields and allow location.');
    }
    setLoading(true);
    try {
      const payload = {
        title,
        description: desc,
        category,
        severity,
        latitude: loc.latitude,
        longitude: loc.longitude
      };
      await API.post('/tips/report', payload);
      alert('Tip submitted. Authorities will review it.');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to submit tip');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // DESIGN ENHANCEMENT START
  // ------------------------------------------------------------------

  // Tailwind CSS classes for consistent styling
  const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out shadow-sm placeholder-gray-400";
  const selectClass = "w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out shadow-sm bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  
  // Dynamic class for location text (red for error, gray for success)
  const locTextColor = loc ? 'text-green-600' : 'text-red-500';

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-200">
        
        {/* Header Section */}
        <header className="mb-8 border-b pb-4">
          <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">
            🚨 Report a Tip
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            (You must be logged in to submit a tip)
          </p>
        </header>

        <form onSubmit={submit} className="space-y-6">
          
          {/* Title Field */}
          <div>
            <label htmlFor="title" className={labelClass}>Short Title</label>
            <input 
              id="title"
              value={title} 
              onChange={e=>setTitle(e.target.value)} 
              placeholder="e.g., Suspicious activity near school" 
              className={inputClass} 
              type="text"
            />
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className={labelClass}>Describe the Incident</label>
            <textarea 
              id="description"
              value={desc} 
              onChange={e=>setDesc(e.target.value)} 
              placeholder="Provide detailed information about the incident, location, time, and any persons involved." 
              className={`${inputClass} min-h-[120px] resize-y`} 
            />
          </div>

          {/* Category & Severity Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Category Select */}
            <div>
              <label htmlFor="category" className={labelClass}>Category</label>
              <div className="relative">
                <select 
                  id="category"
                  value={category} 
                  onChange={e=>setCategory(e.target.value)} 
                  className={selectClass}
                >
                  <option value="" disabled>Select Category</option>
                  <option value="theft">Theft</option>
                  <option value="assault">Assault</option>
                  <option value="robbery">Robbery</option>
                  <option value="fraud">Fraud</option>
                  <option value="Harrasement">Harrasement</option>
                  <option value="other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.99l3.71-3.76a.75.75 0 111.08 1.04l-4.25 4.3a.75.75 0 01-1.08 0l-4.25-4.3a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </div>
              </div>
            </div>

            {/* Severity Select */}
            <div>
              <label htmlFor="severity" className={labelClass}>Severity</label>
              <div className="relative">
                <select 
                  id="severity"
                  value={severity} 
                  onChange={e=>setSeverity(e.target.value)} 
                  className={selectClass}
                >
                  <option value="" disabled>Select Severity</option>
                  <option value="minor">Minor</option>
                  <option value="moderate">Moderate</option>
                  <option value="critical">Critical</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.99l3.71-3.76a.75.75 0 111.08 1.04l-4.25 4.3a.75.75 0 01-1.08 0l-4.25-4.3a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Location Display */}
          <div className="pt-2">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Incident Location (Required)
            </h3>
            <div className={`p-3 rounded-lg border-2 ${loc ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
              <p className={`text-sm font-mono ${locTextColor}`}>
                {loc 
                  ? `Latitude: ${loc.latitude.toFixed(5)}, Longitude: ${loc.longitude.toFixed(5)}` 
                  : 'Location Not Available. Please ensure you allow location access to submit the tip.'
                }
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed mt-8"
          >
            {loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                </>
            ) : 'Send Tip Securely'}
          </button>
        </form>
      </div>
    </div>
  );
}