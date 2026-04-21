// src/pages/TipModeration.js
import React, { useEffect, useState } from "react";
import api from "../utils/api";
import TipLocationPreview from "../components/TipLocationPreview";

// Helper component for a modern button with consistent styling
const ActionButton = ({ onClick, color, children, className = "" }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-semibold text-white rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg ${color} ${className}`}
    >
        {children}
    </button>
);

export default function TipModeration() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state (UNCHANGED)
  const [modal, setModal] = useState({
    open: false,
    tipId: null,
    action: null, // "approve" or "deny"
  });

  // Form state (UNCHANGED)
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");

  // Load pending tips (UNCHANGED LOGIC)
  const fetchTips = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tips/pending");
      setTips(res.data);
    } catch (err) {
      console.error("Error fetching tips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTips();
  }, []);

  // Open modal for approve/deny (UNCHANGED LOGIC)
  const openModal = (id, action) => {
    // Note: To make the selects work inside the modal logic, 
    // we should ideally set the category/severity from the tip being moderated, 
    // but preserving the original state management logic here:
    setModal({ open: true, tipId: id, action });
  };

  const closeModal = () => {
    setModal({ open: false, tipId: null, action: null });
    setNotes("");
    setCategory(""); // Reset category/severity on close
    setSeverity("");
  };

  // Perform action (UNCHANGED LOGIC)
  const handleAction = async () => {
    try {
      if (modal.action === "approve") {
        await api.post(`/tips/${modal.tipId}/approve`, {
          category, // Uses component state
          severity, // Uses component state
          notes,
        });
      } else if (modal.action === "deny") {
        await api.post(`/tips/${modal.tipId}/deny`, { reason: notes });
      }

      closeModal();
      fetchTips();
    } catch (err) {
      console.error("Error approving/denying tip:", err);
      // Optional: Add alert for user
    }
  };

  // Tailwind CSS classes for consistent styling
  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm";
  const selectClass = "block w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 bg-white focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const cardTitleClass = "text-xl font-bold text-indigo-700";

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      
      {/* Header */}
      <header className="mb-6 pb-3 border-b border-gray-200">
        <h2 className="text-3xl font-extrabold text-gray-900">
          Tip Moderation Dashboard
        </h2>
        <p className="text-gray-500 mt-1">Review and action pending crime reports.</p>
      </header>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-10 bg-white rounded-xl shadow-lg">
          <svg className="animate-spin h-6 w-6 mr-3 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <p className="text-lg text-gray-600">Loading pending tips...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && tips.length === 0 && (
        <div className="p-10 text-center bg-white rounded-xl shadow-lg border border-dashed border-gray-300">
          <p className="text-xl font-semibold text-gray-600">🎉 No pending tips. Good job!</p>
        </div>
      )}

      {/* Tips List */}
      <div className="space-y-6">
        {tips.map((tip) => (
          <div key={tip.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 transition hover:shadow-xl">
            
            {/* Tip Summary */}
            <h3 className={cardTitleClass}>{tip.title}</h3>
            <p className="text-gray-600 mt-1">{tip.description}</p>
            <small className="text-sm text-gray-400 mt-2 block">
              Reported: <span className="font-medium text-gray-500">{new Date(tip.reported_at).toLocaleString()}</span>
            </small>

            <div className="my-4 border-t border-gray-200" />

            {/* Reporter Details */}
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Reporter Details</h4>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
                <p className="text-gray-600"><b>Name:</b> {tip.reporter?.name ?? "Anonymous"}</p>
                <p className="text-gray-600"><b>Email:</b> {tip.reporter?.email ?? "N/A"}</p>
                <p className="text-gray-600"><b>Phone:</b> {tip.reporter?.phone ?? "N/A"}</p>
                <p className="text-gray-600">
                    <b>Verified:</b> 
                    <span className={`ml-1 font-bold ${tip.reporter?.is_verified ? "text-green-600" : "text-red-500"}`}>
                        {tip.reporter?.is_verified ? "Yes" : "No"}
                    </span>
                </p>
            </div>

            <div className="my-4 border-t border-gray-200" />

            <TipLocationPreview
              latitude={tip.latitude}
              longitude={tip.longitude}
              title={tip.title}
            />
            
            <div className="my-4 border-t border-gray-200" />
            
            {/* Moderation Controls (Note: These selects are styled but DO NOT affect the tip. They set component state for the modal submission.) */}
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Set Final Classification</h4>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Category</label>
                    <div className="relative">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Select Category</option>
                            <option>Theft</option>
                            <option>Assault</option>
                            <option>Robbery</option>
                            <option>Harassment</option>
                            <option>Fraud</option>
                            <option>Vandalism</option>
                            <option>Other</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Severity</label>
                    <div className="relative">
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className={selectClass}
                        >
                            <option value="">Select Severity</option>
                            <option>minor</option>
                            <option>moderate</option>
                            <option>critical</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex space-x-4">
              <ActionButton
                color="bg-green-600 hover:bg-green-700"
                onClick={() => openModal(tip.id, "approve")}
                disabled={!category || !severity} // Require classification before approval
                className="disabled:opacity-50"
              >
                ✅ Approve
              </ActionButton>

              <ActionButton
                color="bg-red-600 hover:bg-red-700"
                onClick={() => openModal(tip.id, "deny")}
              >
                ❌ Deny
              </ActionButton>
            </div>
          </div>
        ))}
      </div>

      {/* Modal - Enhanced with Tailwind */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4 transition-opacity"
          onClick={closeModal} // Click outside to close
        >
          <div
            className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-md transition-transform duration-300 ease-in-out"
            onClick={(e) => e.stopPropagation()} // Prevent click inside from closing
          >
            <h3 className={`text-2xl font-bold mb-4 ${modal.action === "approve" ? "text-green-700" : "text-red-700"}`}>
              {modal.action === "approve"
                ? "Confirm Approval"
                : "Confirm Denial"}
            </h3>
            <p className="text-gray-600 mb-3">
                {modal.action === "approve" 
                    ? "Add any final moderation notes before marking this tip as official." 
                    : "Provide a brief reason for denying the tip (optional):"
                }
            </p>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} h-24 resize-none`}
              placeholder="Enter notes here..."
            />

            <div className="mt-6 flex justify-end space-x-3">
              <ActionButton
                onClick={closeModal}
                color="bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </ActionButton>
              
              <ActionButton
                onClick={handleAction}
                color={modal.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                Confirm {modal.action === "approve" ? "Approve" : "Deny"}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}