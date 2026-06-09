"use client";

// Elder "My bookings" view — the family member's own reservations and their
// statuses (pending, approved, declined, …) with the key details.
//
// ACCESS CONTROL: get_elder_reservations is SECURITY DEFINER and only returns
// reservations where elder_id = auth.uid(), so an elder sees only their own
// bookings. The elder is confirmed ONLY once the caregiver approves — a pending
// request is never an auto-confirmation.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { Clock, MapPin, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatLevaAmount } from "@/lib/supabase/caregiverDashboard";
import {
  loadElderReservations,
  type ElderReservation,
} from "@/lib/supabase/reservations";
import { loadMyChatThreads } from "@/lib/supabase/chat";
import {
  reservationStatusClasses,
  reservationStatusLabel,
  slotsByDate,
  totalDurationHours,
} from "@/lib/reservationFormat";

function statusHint(
  status: ElderReservation["status"],
  t: (text: string) => string,
): string | null {
  switch (status) {
    case "pending":
      return t("Waiting for the caregiver to approve. No payment has been taken.");
    case "approved":
      return t("Confirmed — your caregiver approved this booking.");
    case "rejected":
      return t("The caregiver wasn't able to take this booking.");
    case "cancelled":
      return t("This booking was cancelled.");
    default:
      return null;
  }
}

