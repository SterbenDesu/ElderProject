"use client";

// The marketplace results experience: a scrollable list of rich caregiver cards
// on the left and a sticky Google Map with price pins on the right (à la
// buddyguard.bg). On mobile it collapses to the list with a floating "Map"
// toggle that opens a full-screen map.
//
// This component owns the CLIENT-SIDE refinement (price cap / verified-only /
// volunteer-only), the sort order, and the card ↔ pin hover/selection linking.
// The refinement filter VALUES and the sort live in the URL (via the criteria
// model), so the whole view is shareable and survives a refresh + the auth gate.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { List, Map as MapIcon, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  buildCriteriaQuery,
  hasActiveFilters,
  type MarketplaceCriteria,
  type MarketplaceSort,
} from "@/lib/marketplace/criteria";
import {
  centroidForSlug,
  distanceSq,
  pinPositionFor,
  SOFIA_CENTER,
} from "@/lib/maps/pinPlacement";
import { formatLevaAmount } from "@/lib/supabase/caregiverDashboard";
import type { MarketplaceCaregiver } from "@/lib/supabase/marketplace";
import type { RegionRow } from "@/lib/supabase/caregiverDashboard";
import { CaregiverCard } from "@/components/marketplace/CaregiverCard";
import { CaregiverCardSkeleton } from "@/components/marketplace/CaregiverCardSkeleton";
import { MarketplaceMap, type MapPinData } from "@/components/marketplace/MarketplaceMap";
import { SortDropdown } from "@/components/marketplace/SortDropdown";

type ViewStatus = "loading" | "loaded";

