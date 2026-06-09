"use client";

import { PageIntro } from "@/components/PageIntro";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { MarketplaceView } from "@/components/marketplace/MarketplaceView";
import { useI18n } from "@/lib/i18n";
import { hasActiveFilters, parseCriteria } from "@/lib/marketplace/criteria";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadRegions, type RegionRow } from "@/lib/supabase/caregiverDashboard";
import {
  loadAvailableCaregiverIds,
  searchCaregivers,
  type MarketplaceCaregiver,
} from "@/lib/supabase/marketplace";

type HelpersStatus = "loading" | "loaded" | "unconfigured" | "error";

function HelpersPageContent() {
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [status, setStatus] = useState<HelpersStatus>("loading");
  const [caregivers, setCaregivers] = useState<MarketplaceCaregiver[]>([]);
  const [availableIds, setAvailableIds] = useState<Set<string> | null>(null);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Restored from the home search and preserved across the auth round-trip (the
  // full query is carried into returnTo and back onto every caregiver link).
  const criteria = useMemo(() => parseCriteria(searchParams), [searchParams]);
  const filtered = hasActiveFilters(criteria);

  // Only the service + district criteria (and the searched dates, for the
  // availability hint) change what we fetch. Sort + the client-side refinement
  // filters are applied in MarketplaceView without re-querying.
  const servicesKey = criteria.services.join(",");
  const districtKey = criteria.district;
  const startKey = criteria.startDate;
  const endKey = criteria.endDate;

  // Load the district list once for the in-place filter dropdown + pin anchoring.
  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      return;
    }
    let isMounted = true;
    loadRegions(supabase).then((result) => {
      if (isMounted && !result.errorMessage) {
        setRegions(result.data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    let isMounted = true;
    setStatus("loading");

    // Safety net: never sit on the spinner forever if a query stalls.
    const loadingFallback = setTimeout(() => {
      if (isMounted) {
        setStatus((current) => (current === "loading" ? "loaded" : current));
      }
    }, 8000);

    // Availability is a soft, display-only hint this phase: fetch the set of
    // caregivers with published slots in the searched dates, but never block or
    // error the listing on it.
    const fromDate = startKey || endKey;
    const toDate = endKey || startKey;
    const availabilityPromise = fromDate
      ? loadAvailableCaregiverIds(supabase, fromDate, toDate)
      : Promise.resolve(null);

    Promise.all([
      searchCaregivers(supabase, {
        serviceSlugs: servicesKey ? servicesKey.split(",") : [],
        regionId: districtKey || null,
      }),
      availabilityPromise,
    ])
      .then(([result, availability]) => {
        if (!isMounted) return;
        if (result.errorMessage) {
          // Never surface raw database errors to families.
          console.error("Could not load caregivers:", result.errorMessage);
          setStatus("error");
          setMessage(
            t("We couldn't load caregivers right now. Please try again in a little while."),
          );
          return;
        }
        setCaregivers(result.caregivers);
        setAvailableIds(availability);
        setStatus("loaded");
        setMessage(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        const reason = error instanceof Error ? error.message : "Unknown error";
        console.error("Could not load caregivers:", reason);
        setStatus("error");
        setMessage(
          t("We couldn't load caregivers right now. Please try again in a little while."),
        );
      });

    return () => {
      isMounted = false;
      clearTimeout(loadingFallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesKey, districtKey, startKey, endKey]);

  // Carry the active filter query onto each caregiver link so the filters
  // survive the click into a caregiver profile (and its auth gate).
  const filterQuery = searchParams.toString();
  const detailHref = (id: string) =>
    filterQuery ? `/helpers/${id}?${filterQuery}` : `/helpers/${id}`;

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow={t("Caregivers")}
        title={t("Find a caregiver near you")}
        description={t("Browse approved caregivers for everyday support. Hover a card to find them on the map, and open any profile for full details.")}
      />

      <MarketplaceFilters criteria={criteria} regions={regions} />

      {filtered ? (
        <p className="mt-4 rounded-2xl bg-sage px-4 py-3 text-sm font-semibold leading-6 text-stone-700">
          {t("Showing approved caregivers who offer your selected services in your district. Dates are used as a guide for now — exact time-slot availability is confirmed when you book.")}
        </p>
      ) : null}

      {status === "unconfigured" ? (
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900" role="alert">
          {message}
        </div>
      ) : status === "error" ? (
        <div className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800" role="alert">
          {message}
        </div>
      ) : (
        <MarketplaceView
          status={status}
          caregivers={caregivers}
          criteria={criteria}
          regions={regions}
          detailHref={detailHref}
          availableIds={availableIds}
        />
      )}
    </section>
  );
}

export default function HelpersPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-lg font-semibold text-stone-700">Loading certified caregivers…</p>
        </section>
      }
    >
      <HelpersPageContent />
    </Suspense>
  );
}
