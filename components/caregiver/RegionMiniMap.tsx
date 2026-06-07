"use client";

// A tiny, dependency-free position indicator for a Sofia district: a soft
// rounded outline of the city with a single dot showing roughly where the
// district sits. No map tiles, no Google Maps call — it just reads the static
// district centroids and projects them into the SVG viewBox. Lightweight by
// design (the dashboard does not need a full interactive map here).

import {
  SOFIA_BOUNDS,
  SOFIA_DISTRICTS,
  type LatLng,
} from "@/lib/maps/sofiaDistricts";

const centerBySlug = new Map<string, LatLng>(
  SOFIA_DISTRICTS.map((district) => [district.slug, district.center]),
);

/** Project a lat/lng into a 0–100 viewBox coordinate within the Sofia envelope. */
function project(center: LatLng): { x: number; y: number } {
  const { south, north, west, east } = SOFIA_BOUNDS;
  const x = ((center.lng - west) / (east - west)) * 100;
  // SVG y grows downward, so invert latitude.
  const y = ((north - center.lat) / (north - south)) * 100;
  return { x, y };
}

export function RegionMiniMap({
  slug,
  active = false,
  className = "size-9",
}: {
  slug: string;
  active?: boolean;
  className?: string;
}) {
  const center = centerBySlug.get(slug);
  const point = center ? project(center) : null;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-hidden="true"
      fill="none"
    >
      {/* Soft Sofia outline blob. */}
      <path
        d="M50 8 C68 8 86 18 90 38 C94 56 84 74 66 86 C52 95 36 94 22 84 C8 74 4 56 10 38 C16 20 32 8 50 8 Z"
        className={active ? "fill-white/25 stroke-white/70" : "fill-linen stroke-sand"}
        strokeWidth={4}
      />
      {point ? (
        <circle
          cx={point.x}
          cy={point.y}
          r={9}
          className={active ? "fill-white" : "fill-terracotta"}
        />
      ) : null}
    </svg>
  );
}
