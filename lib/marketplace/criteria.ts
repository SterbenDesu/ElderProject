// Shared marketplace search-criteria model.
//
// One source of truth for the URL query the home search widget produces and the
// marketplace (/helpers) reads. Keeping parse + build together guarantees the
// criteria survive a refresh, a chip edit, AND the login/signup round-trip
// (returnTo simply carries the same query string).
//
// URL param structure (all optional, all human-readable):
//   services      comma-separated service slugs, e.g. "shopping,companionship"
//   district      regions.id  (the matched Sofia district — the real filter key)
//   districtName  the district's display name (so chips render without a lookup)
//   regionSlug    the district slug (readable / future deep-links)
//   address       full formatted address (display only)
//   lat, lng      chosen coordinates (kept for later proximity sorting)
//   startDate     "YYYY-MM-DD"
//   endDate       "YYYY-MM-DD"  (single-date searches set startDate only)
//   sort          "reviews" | "price-asc" | "price-desc" | "proximity"
//   priceMax      max "from" price in лв. (whole number), e.g. "30"
//   verified      "1" when the verified-only toggle is on
//   volunteer     "1" when the volunteer-only toggle is on
//
// The refinement filters (priceMax / verified / volunteer) and the sort are
// applied CLIENT-SIDE over the already-RLS-filtered result set. The marketplace
// list is small enough per district that this needs no extra DB column or index;
// it keeps every query reading only safe, public caregiver columns.

export type MarketplaceSort = "reviews" | "price-asc" | "price-desc" | "proximity";

export const defaultSort: MarketplaceSort = "reviews";

export type MarketplaceCriteria = {
  services: string[];
  /** regions.id — the district filter the query matches against. */
  district: string;
  districtName: string;
  regionSlug: string;
  address: string;
  lat: string;
  lng: string;
  startDate: string;
  endDate: string;
  sort: MarketplaceSort;
  /** Max "from" price in лв. (whole leva). Empty = no cap. */
  priceMax: string;
  verifiedOnly: boolean;
  volunteerOnly: boolean;
};

export const emptyCriteria: MarketplaceCriteria = {
  services: [],
  district: "",
  districtName: "",
  regionSlug: "",
  address: "",
  lat: "",
  lng: "",
  startDate: "",
  endDate: "",
  sort: defaultSort,
  priceMax: "",
  verifiedOnly: false,
  volunteerOnly: false,
};

function parseSort(value: string | null): MarketplaceSort {
  return value === "price-asc" ||
    value === "price-desc" ||
    value === "proximity" ||
    value === "reviews"
    ? value
    : defaultSort;
}

type ReadableParams = { get: (key: string) => string | null };

export function parseCriteria(params: ReadableParams): MarketplaceCriteria {
  return {
    // Accept both "services" (current) and the legacy singular "service".
    services: (params.get("services") || params.get("service") || "")
      .split(",")
      .map((service) => service.trim())
      .filter(Boolean),
    district: params.get("district")?.trim() ?? "",
    districtName: params.get("districtName")?.trim() ?? "",
    regionSlug: params.get("regionSlug")?.trim() ?? "",
    address: params.get("address")?.trim() ?? "",
    lat: params.get("lat")?.trim() ?? "",
    lng: params.get("lng")?.trim() ?? "",
    startDate: params.get("startDate")?.trim() ?? "",
    endDate: params.get("endDate")?.trim() ?? "",
    sort: parseSort(params.get("sort")),
    priceMax: params.get("priceMax")?.trim() ?? "",
    verifiedOnly: params.get("verified") === "1",
    volunteerOnly: params.get("volunteer") === "1",
  };
}

/** Serialise criteria back to a clean query string (omitting empty values). */
export function buildCriteriaQuery(criteria: MarketplaceCriteria): string {
  const query = new URLSearchParams();

  if (criteria.services.length > 0) {
    query.set("services", criteria.services.join(","));
  }
  if (criteria.district) {
    query.set("district", criteria.district);
  }
  if (criteria.districtName) {
    query.set("districtName", criteria.districtName);
  }
  if (criteria.regionSlug) {
    query.set("regionSlug", criteria.regionSlug);
  }
  if (criteria.address) {
    query.set("address", criteria.address);
  }
  if (criteria.lat) {
    query.set("lat", criteria.lat);
  }
  if (criteria.lng) {
    query.set("lng", criteria.lng);
  }
  if (criteria.startDate) {
    query.set("startDate", criteria.startDate);
  }
  if (criteria.endDate) {
    query.set("endDate", criteria.endDate);
  }
  // Only persist a non-default sort so default URLs stay clean and shareable.
  if (criteria.sort && criteria.sort !== defaultSort) {
    query.set("sort", criteria.sort);
  }
  if (criteria.priceMax) {
    query.set("priceMax", criteria.priceMax);
  }
  if (criteria.verifiedOnly) {
    query.set("verified", "1");
  }
  if (criteria.volunteerOnly) {
    query.set("volunteer", "1");
  }

  return query.toString();
}

export function hasAnyCriteria(criteria: MarketplaceCriteria): boolean {
  return Boolean(
    criteria.services.length > 0 ||
      criteria.district ||
      criteria.districtName ||
      criteria.address ||
      criteria.startDate ||
      criteria.endDate ||
      criteria.priceMax ||
      criteria.verifiedOnly ||
      criteria.volunteerOnly,
  );
}

/** True when something that actually narrows the result list is set. */
export function hasActiveFilters(criteria: MarketplaceCriteria): boolean {
  return Boolean(
    criteria.services.length > 0 ||
      criteria.district ||
      criteria.priceMax ||
      criteria.verifiedOnly ||
      criteria.volunteerOnly,
  );
}
