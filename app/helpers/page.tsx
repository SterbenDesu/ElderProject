"use client";

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { formatServiceLabel } from "@/components/HomeSearchCard";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  loadVisibleVerifiedHelperProfiles,
  type PublicHelperProfile,
} from "@/lib/supabase/helperProfiles";

type HelpersStatus = "loading" | "loaded" | "unconfigured" | "error";

type SearchCriteria = {
  address: string;
  district: string;
  districtName: string;
  services: string[];
  startDate: string;
  endDate: string;
};

function formatDateForDisplay(value: string, locale = "en") {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function CaregiverPlaceholder() {
  return (
    <div className="flex aspect-square items-center justify-center rounded-[1.35rem] bg-gradient-to-br from-sage via-cream to-white ring-1 ring-moss/20">
      <div className="grid size-20 place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-stone-200">
        <svg viewBox="0 0 48 48" className="size-11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="24" cy="18" r="8" />
          <path d="M10 40c2.6-8 8-12 14-12s11.4 4 14 12" />
        </svg>
      </div>
    </div>
  );
}

function shortSummary(bio: string) {
  const normalized = bio.replace(/\s+/g, " ").trim();
  if (normalized.length <= 118) return normalized;
  return `${normalized.slice(0, 115).trim()}…`;
}

function HelpersPageContent() {
  const searchParams = useSearchParams();
  const { t, language } = useI18n();
  const [status, setStatus] = useState<HelpersStatus>("loading");
  const [helperProfiles, setHelperProfiles] = useState<PublicHelperProfile[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const criteria: SearchCriteria = useMemo(
    () => ({
      // Restored from the home search and preserved across the auth round-trip
      // (the full query is carried into returnTo). `district` is the matched
      // Sofia region id; the actual filtering lands in Phase 5.
      address: searchParams.get("address")?.trim() ?? "",
      district: searchParams.get("district")?.trim() ?? "",
      districtName: searchParams.get("districtName")?.trim() ?? "",
      services: (searchParams.get("services") || searchParams.get("service") || "")
        .split(",")
        .map((service) => service.trim())
        .filter(Boolean),
      startDate: searchParams.get("startDate")?.trim() ?? "",
      endDate: searchParams.get("endDate")?.trim() ?? "",
    }),
    [searchParams],
  );

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    let isMounted = true;

    // Safety net: never let the page sit on the loading spinner forever. If the
    // query is slow or its promise rejects (network/CORS failure), resolve to a
    // friendly empty state instead of an infinite loader.
    const loadingFallback = setTimeout(() => {
      if (!isMounted) {
        return;
      }

      setStatus((current) => (current === "loading" ? "loaded" : current));
    }, 8000);

    loadVisibleVerifiedHelperProfiles(supabase)
      .then((result) => {
        if (!isMounted) {
          return;
        }

        if (result.errorMessage) {
          // Never surface raw database errors to families — log the technical
          // detail for developers and show a calm, translated message instead.
          console.error("Could not load caregiver profiles:", result.errorMessage);
          setStatus("error");
          setMessage(t("We couldn't load caregivers right now. Please try again in a little while."));
          return;
        }
        setHelperProfiles(result.helperProfiles);
        setStatus("loaded");
        setMessage(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        const reason = error instanceof Error ? error.message : "Unknown error";
        console.error("Could not load caregiver profiles:", reason);
        setStatus("error");
        setMessage(t("We couldn't load caregivers right now. Please try again in a little while."));
      });

    return () => {
      isMounted = false;
      clearTimeout(loadingFallback);
    };
  }, []);

  // Location now lives in the regions model rather than a free-text `city`
  // column on the profile, so the listing shows every visible, verified
  // caregiver. District-based filtering will return with the regions UI.
  const visibleHelperProfiles = helperProfiles;

  const hasSearchCriteria = Boolean(
    criteria.address ||
      criteria.districtName ||
      criteria.services.length > 0 ||
      criteria.startDate ||
      criteria.endDate,
  );

  // Carry the active filter query onto each caregiver link so the filters
  // survive the click into a caregiver profile (and any auth gate there).
  const filterQuery = searchParams.toString();
  const detailHref = (id: string) =>
    filterQuery ? `/helpers/${id}?${filterQuery}` : `/helpers/${id}`;

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

      {hasSearchCriteria ? (
        <div className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">{t("Selected search")}</p>
              <h2 className="mt-2 text-2xl font-bold text-forest">{t("Caregiver search criteria")}</h2>
            </div>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-full bg-sage px-4 py-2 text-sm font-semibold text-forest transition hover:bg-cream">
              {t("Change search")}
            </Link>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-cream p-4"><dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{t("District")}</dt><dd className="mt-1 font-semibold text-forest">{criteria.districtName || t("Any Sofia district")}</dd></div>
            <div className="rounded-2xl bg-cream p-4"><dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{t("Service")}</dt><dd className="mt-1 font-semibold text-forest">{criteria.services.length > 0 ? criteria.services.map((service) => formatServiceLabel(service, t)).join(", ") : t("Any service")}</dd></div>
            <div className="rounded-2xl bg-cream p-4"><dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{t("Start date")}</dt><dd className="mt-1 font-semibold text-forest">{criteria.startDate ? formatDateForDisplay(criteria.startDate, language) : t("Not selected")}</dd></div>
            <div className="rounded-2xl bg-cream p-4"><dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{t("End date")}</dt><dd className="mt-1 font-semibold text-forest">{criteria.endDate ? formatDateForDisplay(criteria.endDate, language) : t("Not selected")}</dd></div>
          </dl>
          {criteria.address ? (
            <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-stone-600">
              <span className="font-bold uppercase tracking-[0.12em] text-stone-500">{t("Address")}:</span>
              <span className="font-semibold text-forest">{criteria.address}</span>
            </p>
          ) : null}
          <p className="mt-4 rounded-2xl bg-sage px-4 py-3 text-sm font-semibold leading-6 text-stone-700">{t("Showing caregivers matching available profile data. Date and service availability filtering will be added later.")}</p>
        </div>
      ) : null}

      <div className="mt-8">
        {status === "loading" ? <p className="rounded-[2rem] bg-white p-6 font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200" role="status">{t("Loading certified caregivers…")}</p> : null}
        {status === "unconfigured" ? <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900" role="alert">{message}</div> : null}
        {status === "error" ? <div className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800" role="alert">{message}</div> : null}
        {status === "loaded" && visibleHelperProfiles.length === 0 ? (
          <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold text-forest">{t("No certified caregivers to show yet")}</h2>
            <p className="mt-3 leading-7">{criteria.districtName ? `${t("No caregivers are available in")} ${criteria.districtName} ${t("yet. Check back soon.")}` : t("No caregivers are available in your area yet. Check back soon.")}</p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
            >
              {t("Back to homepage")}
            </Link>
          </div>
        ) : null}
        {status === "loaded" && visibleHelperProfiles.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleHelperProfiles.map((helperProfile) => (
              <article key={helperProfile.id} className="flex min-h-[25rem] flex-col overflow-hidden rounded-[1.75rem] border border-moss/25 bg-white p-3 shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-moss/60 hover:shadow-lg">
                <CaregiverPlaceholder />
                <div className="-mt-4 flex justify-center"><span className="rounded-full border border-moss/30 bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-forest shadow-sm">{t("Certified caregiver")}</span></div>
                <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                  <h2 className="text-lg font-bold text-forest">{helperProfile.display_name}</h2>
                  {helperProfile.experience ? (
                    <dl className="mt-3 grid gap-2 text-sm text-stone-600">
                      <div><dt className="font-bold text-stone-500">{t("Experience")}</dt><dd className="font-semibold text-stone-800">{shortSummary(helperProfile.experience)}</dd></div>
                    </dl>
                  ) : null}
                  <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{shortSummary(helperProfile.bio)}</p>
                  <Link href={detailHref(helperProfile.id)} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800">
                    {t("View profile")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function HelpersPage() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16"><p className="text-lg font-semibold text-stone-700">Loading certified caregivers…</p></section>}>
      <HelpersPageContent />
    </Suspense>
  );
}
