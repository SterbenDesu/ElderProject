"use client";

// The marketplace results map (right-hand column / mobile full-screen).
//
// One Google Map with a warm-green "price pin" per caregiver in the current
// result set — à la buddyguard.bg. Pins use AdvancedMarkerElement (NOT the
// deprecated Marker class) and the SINGLE shared Maps loader (lib/maps/loader),
// so Maps is never loaded twice.
//
// Pin positions come from lib/maps/pinPlacement: a district centroid plus a
// small deterministic per-caregiver offset (caregivers serve districts, not
// addresses — see that file for the full rationale).
//
// Card ↔ pin linking: hovering / selecting a caregiver enlarges and recolours
// their pin (driven by hoveredId / selectedId props); hovering or clicking a pin
// calls back up (onHover / onSelect) so the matching card highlights and scrolls
// into view.

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getGoogleMapsMapId, loadGoogleMaps } from "@/lib/maps/loader";
import type { LatLng } from "@/lib/maps/sofiaDistricts";

export type MapPinData = {
  id: string;
  position: LatLng;
  priceLabel: string;
};

const DEFAULT_ZOOM = 12;

export function MarketplaceMap({
  pins,
  center,
  hoveredId,
  selectedId,
  /** Toggled true when the mobile full-screen map opens, so we can resize. */
  mobileOpen,
  onHover,
  onSelect,
}: {
  pins: MapPinData[];
  center: LatLng;
  hoveredId: string | null;
  selectedId: string | null;
  mobileOpen: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<
    Map<string, { marker: google.maps.marker.AdvancedMarkerElement; el: HTMLElement }>
  >(new Map());

  // Latest callbacks, so the once-attached pin listeners never go stale.
  const onHoverRef = useRef(onHover);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onHoverRef.current = onHover;
    onSelectRef.current = onSelect;
  });

  const didInitRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // --- Init the map once -----------------------------------------------------
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    let isMounted = true;

    (async () => {
      try {
        await loadGoogleMaps();
      } catch {
        if (isMounted) setStatus("error");
        return;
      }
      if (!isMounted || !mapContainerRef.current) return;

      mapRef.current = new google.maps.Map(mapContainerRef.current, {
        center,
        zoom: DEFAULT_ZOOM,
        mapId: getGoogleMapsMapId(),
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: "greedy",
      });

      setStatus("ready");
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- (Re)build markers whenever the pin set changes ------------------------
  // Signature keyed on id+position+label so hover/select changes don't rebuild.
  const pinsSignature = pins
    .map((pin) => `${pin.id}:${pin.position.lat.toFixed(5)},${pin.position.lng.toFixed(5)}:${pin.priceLabel}`)
    .join("|");

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers.
    for (const { marker } of markersRef.current.values()) {
      marker.map = null;
    }
    markersRef.current.clear();

    const bounds = new google.maps.LatLngBounds();

    for (const pin of pins) {
      const el = document.createElement("div");
      el.className = "vnuk-price-pin";
      el.textContent = pin.priceLabel;

      el.addEventListener("mouseenter", () => onHoverRef.current(pin.id));
      el.addEventListener("mouseleave", () => onHoverRef.current(null));
      el.addEventListener("click", () => onSelectRef.current(pin.id));

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: pin.position,
        content: el,
        gmpClickable: true,
      });

      markersRef.current.set(pin.id, { marker, el });
      bounds.extend(pin.position);
    }

    if (pins.length > 1) {
      map.fitBounds(bounds, 64);
    } else if (pins.length === 1) {
      map.setCenter(pins[0].position);
      map.setZoom(14);
    } else {
      map.setCenter(center);
      map.setZoom(DEFAULT_ZOOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pinsSignature]);

  // --- Highlight the hovered / selected pin ----------------------------------
  useEffect(() => {
    if (status !== "ready") return;
    const activeId = hoveredId ?? selectedId;

    for (const [id, { marker, el }] of markersRef.current.entries()) {
      const isActive = id === activeId;
      el.dataset.state = isActive ? "active" : "idle";
      marker.zIndex = isActive ? 999 : 1;
    }

    // Bring the selected pin into view (e.g. after a card hover/click).
    if (selectedId && mapRef.current) {
      const entry = markersRef.current.get(selectedId);
      if (entry?.marker.position) {
        mapRef.current.panTo(entry.marker.position);
      }
    }
  }, [status, hoveredId, selectedId]);

  // --- Mobile full-screen open needs a resize nudge --------------------------
  useEffect(() => {
    if (!mobileOpen || status !== "ready" || !mapRef.current) return;
    google.maps.event.trigger(mapRef.current, "resize");
    mapRef.current.setCenter(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen, status]);

  return (
    <div className="relative size-full">
      {/* Pin styling. .vnuk-price-pin lives in the map's overlay DOM (outside the
          React tree), so the rule is global by design. */}
      <style>{`
        .vnuk-price-pin {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 11px;
          border-radius: 9999px;
          background: #ffffff;
          color: #1B4332;
          font-family: var(--font-source-sans), ui-sans-serif, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.01em;
          white-space: nowrap;
          border: 1.5px solid #2D6A4F;
          box-shadow: 0 4px 12px -4px rgba(27, 42, 35, 0.4);
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .vnuk-price-pin:hover,
        .vnuk-price-pin[data-state="active"] {
          background: #2D6A4F;
          color: #ffffff;
          transform: scale(1.18);
          box-shadow: 0 8px 20px -4px rgba(27, 42, 35, 0.55);
        }
      `}</style>

      <div
        ref={mapContainerRef}
        role="application"
        aria-label={t("Map of caregivers in Sofia")}
        className="size-full bg-linen"
      />

      {status === "loading" ? (
        <div
          className="absolute inset-0 grid place-items-center bg-linen/70 text-sm font-semibold text-warmgrey"
          role="status"
        >
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {t("Loading map…")}
          </span>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-linen p-6 text-center">
          <p className="flex max-w-xs flex-col items-center gap-2 text-sm font-semibold text-warmgrey">
            <MapPin className="size-6 text-moss" aria-hidden="true" />
            {t("The map is unavailable right now. You can still browse the list of caregivers.")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