function ReservationCard({
  reservation,
  chatThreadId,
}: {
  reservation: ElderReservation;
  chatThreadId: string | null;
}) {
  const { t, language } = useI18n();
  const locale = language === "bg" ? "bg" : "en";
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const dates = slotsByDate(reservation.slots);
  const hint = statusHint(reservation.status, t);

  return (
    <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-forest">
            {reservation.caregiverName
              ? t("Booking with {name}").replace("{name}", reservation.caregiverName)
              : t("Your booking")}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-600">
            <MapPin className="size-4 text-clay" aria-hidden="true" />
            {reservation.regionName ?? t("District not set")}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${reservationStatusClasses(
            reservation.status,
          )}`}
        >
          {t(reservationStatusLabel(reservation.status))}
        </span>
      </div>

      {hint ? <p className="mt-3 text-sm leading-6 text-stone-600">{hint}</p> : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
            {t("Services")}
          </h4>
          <ul className="mt-2 space-y-1.5">
            {reservation.services.map((item, index) => (
              <li
                key={`${item.label}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-stone-700">
                  {item.label}
                  {item.isExtra ? (
                    <span className="ml-1.5 rounded-full bg-cream px-1.5 py-0.5 text-[0.65rem] font-bold uppercase text-clay">
                      {t("Extra")}
                    </span>
                  ) : null}
                </span>
                <span className="font-semibold text-forest">
                  {formatLevaAmount(item.unitPriceMinor * item.quantity)} {t("лв.")}
                </span>
              </li>
            ))}
            {reservation.services.length === 0 ? (
              <li className="text-sm text-stone-500">{t("No services listed")}</li>
            ) : null}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
            {t("Dates & time slots")}
          </h4>
          <ul className="mt-2 space-y-1.5">
            {dates.map((day) => (
              <li key={day.date} className="text-sm text-stone-700">
                <span className="font-semibold text-forest">
                  {dateFmt.format(new Date(day.date))}
                </span>
                <span className="ml-1.5">{day.ranges.join(", ")}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-600">
            <Clock className="size-4 text-clay" aria-hidden="true" />
            {t("Total {hours}h").replace(
              "{hours}",
              String(totalDurationHours(reservation.slots)),
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
        <p className="text-sm text-stone-600">
          {t("Total")}{" "}
          <span className="text-lg font-bold text-forest">
            {formatLevaAmount(reservation.totalAmountMinor)} {t("лв.")}
          </span>
        </p>
        {reservation.hasChat ? (
          <Link
            href={chatThreadId ? `/messages/${chatThreadId}` : "/messages"}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-terracotta px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-terracotta-dark"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            {t("Open chat")}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function ElderReservationsPage() {
  const { t } = useI18n();
  const { status, envError } = useCurrentUser();
  const [reservations, setReservations] = useState<ElderReservation[]>([]);
  const [threadByReservation, setThreadByReservation] = useState<
    Map<string, string>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    setLoading(true);
    // Load reservations and the user's chat threads together so each approved
    // booking can deep-link to its conversation.
    const [{ reservations: rows, errorMessage: error }, { threads }] =
      await Promise.all([
        loadElderReservations(supabase),
        loadMyChatThreads(supabase),
      ]);
    setLoading(false);
    setThreadByReservation(
      new Map(threads.map((thread) => [thread.reservationId, thread.threadId])),
    );
    if (error) {
      setErrorMessage(error);
      return;
    }
    setErrorMessage(null);
    setReservations(rows);
  }, []);

  useEffect(() => {
    if (status === "signed-in") {
      void refresh();
    }
  }, [status, refresh]);

  const active = useMemo(
    () =>
      reservations.filter((r) =>
        ["pending", "approved", "in_progress", "awaiting_confirmation"].includes(
          r.status,
        ),
      ),
    [reservations],
  );
  const past = useMemo(
    () =>
      reservations.filter((r) =>
        ["completed", "rejected", "cancelled", "disputed"].includes(r.status),
      ),
    [reservations],
  );

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow={t("Account hub")}
        title={t("My bookings")}
        description={t(
          "Track your requests and their status. You're only confirmed once a caregiver approves — nothing is charged before that.",
        )}
      />

      {status === "loading" ? (
        <div
          className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6 text-stone-700 shadow-sm"
          role="status"
        >
          {t("Checking your account…")}
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <div
          className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900"
          role="alert"
        >
          <p>{envError}</p>
        </div>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6 text-stone-700 shadow-sm">
          <h2 className="text-2xl font-bold text-forest">{t("Please sign in")}</h2>
          <p className="mt-3 leading-7">
            {t("You need to sign in to view your bookings.")}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 font-semibold text-white transition hover:bg-stone-800"
            >
              {t("Sign in")}
            </Link>
            <Link
              href="/helpers"
              className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-6 py-3 font-semibold text-forest transition hover:bg-sage"
            >
              {t("Browse caregivers")}
            </Link>
          </div>
        </div>
      ) : null}

      {status === "signed-in" ? (
        <div className="mt-8 space-y-8">
          {errorMessage ? (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
              role="alert"
            >
              {t("We couldn't load your bookings right now. Please try again.")}
            </div>
          ) : null}

          {loading && reservations.length === 0 ? (
            <div
              className="rounded-[2rem] border border-stone-200 bg-white p-6 text-stone-700 shadow-sm"
              role="status"
            >
              {t("Loading your bookings…")}
            </div>
          ) : null}

          {!loading && reservations.length === 0 ? (
            <div className="rounded-[2rem] bg-cream p-8 text-center">
              <p className="text-base font-semibold text-forest">
                {t("No bookings yet")}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {t("Browse caregivers and send your first request.")}
              </p>
              <Link
                href="/helpers"
                className="mt-5 inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 font-semibold text-white transition hover:bg-stone-800"
              >
                {t("Browse caregivers")}
              </Link>
            </div>
          ) : null}

          {active.length > 0 ? (
            <div>
              <h2 className="text-xl font-bold text-forest">{t("Active")}</h2>
              <div className="mt-4 space-y-4">
                {active.map((reservation) => (
                  <ReservationCard
                    key={reservation.reservationId}
                    reservation={reservation}
                    chatThreadId={
                      threadByReservation.get(reservation.reservationId) ?? null
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {past.length > 0 ? (
            <div>
              <h2 className="text-xl font-bold text-forest">{t("Past")}</h2>
              <div className="mt-4 space-y-4">
                {past.map((reservation) => (
                  <ReservationCard
                    key={reservation.reservationId}
                    reservation={reservation}
                    chatThreadId={
                      threadByReservation.get(reservation.reservationId) ?? null
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
