import type { SupabaseClient } from "@supabase/supabase-js";
import { loadServiceCatalog } from "@/lib/supabase/caregiverDashboard";

// Marketplace search — turns the home widget's criteria (service slugs +
// district) into a filtered list of caregiver cards.
//
// SECURITY / one-way rule: every query below runs with the publishable (anon)
// key and reads ONLY caregiver-side, public tables. Row-Level Security already
// restricts each of these to APPROVED + VISIBLE caregivers and SAFE columns:
//   - caregiver_profiles : public select of visible+verified rows, safe columns
//                          only (never stripe_account_id — column GRANT enforced)
//   - caregiver_services : public select for active rows of visible+verified
//                          caregivers (so hidden caregivers' prices never leak)
//   - caregiver_regions  : public select for visible+verified caregivers
// None of these tables hold elder data, so this search can never enumerate the
// elder population. No service-role key, no elder-readable table is touched.
//
// Matching rules (this phase):
//   - APPROVED + VISIBLE          — enforced by RLS, re-asserted in the query.
//   - DISTRICT (hard filter)      — caregiver serves the selected district OR has
//                                   covers_whole_city = true.
//   - SERVICE  (hard filter)      — offers at least one of the selected services.
//   - DATE     (SOFT filter)      — NOT applied here. Published time-slot
//     availability is confirmed in the booking phase; for now dates travel with
//     the search and are shown as guidance only (see PRODUCT_SPEC §4.4). This is
//     the explicitly-allowed simplification for this phase.

export type MatchedService = {
  id: string;
  name: string;
  slug: string;
};

export type MarketplaceCaregiver = {
  id: string;
  display_name: string;
  bio: string;
  experience: string | null;
  badge: "verified" | "volunteer" | null;
  covers_whole_city: boolean;
  rating_avg: number | null;
  rating_count: number;
  /** District names this caregiver serves (empty when they cover the whole city). */
  regionNames: string[];
  /** The selected services this caregiver offers (or all of them when unfiltered). */
  matchedServices: MatchedService[];
  /** Lowest price among the matching services, in minor units (стотинки). */
  lowestPriceMinor: number | null;
  currency: string | null;
};

export type CaregiverSearchInput = {
  serviceSlugs: string[];
  /** regions.id, or null for "any district". */
  regionId: string | null;
};

// Safe public columns of caregiver_profiles only (matches the column GRANT).
const PROFILE_COLUMNS =
  "id,display_name,bio,experience,badge,covers_whole_city,rating_avg,rating_count";

type ProfileRow = {
  id: string;
  display_name: string;
  bio: string;
  experience: string | null;
  badge: "verified" | "volunteer" | null;
  covers_whole_city: boolean;
  rating_avg: number | null;
  rating_count: number | null;
};

type ServiceRow = {
  caregiver_profile_id: string;
  service_id: string;
  price_amount: number;
  currency: string;
};

type EmbeddedRegion = { name: string; slug: string };

type RegionRow = {
  caregiver_profile_id: string;
  region_id: string;
  // PostgREST returns the embedded to-one relation as an object at runtime, but
  // the untyped client widens it to an array — accept both and normalise below.
  regions: EmbeddedRegion | EmbeddedRegion[] | null;
};

