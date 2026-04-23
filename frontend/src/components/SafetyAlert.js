import { useEffect, useState } from "react";
import API from "../utils/api";

const RADIUS_OPTIONS = [
  { label: "5 km", value: 5000 },
  { label: "10 km", value: 10000 },
  { label: "20 km", value: 20000 },
];

export default function SafetyAlert({ location }) {
  const [alertInfo, setAlertInfo] = useState(null);
  const [selectedRadius, setSelectedRadius] = useState(5000);

  useEffect(() => {
    if (!location) return;

    const fetchRisk = async () => {
      try {
        const res = await API.get(
          `/crimes/risk-level?lat=${location.lat}&lng=${location.lng}&radius=${selectedRadius}`
        );
        setAlertInfo(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch risk data:", err);
      }
    };

    fetchRisk();

    // Auto refresh every 60 seconds
    const interval = setInterval(fetchRisk, 60000);
    return () => clearInterval(interval);
  }, [location, selectedRadius]);

  if (!alertInfo) return null;

  const theme = {
    safe: {
      bg: "bg-green-600",
      text: alertInfo.alertMessage || "You are currently in a low-risk area. Stay aware and safe. 🟢",
    },
    moderate: {
      bg: "bg-yellow-500",
      text: alertInfo.alertMessage || "⚠ Moderate crime activity nearby. Stay alert.",
    },
    high: {
      bg: "bg-red-600 animate-pulse",
      text: alertInfo.alertMessage || "🚨 HIGH RISK: Crime cluster detected near you. Avoid isolated areas!",
    },
  };

  return (
    <div
      className={`${theme[alertInfo.risk].bg} text-white p-3 sm:p-4 rounded-xl mt-3 sm:mt-4 shadow-md sm:shadow-xl transition-all text-sm sm:text-base`}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {RADIUS_OPTIONS.map((option) => {
          const active = selectedRadius === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedRadius(option.value)}
              className={`px-3 py-1 rounded-full border text-xs sm:text-sm transition-colors ${
                active
                  ? "bg-white text-gray-900 border-white"
                  : "bg-white/10 text-white border-white/30 hover:bg-white/20"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <h2 className="font-semibold sm:font-bold text-base sm:text-lg mb-1">
        {theme[alertInfo.risk].text}
      </h2>
      <p className="opacity-90 text-xs sm:text-sm">
        {alertInfo.crimeCount} crime incidents in the last {alertInfo.timeWindowDays || 7} days within {alertInfo.radiusKm || selectedRadius / 1000} km.
      </p>
      <p className="opacity-90 text-xs sm:text-sm mt-1">
        Overall score: {alertInfo.overallScore}.
        {alertInfo.dominantCategoryLabel
          ? ` Dominant category: ${alertInfo.dominantCategoryLabel} (${Math.round((alertInfo.dominantCategoryShare || 0) * 100)}%).`
          : ""}
      </p>
    </div>
  );
}
