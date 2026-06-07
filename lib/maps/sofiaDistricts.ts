// Static geography for Sofia's 24 administrative districts (rayoni).
//
// This is the fallback knowledge the district-matching utility uses when a
// Google reverse-geocode does not yield a usable neighbourhood name. The
// `slug` values here are kept in lock-step with the `regions` seed in
// SUPABASE_SETUP.sql, so a match here maps cleanly onto a real `regions` row.
//
// Coordinates are APPROXIMATE district centroids, and each bounding box is a
// rough rectangle around that centroid — good enough for "which district is
// this point in" fallback matching and for drawing a small position dot on the
// Sofia outline in the caregiver dashboard. They are not legal boundaries.

export type LatLng = { lat: number; lng: number };

export type Bounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type SofiaDistrict = {
  /** Matches regions.slug in the database. */
  slug: string;
  /** Matches regions.name in the database (Latin transliteration). */
  name: string;
  /** Approximate centroid. */
  center: LatLng;
  /** Approximate bounding box around the centroid. */
  bounds: Bounds;
  /**
   * Name variants Google may return for this district (Latin + Cyrillic +
   * common spellings). Used to match a reverse-geocoded name to this slug.
   */
  aliases: string[];
};

/** Build a bounding box from a centroid and a half-extent (degrees). */
function box(lat: number, lng: number, ext: number): Bounds {
  return { south: lat - ext, north: lat + ext, west: lng - ext, east: lng + ext };
}

// Overall greater-Sofia municipality envelope. A point outside this box is
// treated as "not Sofia" and gets the friendly out-of-area message.
export const SOFIA_BOUNDS: Bounds = {
  south: 42.53,
  west: 23.1,
  north: 42.85,
  east: 23.52,
};

export const SOFIA_DISTRICTS: SofiaDistrict[] = [
  {
    slug: "sredets",
    name: "Sredets",
    center: { lat: 42.69, lng: 23.32 },
    bounds: box(42.69, 23.32, 0.016),
    aliases: ["Sredets", "Средец"],
  },
  {
    slug: "krasno-selo",
    name: "Krasno selo",
    center: { lat: 42.68, lng: 23.29 },
    bounds: box(42.68, 23.29, 0.022),
    aliases: ["Krasno selo", "Красно село"],
  },
  {
    slug: "vazrazhdane",
    name: "Vazrazhdane",
    center: { lat: 42.701, lng: 23.31 },
    bounds: box(42.701, 23.31, 0.016),
    aliases: ["Vazrazhdane", "Vŭzrazhdane", "Възраждане"],
  },
  {
    slug: "oborishte",
    name: "Oborishte",
    center: { lat: 42.701, lng: 23.345 },
    bounds: box(42.701, 23.345, 0.016),
    aliases: ["Oborishte", "Оборище"],
  },
  {
    slug: "serdika",
    name: "Serdika",
    center: { lat: 42.717, lng: 23.32 },
    bounds: box(42.717, 23.32, 0.024),
    aliases: ["Serdika", "Сердика"],
  },
  {
    slug: "poduyane",
    name: "Poduyane",
    center: { lat: 42.715, lng: 23.36 },
    bounds: box(42.715, 23.36, 0.022),
    aliases: ["Poduyane", "Poduene", "Подуяне"],
  },
  {
    slug: "slatina",
    name: "Slatina",
    center: { lat: 42.69, lng: 23.36 },
    bounds: box(42.69, 23.36, 0.022),
    aliases: ["Slatina", "Слатина"],
  },
  {
    slug: "izgrev",
    name: "Izgrev",
    center: { lat: 42.666, lng: 23.355 },
    bounds: box(42.666, 23.355, 0.016),
    aliases: ["Izgrev", "Изгрев"],
  },
  {
    slug: "lozenets",
    name: "Lozenets",
    center: { lat: 42.667, lng: 23.33 },
    bounds: box(42.667, 23.33, 0.02),
    aliases: ["Lozenets", "Лозенец"],
  },
  {
    slug: "triaditsa",
    name: "Triaditsa",
    center: { lat: 42.675, lng: 23.315 },
    bounds: box(42.675, 23.315, 0.02),
    aliases: ["Triaditsa", "Триадица"],
  },
  {
    slug: "krasna-polyana",
    name: "Krasna polyana",
    center: { lat: 42.699, lng: 23.28 },
    bounds: box(42.699, 23.28, 0.02),
    aliases: ["Krasna polyana", "Красна поляна"],
  },
  {
    slug: "ilinden",
    name: "Ilinden",
    center: { lat: 42.71, lng: 23.292 },
    bounds: box(42.71, 23.292, 0.018),
    aliases: ["Ilinden", "Илинден"],
  },
  {
    slug: "nadezhda",
    name: "Nadezhda",
    center: { lat: 42.728, lng: 23.3 },
    bounds: box(42.728, 23.3, 0.026),
    aliases: ["Nadezhda", "Надежда"],
  },
  {
    slug: "iskar",
    name: "Iskar",
    center: { lat: 42.69, lng: 23.405 },
    bounds: box(42.69, 23.405, 0.03),
    aliases: ["Iskar", "Iskur", "Iskŭr", "Искър"],
  },
  {
    slug: "mladost",
    name: "Mladost",
    center: { lat: 42.655, lng: 23.378 },
    bounds: box(42.655, 23.378, 0.026),
    aliases: ["Mladost", "Младост"],
  },
  {
    slug: "studentski",
    name: "Studentski",
    center: { lat: 42.65, lng: 23.345 },
    bounds: box(42.65, 23.345, 0.024),
    aliases: ["Studentski", "Studentski grad", "Студентски", "Студентски град"],
  },
  {
    slug: "vitosha",
    name: "Vitosha",
    center: { lat: 42.64, lng: 23.3 },
    bounds: box(42.64, 23.3, 0.045),
    aliases: ["Vitosha", "Витоша"],
  },
  {
    slug: "ovcha-kupel",
    name: "Ovcha kupel",
    center: { lat: 42.678, lng: 23.25 },
    bounds: box(42.678, 23.25, 0.03),
    aliases: ["Ovcha kupel", "Овча купел"],
  },
  {
    slug: "lyulin",
    name: "Lyulin",
    center: { lat: 42.72, lng: 23.245 },
    bounds: box(42.72, 23.245, 0.03),
    aliases: ["Lyulin", "Люлин"],
  },
  {
    slug: "vrabnitsa",
    name: "Vrabnitsa",
    center: { lat: 42.733, lng: 23.27 },
    bounds: box(42.733, 23.27, 0.03),
    aliases: ["Vrabnitsa", "Vrŭbnitsa", "Връбница"],
  },
  {
    slug: "novi-iskar",
    name: "Novi Iskar",
    center: { lat: 42.81, lng: 23.345 },
    bounds: box(42.81, 23.345, 0.05),
    aliases: ["Novi Iskar", "Novi Iskur", "Нови Искър"],
  },
  {
    slug: "kremikovtsi",
    name: "Kremikovtsi",
    center: { lat: 42.76, lng: 23.49 },
    bounds: box(42.76, 23.49, 0.055),
    aliases: ["Kremikovtsi", "Кремиковци"],
  },
  {
    slug: "pancharevo",
    name: "Pancharevo",
    center: { lat: 42.585, lng: 23.41 },
    bounds: box(42.585, 23.41, 0.06),
    aliases: ["Pancharevo", "Панчарево"],
  },
  {
    slug: "bankya",
    name: "Bankya",
    center: { lat: 42.708, lng: 23.145 },
    bounds: box(42.708, 23.145, 0.04),
    aliases: ["Bankya", "Банкя"],
  },
];

