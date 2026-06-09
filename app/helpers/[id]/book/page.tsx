"use client";

// Booking flow entry: /helpers/[id]/book — book a specific caregiver.
//
// This page loads the PUBLIC, caregiver-side data the wizard needs (profile,
// offered services + prices, optional extras, open 2-hour slots, districts) and
// renders <BookingWizard/>. All reads use the publishable key and are already
// limited by RLS to visible+verified caregivers and safe columns — no elder data
// is ever read here, honouring the one-way rule.
//
// Login is required only to CONFIRM (handled inside the wizard); the elder can
// build the booking signed-out and is returned to the exact step after auth.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { useI18n } from "@/lib/i18n";
import { parseCriteria } from "@/lib/marketplace/criteria";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { addDays, loadRegions, toDateKey, type RegionRow } from "@/lib/supabase/caregiverDashboard";
import {
  loadVisibleVerifiedHelperProfileById,
  type PublicHelperProfile,
} from "@/lib/supabase/helperProfiles";
import {
  loadAvailableSlots,
  loadBookableExtras,
  loadBookableServices,
  type AvailableSlotsByDate,
  type BookableExtra,
  type BookableService,
} from "@/lib/supabase/booking";

type PageStatus = "loading" | "loaded" | "unavailable" | "unconfigured" | "error";

function BookingContent() {
  const params = useParams<{ id: string }>();
  const caregiverProfileId = params.id;
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const criteria = useMemo(() => parseCriteria(searchParams), [searchParams]);
  const filterQuery = searchParams.toString();
  const profileHref = filterQuery
    ? `/helpers/${caregiverProfileId}?${filterQuery}`
    : `/helpers/${caregiverProfileId}`;
  const bookingPath = filterQuery
    ? `/helpers/${caregiverProfileId}/book?${filterQuery}`
    : `/helpers/${caregiverProfileId}/book`;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [caregiver, setCaregiver] = useState<PublicHelperProfile | null>(null);
  const [services, setServices] = useState<BookableService[]>([]);
  const [extras, setExtras] = useState<BookableExtra[]>([]);
  const [slotsByDate, setSlotsByDate] = useState<AvailableSlotsByDate[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // The date window to fetch open slots for: the searched dates when present,
  // otherwise a sensible two-week look-ahead so direct visitors can still book.
  const { fromDate, toDate } = useMemo(() => {
    const today = toDateKey(new Date());
    const start = criteria.startDate || today;
    const end = criteria.endDate || criteria.startDate || toDateKey(addDays(new Date(), 14));
    return { fromDate: start, toDate: end < start ? start : end };
  }, [criteria.startDate, criteria.endDate]);

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    let isMounted = true;
    setStatus("loading");

    async function load() {
      const profileResult = await loadVisibleVerifiedHelperProfileById(
        supabase!,
        caregiverProfileId,
      );
      if (!isMounted) return;

      if (profileResult.errorMessage) {
        console.error("Could not load caregiver:", profileResult.errorMessage);
        setStatus("error");
        return;
      }
      if (!profileResult.helperProfile) {
        setStatus("unavailable");
        return;
      }
      setCaregiver(profileResult.helperProfile);

      const [servicesResult, extrasResult, slotsResult, regionsResult, userResult] =
        await Promise.all([
          loadBookableServices(supabase!, caregiverProfileId),
          loadBookableExtras(supabase!, caregiverProfileId),
          loadAvailableSlots(supabase!, caregiverProfileId, fromDate, toDate),
          loadRegions(supabase!),
          supabase!.auth.getUser(),
        ]);
      if (!isMounted) return;

      setServices(servicesResult.services);
      setExtras(extrasResult.extras);
      setSlotsByDate(slotsResult.byDate);
      if (!regionsResult.errorMessage) setRegions(regionsResult.data);
      setIsSignedIn(Boolean(userResult.data.user));
      setStatus("loaded");
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [caregiverProfileId, fromDate, toDate]);

  // Pre-tick the services the elder picked in the marketplace (by slug).
  const initialServiceIds = useMemo(() => {
    if (criteria.services.length === 0) return [];
    const wanted = new Set(criteria.services);
    return services.filter((s) => wanted.has(s.slug)).map((s) => s.serviceId);
  }, [services, criteria.services]);

  const defaultRegionId = useMemo(() => {
    if (criteria.district && regions.some((r) => r.id === criteria.district)) {
      return criteria.district;
    }
    return "";
  }, [criteria.district, regions]);

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 lg:px-8 lg:py-14">
      <Link
        href={profileHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-forest transition hover:text-stone-800"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("Back to caregiver profile")}
      </Link>

      <div className="mt-4">
        <PageIntro
          eyebrow={t("Booking")}
          title={t("Book your visit")}
          description={t("Pick a service and time, add any extras, and send your request. You won't be charged now — the caregiver approves first.")}
        />
      </div>

      <div className="mt-8">
        {status === "loading" ? (
          <div
            className="rounded-[2rem] border border-moss/20 bg-white p-6 text-stone-700 shadow-sm"
            role="status"
          >
            {t("Loading the booking…")}
          </div>
        ) : null}

        {status === "unconfigured" ? (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
            <h2 className="text-2xl font-bold">{t("Supabase configuration needed")}</h2>
            <p className="mt-4 leading-7">{message}</p>
          </div>
        ) : null}

        {status === "error" || status === "unavailable" ? (
          <div className="rounded-[2rem] border border-moss/20 bg-white p-6 text-stone-700 shadow-sm">
            <h2 className="text-2xl font-bold text-forest">{t("Caregiver unavailable")}</h2>
            <p className="mt-4 leading-7">
              {status === "unavailable"
                ? t("This caregiver isn't available for booking right now. They may be hidden or not yet verified.")
                : t("We couldn't load this booking right now. Please try again in a little while.")}
            </p>
            <Link
              href="/helpers"
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
            >
              {t("Browse caregivers")}
            </Link>
          </div>
        ) : null}

        {status === "loaded" && caregiver ? (
          <BookingWizard
            caregiver={{ id: caregiver.id, display_name: caregiver.display_name }}
            services={services}
            extras={extras}
            slotsByDate={slotsByDate}
            regions={regions}
            defaultRegionId={defaultRegionId}
            defaultRegionName={criteria.districtName}
            initialServiceIds={initialServiceIds}
            isSignedIn={isSignedIn}
            bookingPath={bookingPath}
            storageKey={`vnukpodnaem:booking:${caregiverProfileId}`}
          />
        ) : null}
      </div>
    </section>
  );
}

export default function BookCaregiverPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-lg font-semibold text-stone-700">Loading…</p>
        </section>
      }
    >
      <BookingContent />
    </Suspense>
  );
}
