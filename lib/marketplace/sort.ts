// Marketplace sort options — shared between the Sort dropdown and the list
// ordering. The chosen value lives in the URL (?sort=...) via the criteria
// model, so re-ordering is shareable and survives a refresh / the auth gate.

import type { MarketplaceSort } from "@/lib/marketplace/criteria";

export type SortOption = {
  value: MarketplaceSort;
  /** English label (the i18n key). */
  label: string;
};

// "Reviews" is the default (most-reviewed, most-trusted first). Proximity is
// only meaningful once the elder has chosen an address (lat/lng in the URL);
// the dropdown disables it otherwise.
export const SORT_OPTIONS: SortOption[] = [
  { value: "reviews", label: "Most reviews" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "proximity", label: "Nearest first" },
];

export function sortOptionLabel(value: MarketplaceSort): string {
  return SORT_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
