"use client";

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Heart, MapPin, Star } from "lucide-react";
import { MarketplaceFilters } from "@/components/MarketplaceFilters";
import { useI18n } from "@/lib/i18n";
import { hasActiveFilters, parseCriteria } from "@/lib/marketplace/criteria";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatLevaAmount, loadRegions, type RegionRow } from "@/lib/supabase/caregiverDashboard";
import { searchCaregivers, type MarketplaceCaregiver } from "@/lib/supabase/marketplace";

type HelpersStatus = "loading" | "loaded" | "unconfigured" | "error";

function CaregiverPlaceholder() {
  return (
    <div className="flex aspect-[5/3] items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-sage via-cream to-white ring-1 ring-moss/20">
      <div className="grid size-16 place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-stone-200">
        <svg viewBox="0 0 48 48" className="size-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="24" cy="18" r="8" />
          <path d="M10 40c2.6-8 8-12 14-12s11.4 4 14 12" />
        </svg>
      </div>
    </div>
  );
}

function CaregiverCard({
  caregiver,
  detailHref,
}: {
  caregiver: MarketplaceCaregiver;
  detailHref: string;
}) {
  const { t } = useI18n();

  const isVolunteer = caregiver.badge === "volunteer";
  const locationLabel = caregiver.covers_whole_city
    ? t("Whole city")
    : caregiver.regionNames.length > 0
      ? caregiver.regionNames.join(", ")
      : t("Location not set");

  const reviewLabel =
    caregiver.rating_count > 0
      ? `${caregiver.rating_count} ${t(caregiver.rating_count === 1 ? "review" : "reviews")}`
      : t("No reviews yet");

  return (
    <article className="flex flex-col overflow-hidden rounded-[1.75rem] border border-moss/25 bg-white p-3 shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-moss/60 hover:shadow-lg">
      <div className="relative">
        <CaregiverPlaceholder />
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-[0.1em] shadow-sm ${
            isVolunteer ? "bg-clay/15 text-clay" : "bg-forest text-white"
          }`}
        >
          {isVolunteer ? (
            <Heart className="size-3.5" aria-hidden="true" />
          ) : (
            <BadgeCheck className="size-3.5" aria-hidden="true" />
          )}
          {isVolunteer ? t("Volunteer") : t("Verified")}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-bold text-forest">{caregiver.display_name}</h2>
          {caregiver.rating_avg != null ? (
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-forest">
              <Star className="size-4 fill-clay text-clay" aria-hidden="true" />
              {caregiver.rating_avg.toFixed(1)}
            </span>
          ) : null}
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
          <MapPin className="size-4 shrink-0 text-moss" aria-hidden="true" />
          <span className="truncate">{locationLabel}</span>
        </p>

        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">
          {reviewLabel}
        </p>

        {caregiver.matchedServices.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {caregiver.matchedServices.slice(0, 3).map((service) => (
              <li
                key={service.id}
                className="rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-forest"
              >
                {t(service.name)}
              </li>
            ))}
            {caregiver.matchedServices.length > 3 ? (
              <li className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-stone-600">
                +{caregiver.matchedServices.length - 3}
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-4 flex items-end justify-between gap-3 pt-2">
          <p className="text-sm font-semibold text-stone-700">
            {caregiver.lowestPriceMinor != null ? (
              <>
                <span className="text-stone-500">{t("from")} </span>
                <span className="text-base font-bold text-forest">
                  {formatLevaAmount(caregiver.lowestPriceMinor)} {t("лв.")}
                </span>
              </>
            ) : (
              <span className="text-stone-500">{t("Price on request")}</span>
            )}
          </p>
          <Link
            href={detailHref}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-forest px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800"
          >
            {t("View profile")}
          </Link>
        </div>
      </div>
    </article>
  );
}

function HelpersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const [status, setStatus] = useState<HelpersStatus>("loading");
  const [caregivers, setCaregivers] = useState<MarketplaceCaregiver[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  // Restored from the home search and preserved across the auth round-trip (the
  // full query is carried into returnTo and back onto every caregiver link).
  const criteria = useMemo(() => parseCriteria(searchParams), [searchParams]);
  const filtered = hasActiveFilters(criteria);

  // Only the service + district criteria actually change the query; re-run when
  // either of those changes (dates are a soft, display-only filter this phase).
  const servicesKey = criteria.services.join(",");
  const districtKey = criteria.district;

  // Load the district list once for the in-place filter dropdown.
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

    searchCaregivers(supabase, {
      serviceSlugs: servicesKey ? servicesKey.split(",") : [],
      regionId: districtKey || null,
    })
      .then((result) => {
        if (!isMounted) return;
        if (result.errorMessage) {
          // Never surface raw database errors to families.
          console.error("Could not load caregivers:", result.errorMessage);
          setStatus("error");
          setMessage(t("We couldn't load caregivers right now. Please try again in a little while."));
          return;
        }
        setCaregivers(result.caregivers);
        setStatus("loaded");
        setMessage(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        const reason = error instanceof Error ? error.message : "Unknown error";
        console.error("Could not load caregivers:", reason);
        setStatus("error");
        setMessage(t("We couldn't load caregivers right now. Please try again in a little while."));
      });

    return () => {
      isMounted = false;
      clearTimeout(loadingFallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesKey, districtKey]);

  // Carry the active filter query onto each caregiver link so the filters
  // survive the click into a caregiver profile (and its auth gate).
  const filterQuery = searchParams.toString();
  const detailHref = (id: string) =>
    filterQuery ? `/helpers/${id}?${filterQuery}` : `/helpers/${id}`;

  const countLabel =
    caregivers.length === 1
      ? `${caregivers.length} ${t("caregiver found")}`
      : `${caregivers.length} ${t("caregivers found")}`;

  function clearAll() {
    router.push("/helpers");
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow={t("Caregivers")}
        title={t("Certified caregivers")}
        description={t("Browse approved caregiver profiles for everyday support. Longer profile information is available on each caregiver page.")}
      />

      <div className="mt-8 rounded-[2rem] border border-moss/20 bg-sage/70 p-5 text-stone-700 shadow-sm">
        <h2 className="text-lg font-bold text-forest">{t("Before you choose a caregiver")}</h2>
        <p className="mt-2 max-w-5xl leading-7">
          {t("Caregiver profiles are reviewed before they appear here. Only approved and visible profiles are listed; final reservation and payment steps are not active yet, and some services have safety or legal limits.")}
        </p>
      </div>

      <MarketplaceFilters criteria={criteria} regions={regions} />

      {filtered ? (
        <p className="mt-4 rounded-2xl bg-sage px-4 py-3 text-sm font-semibold leading-6 text-stone-700">
          {t("Showing approved caregivers who offer your selected services in your district. Dates are used as a guide for now — exact time-slot availability is confirmed when you book.")}
        </p>
      ) : null}

      <div className="mt-8">
        {status === "loading" ? (
          <p className="rounded-[2rem] bg-white p-6 font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200" role="status">
            {t("Loading certified caregivers…")}
          </p>
        ) : null}

        {status === "unconfigured" ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900" role="alert">
            {message}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800" role="alert">
            {message}
          </div>
        ) : null}

        {status === "loaded" && caregivers.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-8 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold text-forest">{t("No caregivers match your search yet")}</h2>
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
        ) : null}

        {status === "loaded" && caregivers.length > 0 ? (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-clay" role="status">
              {countLabel}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {caregivers.map((caregiver) => (
                <CaregiverCard
                  key={caregiver.id}
                  caregiver={caregiver}
                  detailHref={detailHref(caregiver.id)}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
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
