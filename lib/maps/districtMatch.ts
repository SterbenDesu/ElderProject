// Standalone district-matching utility.
//
// Given a lat/lng coordinate, return the matching Sofia district from the
// `regions` table. This is intentionally framework-agnostic and importable on
// its own so the Phase 5 marketplace filter can reuse the exact same logic.
//
// Strategy (in order):
//   1. NAME MATCH — reverse geocode the point with the Google Geocoder, read the
//      sublocality / neighbourhood / district name from the address components,
//      and match that name (Latin or Cyrillic) against the regions list.
//   2. BOUNDING-BOX FALLBACK — if no name matches, pick the district whose
//      approximate bounding box best contains the point (see sofiaDistricts.ts).
//   3. If the point is outside the greater-Sofia envelope, return null so the
//      caller can show the friendly "we currently serve Sofia" message.

import {
  SOFIA_BOUNDS,
  isWithinBounds,
  slugForCoordsByBounds,
  slugForName,
  type LatLng,
} from "@/lib/maps/sofiaDistricts";

/** Minimal shape of a `regions` row needed for matching. */
export type MatchableRegion = {
  id: string;
  name: string;
  slug: string;
};

export type DistrictMatch = {
  region: MatchableRegion;
  /** How the match was found — useful for debugging/telemetry. */
  method: "name" | "bbox";
};

/** True when the coordinate falls inside the greater-Sofia envelope. */
export function isWithinSofia(coords: LatLng): boolean {
  return isWithinBounds(coords, SOFIA_BOUNDS);
}

// Address-component types, most specific first, that can carry a district or
// neighbourhood name in Sofia.
const NAME_COMPONENT_TYPES = [
  "sublocality_level_1",
  "sublocality",
  "neighborhood",
  "administrative_area_level_3",
  "administrative_area_level_2",
  "political",
];

/**
 * Reverse geocode a point and return candidate place names (long + short),
 * ordered from most specific to least. Never throws — returns [] on failure.
 */
async function reverseGeocodeNames(
  geocoder: google.maps.Geocoder,
  coords: LatLng,
): Promise<string[]> {
  try {
    const response = await geocoder.geocode({
      location: coords,
      // Latin transliterations line up with the regions seed; Cyrillic
      // variants are still covered by the alias table as a safety net.
      language: "en",
    });

    const names: string[] = [];
    for (const result of response.results) {
      for (const type of NAME_COMPONENT_TYPES) {
        for (const component of result.address_components) {
          if (component.types.includes(type)) {
            names.push(component.long_name);
            if (component.short_name !== component.long_name) {
              names.push(component.short_name);
            }
          }
        }
      }
    }
    return names;
  } catch {
    return [];
  }
}

/**
 * Match a coordinate to a Sofia district from the provided regions list.
 *
 * @param coords   The selected address coordinate.
 * @param regions  Active rows from the `regions` table ({ id, name, slug }).
 * @param geocoder Optional Google Geocoder. When omitted, only the
 *                 bounding-box fallback runs (handy for tests / no-network).
 * @returns The matched region (+ how it matched), or null if outside Sofia.
 */
export async function matchSofiaDistrict(
  coords: LatLng,
  regions: MatchableRegion[],
  geocoder?: google.maps.Geocoder,
): Promise<DistrictMatch | null> {
  if (!isWithinSofia(coords)) {
    return null;
  }

  const bySlug = new Map(regions.map((region) => [region.slug, region]));

  // 1. Name match via reverse geocode.
  if (geocoder) {
    const candidateNames = await reverseGeocodeNames(geocoder, coords);
    for (const name of candidateNames) {
      const slug = slugForName(name);
      if (slug) {
        const region = bySlug.get(slug);
        if (region) {
          return { region, method: "name" };
        }
      }
    }
  }

  // 2. Bounding-box fallback (only consider districts that exist as regions).
  const fallbackSlug = slugForCoordsByBounds(coords);
  if (fallbackSlug) {
    const region = bySlug.get(fallbackSlug);
    if (region) {
      return { region, method: "bbox" };
    }
  }

  // 3. Inside Sofia but we somehow have no matching active region row.
  return null;
}
