"use client";

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
  city: string;
  services: string[];
  startDate: string;
  endDate: string;
};

function formatDateForDisplay(value: string, locale = "en") {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function HelpersPageContent() {
  const searchParams = useSearchParams();
  const { t, language } = useI18n();
  const [status, setStatus] = useState<HelpersStatus>("loading");
  const [helperProfiles, setHelperProfiles] = useState<PublicHelperProfile[]>(
    [],
  );
  const [message, setMessage] = useState<string | null>(null);

  const criteria: SearchCriteria = useMemo(
    () => ({
      city: searchParams.get("city")?.trim() ?? "",
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

    loadVisibleVerifiedHelperProfiles(supabase).then((result) => {
      if (result.errorMessage) {
        setStatus("error");
        setMessage(
          `Could not load public helper profiles: ${result.errorMessage}. Confirm the helper_profiles RLS policy is applied and only visible verified helpers are public.`,
        );
        return;
      }

      setHelperProfiles(result.helperProfiles);
      setStatus("loaded");
      setMessage(null);
    });
  }, []);

  const visibleHelperProfiles = useMemo(() => {
    if (!criteria.city) {
      return helperProfiles;
    }

    const selectedCity = criteria.city.toLocaleLowerCase();

    return helperProfiles.filter(
      (helperProfile) =>
        helperProfile.city.trim().toLocaleLowerCase() === selectedCity,
    );
  }, [criteria.city, helperProfiles]);

  const hasSearchCriteria = Boolean(
    criteria.city ||
      criteria.services.length > 0 ||
      criteria.startDate ||
      criteria.endDate,
  );
  const hasVisibleVerifiedHelpers = visibleHelperProfiles.length > 0;

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
        {t("Caregivers")}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">
        {t("Public caregiver marketplace")}
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        {t("Browse visible, reviewed caregiver profiles. Submitted applications and unverified applicants are never shown here.")}
      </p>

      {hasSearchCriteria ? (
        <div className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">
                {t("Selected search")}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-forest">
                {t("Caregiver search criteria")}
              </h2>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full bg-sage px-4 py-2 text-sm font-semibold text-forest transition hover:bg-cream"
            >
              {t("Change search")}
            </Link>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-cream p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                {t("City")}
              </dt>
              <dd className="mt-1 font-semibold text-forest">
                {criteria.city || t("Any listed city")}
              </dd>
            </div>
            <div className="rounded-2xl bg-cream p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                {t("Service")}
              </dt>
              <dd className="mt-1 font-semibold text-forest">
                {criteria.services.length > 0
                  ? criteria.services
                      .map((service) => formatServiceLabel(service, t))
                      .join(", ")
                  : t("Any service")}
              </dd>
            </div>
            <div className="rounded-2xl bg-cream p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                {t("Start date")}
              </dt>
              <dd className="mt-1 font-semibold text-forest">
                {criteria.startDate
                  ? formatDateForDisplay(criteria.startDate, language)
                  : t("Not selected")}
              </dd>
            </div>
            <div className="rounded-2xl bg-cream p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">
                {t("End date")}
              </dt>
              <dd className="mt-1 font-semibold text-forest">
                {criteria.endDate
                  ? formatDateForDisplay(criteria.endDate, language)
                  : t("Not selected")}
              </dd>
            </div>
          </dl>

          <p className="mt-4 rounded-2xl bg-sage px-4 py-3 text-sm font-semibold leading-6 text-stone-700">
            {t("Showing caregivers matching available profile data. Date and service availability filtering will be added later.")}
          </p>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">
            {t("Marketplace listing status")}
          </h2>

          {status === "loading" ? (
            <p className="mt-4 leading-7" role="status">
              {t("Checking for visible verified caregiver profiles…")}
            </p>
          ) : null}

          {status === "unconfigured" ? (
            <div
              className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
              role="alert"
            >
              {message}
            </div>
          ) : null}

          {status === "error" ? (
            <div
              className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
              role="alert"
            >
              {message}
            </div>
          ) : null}

          {status === "loaded" && !hasVisibleVerifiedHelpers ? (
            <>
              <p className="mt-4 text-lg leading-8">
                {criteria.city
                  ? `${t("No visible verified caregivers are listed in")} ${criteria.city} ${t("yet.")}`
                  : t("Public caregiver marketplace listings are not active yet because there are no visible verified caregiver profiles to show.")}
              </p>
              <p className="mt-4 leading-7">
                {t("Helper applications are private review records. They do not create public caregiver profiles, approve caregivers, or make unverified applicants available for bookings.")}
              </p>
            </>
          ) : null}

          {status === "loaded" && hasVisibleVerifiedHelpers ? (
            <div className="mt-5 grid gap-4">
              {visibleHelperProfiles.map((helperProfile) => (
                <article
                  key={helperProfile.id}
                  className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/60 transition hover:-translate-y-0.5 hover:border-moss/40 hover:shadow-md"
                >
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay">
                    {helperProfile.verification_status === "trusted"
                      ? t("Trusted verified caregiver")
                      : t("Verified caregiver")}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-forest">
                    {t("Caregiver in")} {helperProfile.city}
                  </h3>
                  <p className="mt-2 leading-7 text-stone-600">
                    {helperProfile.bio}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-stone-600">
                    {t("Service radius:")}{" "}
                    {helperProfile.service_radius_km === null
                      ? t("Not listed")
                      : `${helperProfile.service_radius_km} km`}
                  </p>
                  <Link
                    href={`/helpers/${helperProfile.id}`}
                    className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-800 active:translate-y-0"
                  >
                    {t("View caregiver details")}
                  </Link>
                </article>
              ))}
            </div>
          ) : null}

          <Link
            href="/prohibited-services"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            {t("See prohibited services")}
          </Link>
        </div>
        <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">{t("Listing safety rules")}</h2>
          <ul className="mt-4 space-y-3 leading-7">
            <li>{t("• Unverified caregiver applicants are not shown publicly.")}</li>
            <li>{t("• Submitted applications are private and are not marketplace profiles.")}</li>
            <li>{t("• Public visibility requires a visible caregiver profile with verified status.")}</li>
            <li>{t("• No booking payments, Stripe, applicant records, or guaranteed safety claims are shown here.")}</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

export default function HelpersPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-lg font-semibold text-stone-700">
            Loading caregiver marketplace…
          </p>
        </section>
      }
    >
      <HelpersPageContent />
    </Suspense>
  );
}
