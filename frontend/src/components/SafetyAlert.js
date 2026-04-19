import { useEffect, useState } from "react";
import API from "../utils/api";

export default function SafetyAlert({ location }) {
  const [alertInfo, setAlertInfo] = useState(null);

  useEffect(() => {
    if (!location) return;

    const fetchRisk = async () => {
      try {
        const res = await API.get(
          `/crimes/risk-level?lat=${location.lat}&lng=${location.lng}`
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
  }, [location]);

  if (!alertInfo) return null;

  const theme = {
    safe: {
      bg: "bg-green-600",
      text: "You are currently in a low-risk area. Stay aware and safe. 🟢",
    },
    moderate: {
      bg: "bg-yellow-500",
      text: "⚠ Moderate crime activity nearby. Stay alert.",
    },
    high: {
      bg: "bg-red-600 animate-pulse",
      text: "🚨 HIGH RISK: Crime cluster detected near you. Avoid isolated areas!",
    },
  };

  return (
    <div
      className={`${theme[alertInfo.risk].bg} text-white p-3 sm:p-4 rounded-xl mt-3 sm:mt-4 shadow-md sm:shadow-xl transition-all text-sm sm:text-base`}
    >
      <h2 className="font-semibold sm:font-bold text-base sm:text-lg mb-1">
        {theme[alertInfo.risk].text}
      </h2>
      <p className="opacity-90 text-xs sm:text-sm">
        {alertInfo.crimeCount} crime incidents detected within 1 km.
      </p>
    </div>
  );
}