/** Normalise a place name for tolerant matching (case/diacritic/spacing-insensitive). */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "");
}

// Lookup from a normalised name variant → district slug.
const aliasToSlug: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const district of SOFIA_DISTRICTS) {
    map.set(normalizeName(district.slug), district.slug);
    map.set(normalizeName(district.name), district.slug);
    for (const alias of district.aliases) {
      map.set(normalizeName(alias), district.slug);
    }
  }
  return map;
})();

/** Resolve a (possibly localized) place name to a Sofia district slug, or null. */
export function slugForName(name: string): string | null {
  return aliasToSlug.get(normalizeName(name)) ?? null;
}

/** True when a point falls inside the greater-Sofia envelope. */
export function isWithinBounds(coords: LatLng, bounds: Bounds): boolean {
  return (
    coords.lat >= bounds.south &&
    coords.lat <= bounds.north &&
    coords.lng >= bounds.west &&
    coords.lng <= bounds.east
  );
}

/** Squared planar distance between two points (good enough for ranking). */
function distanceSq(a: LatLng, b: LatLng): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
}

/**
 * Bounding-box fallback: return the district slug whose box best fits the point.
 * Prefers districts whose box actually contains the point (nearest centroid wins
 * ties); otherwise falls back to the nearest centroid overall.
 */
export function slugForCoordsByBounds(coords: LatLng): string | null {
  let containing: SofiaDistrict | null = null;
  let containingDist = Infinity;
  let nearest: SofiaDistrict | null = null;
  let nearestDist = Infinity;

  for (const district of SOFIA_DISTRICTS) {
    const d = distanceSq(coords, district.center);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = district;
    }
    if (isWithinBounds(coords, district.bounds) && d < containingDist) {
      containingDist = d;
      containing = district;
    }
  }

  return (containing ?? nearest)?.slug ?? null;
}
