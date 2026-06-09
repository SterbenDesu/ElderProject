// Map pin placement for the marketplace results map.
//
// THE PROBLEM: caregivers serve whole Sofia *districts* (regions), never a
// precise home address — and we deliberately never expose a precise address on
// a public surface (privacy + the one-way rule). So we have no exact lat/lng to
// pin. We only know which district(s) a caregiver serves.
//
// THE APPROACH:
//   1. Pick ONE anchor district per caregiver:
//        - if a district is being searched and the caregiver serves it (or
//          covers the whole city), anchor on the SEARCHED district — so pins
//          cluster where the elder is actually looking;
//        - otherwise anchor on the caregiver's first served district;
//        - a whole-city caregiver with no search anchors on Sofia centre.
//   2. Look up that district's APPROXIMATE centroid from the static
//      SOFIA_DISTRICTS table (slug-keyed, kept in lock-step with regions.slug).
//   3. Add a small DETERMINISTIC offset derived from a hash of the caregiver id,
//      so several caregivers in the same district fan out into a readable little
//      cluster instead of stacking on one exact point — and, because the offset
//      is a pure function of the id, a caregiver's pin never jumps around
//      between renders, hovers, or re-sorts.
//
// The offset is intentionally tiny (a few hundred metres) so a pin always stays
// inside the district it represents. These are never real home locations.

import {
  SOFIA_DISTRICTS,
  type LatLng,
} from "@/lib/maps/sofiaDistricts";

const SOFIA_CENTER: LatLng = { lat: 42.6977, lng: 23.3219 };

const centerBySlug = new Map<string, LatLng>(
  SOFIA_DISTRICTS.map((district) => [district.slug, district.center]),
);

/** Approximate centroid for a district slug (Sofia centre as a safe fallback). */
export function centroidForSlug(slug: string | null | undefined): LatLng {
  return (slug ? centerBySlug.get(slug) : undefined) ?? SOFIA_CENTER;
}

// Small, stable string hash (FNV-1a) → a 32-bit unsigned int.
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Maximum scatter radius in degrees (~0.0045° ≈ 350–400 m at Sofia's latitude).
const OFFSET_RADIUS = 0.0045;

/**
 * Deterministic in-district scatter for a caregiver id. Returns a small lat/lng
 * delta on a spiral so pins in the same district spread out predictably.
 */
function deterministicOffset(seed: string): LatLng {
  const hash = hashString(seed);
  // Decompose the hash into an angle and a normalised radius.
  const angle = (hash % 360) * (Math.PI / 180);
  const radius = (((hash >>> 9) % 1000) / 1000) * OFFSET_RADIUS;
  return {
    lat: Math.sin(angle) * radius,
    lng: Math.cos(angle) * radius,
  };
}

export type PinnableCaregiver = {
  id: string;
  covers_whole_city: boolean;
  /** Served district slugs (empty when only covers_whole_city). */
  regionSlugs: string[];
};

/**
 * Resolve the map position for one caregiver, given the optionally-searched
 * district slug. Coordinates are district-centroid + a stable per-caregiver
 * offset — approximate by design, never a real address.
 */
export function pinPositionFor(
  caregiver: PinnableCaregiver,
  searchedSlug: string | null,
): LatLng {
  let anchorSlug: string | null = null;

  if (
    searchedSlug &&
    (caregiver.covers_whole_city || caregiver.regionSlugs.includes(searchedSlug))
  ) {
    anchorSlug = searchedSlug;
  } else if (caregiver.regionSlugs.length > 0) {
    anchorSlug = caregiver.regionSlugs[0];
  } else if (caregiver.covers_whole_city && searchedSlug) {
    anchorSlug = searchedSlug;
  }

  const base = centroidForSlug(anchorSlug);
  const offset = deterministicOffset(caregiver.id);
  return { lat: base.lat + offset.lat, lng: base.lng + offset.lng };
}

/** Squared planar distance — fine for ranking "nearest" caregivers. */
export function distanceSq(a: LatLng, b: LatLng): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

export { SOFIA_CENTER };
