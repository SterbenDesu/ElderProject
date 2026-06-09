"use client";

// Public caregiver profile + entry point into the booking flow.
//
// Shows only safe, public caregiver fields (display name, bio, experience) and
// the caregiver's per-service prices. The prominent "Book / Reserve" button
// carries the elder's marketplace filters (service + district + dates) into the
// multi-step booking flow at /helpers/[id]/book. Login is requested later, when
// the elder confirms — so the button is always available here.
//
// Privacy: never shows email, phone, last name, application data, or any
// owner-private/admin-only field. All reads are RLS-limited to visible+verified
// caregivers, and the one-way rule means no elder data is touched.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarCheck, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatLevaAmount } from "@/lib/supabase/caregiverDashboard";
import {
  loadVisibleVerifiedHelperProfileById,
  type PublicHelperProfile,
} from "@/lib/supabase/helperProfiles";
import { loadBookableServices, type BookableService } from "@/lib/supabase/booking";
import { toPublicDisplayName } from "@/lib/marketplace/publicName";

type PageStatus = "loading" | "loaded" | "unavailable" | "unconfigured" | "error";

function HelperDetailContent() {
  const params = useParams<{ id: string }>();
  const caregiverProfileId = params.id;
  // Preserve the marketplace filters through the booking flow + auth round-trip.
  const searchParams = useSearchParams();
  const filterQuery = searchParams.toString();
  const { t } = useI18n();

  const marketplaceHref = filterQuery ? `/helpers?${filterQuery}` : "/helpers";
  const bookHref = filterQuery
    ? `/helpers/${caregiverProfileId}/book?${filterQuery}`
    : `/helpers/${caregiverProfileId}/book`;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [caregiver, setCaregiver] = useState<PublicHelperProfile | null>(null);
  const [services, setServices] = useState<BookableService[]>([]);

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
        console.error("Could not load caregiver profile:", profileResult.errorMessage);
        setStatus("error");
        return;
      }
      if (!profileResult.helperProfile) {
        setStatus("unavailable");
        return;
      }

      setCaregiver(profileResult.helperProfile);
      setStatus("loaded");

      const servicesResult = await loadBookableServices(supabase!, caregiverProfileId);
      if (isMounted && !servicesResult.errorMessage) {
        setServices(servicesResult.services);
      }
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [caregiverProfileId]);

  const lowestPriceMinor = useMemo(
    () => (services.length > 0 ? Math.min(...services.map((s) => s.priceMinor)) : null),
    [services],
  );

  const publicName = caregiver ? toPublicDisplayName(caregiver.display_name) : "";

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow={t("Caregiver profile")}
        title={t("Certified caregiver")}
        description={t("Review this caregiver's profile and prices, then book a visit. Private contact details are never shown publicly.")}
      />

      {status === "loading" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200" role="status">
          {t("Loading caregiver profile…")}
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <h2 className="text-2xl font-bold">{t("Supabase configuration needed")}</h2>
          <p className="mt-4 leading-7">{message}</p>
        </div>
      ) : null}

      {status === "error" || status === "unavailable" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">{t("Caregiver unavailable")}</h2>
          <p className="mt-4 leading-7">
            {status === "unavailable"
              ? t("This caregiver profile isn't available publicly. It may be hidden, unverified, or missing.")
              : t("We couldn't load this caregiver right now. Please try again in a little while.")}
          </p>
          <Link
            href={marketplaceHref}
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            {t("Back to caregivers")}
          </Link>
        </div>
      ) : null}

      {status === "loaded" && caregiver ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr] lg:items-start">
          <div className="space-y-5">
            <article className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <div className="grid gap-6 md:grid-cols-[12rem_1fr] md:items-start">
                <div className="flex aspect-square items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-sage via-cream to-white ring-1 ring-moss/20">
                  <div className="grid size-20 place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-stone-200">
                    <svg viewBox="0 0 48 48" className="size-11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="24" cy="18" r="8" /><path d="M10 40c2.6-8 8-12 14-12s11.4 4 14 12" /></svg>
                  </div>
                </div>
                <div>
                  <p className="inline-flex items-center gap-1.5 rounded-full bg-sage px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-forest">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {t("Certified caregiver")}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-forest">{publicName}</h2>
                  <dl className="mt-6 grid gap-4 text-sm">
                    <div>
                      <dt className="font-bold text-forest">{t("Experience")}</dt>
                      <dd className="mt-1 whitespace-pre-wrap leading-7">{caregiver.experience ?? t("Not listed")}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-forest">{t("About")}</dt>
                      <dd className="mt-1 whitespace-pre-wrap leading-7">{caregiver.bio}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-6 rounded-3xl bg-cream p-5 text-sm leading-6 text-stone-700">
                <h3 className="font-bold text-forest">{t("Non-medical service boundary")}</h3>
                <p className="mt-2">
                  {t("Caregivers may be booked for companionship, errands, shopping, walks, check-ins, technology help, and accompaniment. Please don't request medical care, medication management, clinical tasks, card PINs, passwords, cash handling, or access to valuables. Caregivers are independent marketplace participants, not Vnuk Pod Naem employees, and the platform does not guarantee absolute safety.")}
                </p>
              </div>
            </article>

            {services.length > 0 ? (
              <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
                <h2 className="text-2xl font-bold text-forest">{t("Services and prices")}</h2>
                <p className="mt-2 text-sm text-stone-600">{t("Each service is priced per 2-hour visit.")}</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {services.map((service) => (
                    <li
                      key={service.serviceId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-moss/20 bg-cream/60 px-4 py-3"
                    >
                      <span className="font-bold text-forest">{t(service.name)}</span>
                      <span className="shrink-0 text-sm font-semibold text-stone-600">
                        {formatLevaAmount(service.priceMinor)} {t("лв.")} / {t("2h")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-[2rem] border border-moss/20 bg-white p-6 shadow-sm">
              {lowestPriceMinor != null ? (
                <p className="text-sm text-stone-600">
                  {t("from")}{" "}
                  <span className="text-2xl font-bold text-forest">
                    {formatLevaAmount(lowestPriceMinor)} {t("лв.")}
                  </span>{" "}
                  / {t("2h")}
                </p>
              ) : (
                <p className="text-sm font-semibold text-stone-600">{t("Price on request")}</p>
              )}

              <Link
                href={bookHref}
                className="mt-4 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-forest/20 transition hover:-translate-y-0.5 hover:bg-stone-800"
              >
                <CalendarCheck className="size-5" aria-hidden="true" />
                {t("Book / Reserve")}
              </Link>

              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-stone-600">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-moss" aria-hidden="true" />
                {t("Choose your time slots on the next screen. You won't be charged now — the caregiver approves your request first.")}
              </p>
            </div>

            <div className="rounded-[2rem] bg-sage p-6 text-stone-700">
              <h2 className="text-xl font-bold text-forest">{t("How booking works")}</h2>
              <ul className="mt-4 space-y-3 leading-7 text-sm">
                <li>• {t("Pick a service, dates, and 2-hour time slots.")}</li>
                <li>• {t("Add optional extras and review the price.")}</li>
                <li>• {t("Send your request — it's saved as pending.")}</li>
                <li>• {t("The caregiver approves before anything is charged.")}</li>
              </ul>
            </div>

            <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-xl font-bold text-forest">{t("Public data only")}</h2>
              <p className="mt-4 leading-7 text-sm">
                {t("This page shows only safe caregiver details: public name, bio, experience, and prices. It never shows email addresses, phone numbers, private user details, or application answers.")}
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

export default function HelperDetailPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-lg font-semibold text-stone-700">Loading caregiver profile…</p>
        </section>
      }
    >
      <HelperDetailContent />
    </Suspense>
  );
}
