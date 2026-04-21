import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { X } from "lucide-react";

let leafletIconsPatched = false;
function ensureLeafletIcons() {
  if (leafletIconsPatched) return;
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
  leafletIconsPatched = true;
}

function InvalidateSize({ active }) {
  const map = useMap();
  useEffect(() => {
    const ms = active ? 220 : 80;
    const id = window.setTimeout(() => map.invalidateSize(), ms);
    return () => window.clearTimeout(id);
  }, [map, active]);
  return null;
}

function parseCoords(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const valid =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
  return valid ? { lat, lng } : null;
}

export default function TipLocationPreview({ latitude, longitude, title }) {
  ensureLeafletIcons();
  const [expanded, setExpanded] = useState(false);
  const coords = parseCoords(latitude, longitude);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  if (!coords) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        No valid coordinates were stored for this tip.
      </div>
    );
  }

  const { lat, lng } = coords;
  const label = title?.trim() || "Tip location";

  return (
    <>
      <div className="mt-1">
        <h4 className="text-lg font-semibold text-gray-800 mb-1">Tip location</h4>
        <p className="text-xs text-gray-500 mb-2">
          Map shows where the tip was reported. Open full view for precise placement.
        </p>
        <div className="relative w-full max-w-md rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <MapContainer
            center={[lat, lng]}
            zoom={15}
            style={{ height: 176, width: "100%" }}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            zoomControl={false}
          >
            <InvalidateSize active={false} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[lat, lng]}>
              <Popup>{label}</Popup>
            </Marker>
          </MapContainer>
          <button
            type="button"
            className="absolute inset-0 z-[400] flex items-start justify-start bg-transparent p-2 text-left hover:bg-black/5 transition-colors"
            onClick={() => setExpanded(true)}
            aria-label="Expand map to full screen"
          >
            <span className="rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white shadow">
              Click map to expand
            </span>
          </button>
        </div>
        <p className="mt-2 text-xs font-mono text-gray-500">
          {lat.toFixed(6)}, {lng.toFixed(6)}
        </p>
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3 sm:p-6"
          onClick={() => setExpanded(false)}
          role="presentation"
        >
          <div
            className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Tip location map"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Tip location</p>
                <p className="text-xs font-mono text-gray-500">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close map"
                onClick={() => setExpanded(false)}
              >
                <X size={22} />
              </button>
            </div>
            <div className="relative h-[min(72vh,640px)] w-full sm:h-[min(78vh,720px)]">
              <MapContainer
                center={[lat, lng]}
                zoom={17}
                style={{ height: "100%", width: "100%" }}
                scrollWheelZoom
              >
                <InvalidateSize active={expanded} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[lat, lng]}>
                  <Popup>{label}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <p className="border-t border-gray-200 px-4 py-2 text-center text-xs text-gray-500">
              Click outside the map or press Escape to close
            </p>
          </div>
        </div>
      )}
    </>
  );
}