export async function searchCaregivers(
  supabase: SupabaseClient,
  input: CaregiverSearchInput,
): Promise<{ caregivers: MarketplaceCaregiver[]; errorMessage: string | null }> {
  // 1. Catalogue — resolve the chosen service slugs to service ids + names.
  const catalog = await loadServiceCatalog(supabase);
  if (catalog.errorMessage) {
    return { caregivers: [], errorMessage: catalog.errorMessage };
  }

  const serviceById = new Map(catalog.data.map((service) => [service.id, service]));
  const wantedServiceIds = new Set(
    input.serviceSlugs
      .map((slug) => catalog.data.find((service) => service.slug === slug)?.id)
      .filter((id): id is string => Boolean(id)),
  );
  const hasServiceFilter = wantedServiceIds.size > 0;

  // 2. Caregiver profiles, their priced services, and their regions — in
  //    parallel. RLS limits all three to visible + verified caregivers.
  const [profilesResult, servicesResult, regionsResult] = await Promise.all([
    supabase
      .from("caregiver_profiles")
      .select(PROFILE_COLUMNS)
      .eq("is_visible", true)
      .in("verification_status", ["verified_basic", "trusted"])
      .order("rating_avg", { ascending: false, nullsFirst: false })
      .order("display_name", { ascending: true }),
    supabase
      .from("caregiver_services")
      .select("caregiver_profile_id,service_id,price_amount,currency")
      .eq("is_active", true),
    supabase
      .from("caregiver_regions")
      .select("caregiver_profile_id,region_id,regions(name,slug)"),
  ]);

  if (profilesResult.error) {
    return { caregivers: [], errorMessage: profilesResult.error.message };
  }
  if (servicesResult.error) {
    return { caregivers: [], errorMessage: servicesResult.error.message };
  }
  if (regionsResult.error) {
    return { caregivers: [], errorMessage: regionsResult.error.message };
  }

  // Group priced services by caregiver.
  const servicesByCaregiver = new Map<string, ServiceRow[]>();
  for (const row of (servicesResult.data as ServiceRow[] | null) ?? []) {
    const list = servicesByCaregiver.get(row.caregiver_profile_id) ?? [];
    list.push(row);
    servicesByCaregiver.set(row.caregiver_profile_id, list);
  }

  // Group served regions by caregiver (ids for matching, names for display).
  const regionsByCaregiver = new Map<
    string,
    { ids: Set<string>; names: string[] }
  >();
  for (const row of (regionsResult.data as unknown as RegionRow[] | null) ?? []) {
    const entry = regionsByCaregiver.get(row.caregiver_profile_id) ?? {
      ids: new Set<string>(),
      names: [],
    };
    entry.ids.add(row.region_id);
    const region = Array.isArray(row.regions) ? row.regions[0] : row.regions;
    if (region?.name) {
      entry.names.push(region.name);
    }
    regionsByCaregiver.set(row.caregiver_profile_id, entry);
  }

  const caregivers: MarketplaceCaregiver[] = [];

  for (const profile of (profilesResult.data as ProfileRow[] | null) ?? []) {
    const ownServices = servicesByCaregiver.get(profile.id) ?? [];

    // SERVICE filter — must offer at least one selected service.
    const matchingServiceRows = hasServiceFilter
      ? ownServices.filter((row) => wantedServiceIds.has(row.service_id))
      : ownServices;
    if (hasServiceFilter && matchingServiceRows.length === 0) {
      continue;
    }

    // DISTRICT filter — serves the district OR covers the whole city.
    const ownRegions = regionsByCaregiver.get(profile.id);
    const regionMatches = input.regionId
      ? profile.covers_whole_city || (ownRegions?.ids.has(input.regionId) ?? false)
      : true;
    if (!regionMatches) {
      continue;
    }

    const matchedServices = matchingServiceRows
      .map((row) => {
        const catalogService = serviceById.get(row.service_id);
        return catalogService
          ? {
              id: catalogService.id,
              name: catalogService.name,
              slug: catalogService.slug,
            }
          : null;
      })
      .filter((service): service is MatchedService => Boolean(service));

    const prices = matchingServiceRows.map((row) => row.price_amount);
    const lowestPriceMinor = prices.length > 0 ? Math.min(...prices) : null;

    caregivers.push({
      id: profile.id,
      display_name: profile.display_name,
      bio: profile.bio,
      experience: profile.experience,
      badge: profile.badge ?? null,
      covers_whole_city: profile.covers_whole_city,
      rating_avg: profile.rating_avg ?? null,
      rating_count: profile.rating_count ?? 0,
      regionNames: ownRegions?.names ?? [],
      matchedServices,
      lowestPriceMinor,
      currency: matchingServiceRows[0]?.currency ?? null,
    });
  }

  return { caregivers, errorMessage: null };
}