export function MarketplaceView({
  status,
  caregivers,
  criteria,
  regions,
  detailHref,
  /** Ids with published availability in the searched dates; null = unknown. */
  availableIds,
}: {
  status: ViewStatus;
  caregivers: MarketplaceCaregiver[];
  criteria: MarketplaceCriteria;
  regions: RegionRow[];
  detailHref: (id: string) => string;
  availableIds: Set<string> | null;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);

  const cardRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

  // The searched district / coordinates (used to anchor pins + sort by distance).
  const searchedSlug =
    criteria.regionSlug ||
    regions.find((region) => region.id === criteria.district)?.slug ||
    null;
  const searchedCoords = useMemo(() => {
    const lat = Number(criteria.lat);
    const lng = Number(criteria.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
      ? { lat, lng }
      : null;
  }, [criteria.lat, criteria.lng]);

  const mapCenter = useMemo(
    () => (searchedSlug ? centroidForSlug(searchedSlug) : SOFIA_CENTER),
    [searchedSlug],
  );

  // --- Client-side refinement (price / verified / volunteer) -----------------
  const priceCapMinor = criteria.priceMax ? Number(criteria.priceMax) * 100 : null;
  const refined = useMemo(() => {
    return caregivers.filter((caregiver) => {
      if (criteria.verifiedOnly && caregiver.badge !== "verified") return false;
      if (criteria.volunteerOnly && caregiver.badge !== "volunteer") return false;
      if (
        priceCapMinor != null &&
        Number.isFinite(priceCapMinor) &&
        (caregiver.lowestPriceMinor == null || caregiver.lowestPriceMinor > priceCapMinor)
      ) {
        return false;
      }
      return true;
    });
  }, [caregivers, criteria.verifiedOnly, criteria.volunteerOnly, priceCapMinor]);

  // --- Pin position per caregiver (district centroid + stable offset) --------
  const positions = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number }>();
    for (const caregiver of refined) {
      map.set(caregiver.id, pinPositionFor(caregiver, searchedSlug));
    }
    return map;
  }, [refined, searchedSlug]);

  // --- Sorting ---------------------------------------------------------------
  const sorted = useMemo(() => {
    const list = [...refined];
    const priceOf = (c: MarketplaceCaregiver) =>
      c.lowestPriceMinor ?? Number.POSITIVE_INFINITY;

    switch (criteria.sort) {
      case "price-asc":
        list.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case "price-desc":
        list.sort(
          (a, b) =>
            (b.lowestPriceMinor ?? Number.NEGATIVE_INFINITY) -
            (a.lowestPriceMinor ?? Number.NEGATIVE_INFINITY),
        );
        break;
      case "proximity":
        if (searchedCoords) {
          list.sort((a, b) => {
            const pa = positions.get(a.id) ?? SOFIA_CENTER;
            const pb = positions.get(b.id) ?? SOFIA_CENTER;
            return distanceSq(pa, searchedCoords) - distanceSq(pb, searchedCoords);
          });
        }
        break;
      case "reviews":
      default:
        list.sort(
          (a, b) =>
            b.rating_count - a.rating_count ||
            (b.rating_avg ?? 0) - (a.rating_avg ?? 0) ||
            a.display_name.localeCompare(b.display_name),
        );
        break;
    }
    return list;
  }, [refined, criteria.sort, searchedCoords, positions]);

  // --- Map pins (price label) ------------------------------------------------
  const pins: MapPinData[] = useMemo(() => {
    return sorted.map((caregiver) => ({
      id: caregiver.id,
      position: positions.get(caregiver.id) ?? mapCenter,
      priceLabel:
        caregiver.lowestPriceMinor != null
          ? `${formatLevaAmount(caregiver.lowestPriceMinor)} ${t("лв.")}`
          : t("Ask"),
    }));
  }, [sorted, positions, mapCenter, t]);

  const datesSelected = Boolean(criteria.startDate || criteria.endDate);

  const setSort = (sort: MarketplaceSort) => {
    const query = buildCriteriaQuery({ ...criteria, sort });
    router.push(query ? `/helpers?${query}` : "/helpers");
  };

  const handleSelectFromPin = useCallback((id: string) => {
    setSelectedId(id);
    setMobileMapOpen(false);
    // Wait a tick for the list to be visible (mobile) before scrolling.
    requestAnimationFrame(() => {
      cardRefs.current.get(id)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, []);

  const activeId = hoveredId ?? selectedId;
  const count = sorted.length;
  const countLabel =
    count === 1
      ? `${count} ${t("caregiver found")}`
      : `${count} ${t("caregivers found")}`;

  const filtered = hasActiveFilters(criteria);

  function clearAll() {
    router.push("/helpers");
  }

  return (
    <div className="mt-6">
      {/* Top bar: count + sort. (Active filter chips render in the filters card
          directly above this, via MarketplaceFilters.) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className="text-sm font-bold uppercase tracking-[0.14em] text-clay"
          role="status"
          aria-live="polite"
        >
          {status === "loading" ? t("Finding caregivers…") : countLabel}
        </p>
        <SortDropdown
          value={criteria.sort}
          canSortByProximity={Boolean(searchedCoords)}
          onChange={setSort}
        />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
        {/* ---- Left: caregiver list ---- */}
        <div>
          {status === "loading" ? (
            <ul className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <li key={index}>
                  <CaregiverCardSkeleton />
                </li>
              ))}
            </ul>
          ) : count === 0 ? (
            <div className="rounded-[2rem] bg-white p-8 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-2xl font-bold text-forest">
                {t("No caregivers match your search yet")}
              </h2>
              <p className="mt-3 max-w-xl leading-7">
                {filtered
                  ? t("Try removing a filter or broadening your search to see more caregivers.")
                  : t("No caregivers are available yet. Check back soon.")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {filtered ? (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
                  >
                    {t("Clear filters and show all caregivers")}
                  </button>
                ) : null}
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-5 py-3 font-semibold text-forest transition hover:bg-sage"
                >
                  {t("Back to homepage")}
                </Link>
              </div>
            </div>
          ) : (
            <ul className="grid gap-4">
              {sorted.map((caregiver) => (
                <li key={caregiver.id}>
                  <CaregiverCard
                    ref={(node) => {
                      if (node) cardRefs.current.set(caregiver.id, node);
                      else cardRefs.current.delete(caregiver.id);
                    }}
                    caregiver={caregiver}
                    detailHref={detailHref(caregiver.id)}
                    highlighted={caregiver.id === activeId}
                    limitedAvailability={
                      datesSelected &&
                      availableIds != null &&
                      !availableIds.has(caregiver.id)
                    }
                    onHover={setHoveredId}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---- Right: sticky map (desktop) / full-screen map (mobile) ---- */}
        <div
          className={`${
            mobileMapOpen
              ? "fixed inset-0 z-40 rounded-none"
              : "hidden"
          } overflow-hidden border border-moss/20 bg-linen shadow-sm lg:sticky lg:inset-auto lg:top-24 lg:z-auto lg:block lg:h-[calc(100vh-7rem)] lg:rounded-[1.75rem]`}
        >
          <MarketplaceMap
            pins={pins}
            center={mapCenter}
            hoveredId={hoveredId}
            selectedId={selectedId}
            mobileOpen={mobileMapOpen}
            onHover={setHoveredId}
            onSelect={handleSelectFromPin}
          />

          {/* Mobile-only: close the full-screen map. */}
          {mobileMapOpen ? (
            <button
              type="button"
              onClick={() => setMobileMapOpen(false)}
              className="absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-forest shadow-lg transition hover:bg-sage lg:hidden"
            >
              <List className="size-4" aria-hidden="true" />
              {t("Show list")}
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Mobile-only floating toggle to open the map (hidden while it's open). */}
      {!mobileMapOpen && status === "loaded" && count > 0 ? (
        <button
          type="button"
          onClick={() => setMobileMapOpen(true)}
          className="fixed bottom-6 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-bold text-white shadow-xl shadow-espresso/30 transition hover:bg-stone-800 lg:hidden"
        >
          <MapIcon className="size-4" aria-hidden="true" />
          {t("Map")}
        </button>
      ) : null}
    </div>
  );
}
