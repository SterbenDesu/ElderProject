"use client";

// Caregiver "Requests" view — incoming reservation requests to act on, plus the
// caregiver's approved upcoming bookings.
//
// ACCESS CONTROL (two layers):
//   1. UI: gated on useCurrentUser().isCaregiver (approved caregiver_profiles row).
//   2. RLS + RPC: get_caregiver_requests is SECURITY DEFINER and only ever
//      returns reservations directed at the caller's OWN caregiver profile. It
//      exposes the elder's FIRST NAME + district only — never a phone or email —
//      and the precise address only after approval. Approve/reject go through the
//      transition_reservation choke point, which re-checks the caller server-side.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { Check, Clock, MapPin, MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatLevaAmount } from "@/lib/supabase/caregiverDashboard";
import {
  loadCaregiverRequests,
  transitionReservation,
  type CaregiverRequest,
} from "@/lib/supabase/reservations";
import { loadMyChatThreads } from "@/lib/supabase/chat";
import {
  reservationStatusClasses,
  reservationStatusLabel,
  slotsByDate,
  totalDurationHours,
} from "@/lib/reservationFormat";

function RequestCard({
  request,
  onAction,
  pendingAction,
  chatThreadId,
}: {
  request: CaregiverRequest;
  onAction: (id: string, action: "approve" | "reject") => void;
  pendingAction: { id: string; action: "approve" | "reject" } | null;
  chatThreadId: string | null;
}) {
  const { t, language } = useI18n();
  const locale = language === "bg" ? "bg" : "en";
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const dates = slotsByDate(request.slots);
  const isActing = pendingAction?.id === request.reservationId;

  return (
    <article className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-forest text-sm font-bold text-white">
            {(request.elderFirstName ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h3 className="text-lg font-bold text-forest">
              {request.elderFirstName
                ? t("Request from {name}").replace("{name}", request.elderFirstName)
                : t("New booking request")}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-stone-600">
              <MapPin className="size-4 text-clay" aria-hidden="true" />
              {request.regionName ?? t("District not set")}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] ${reservationStatusClasses(
            request.status,
          )}`}
        >
          {t(reservationStatusLabel(request.status))}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
            {t("Services")}
          </h4>
          <ul className="mt-2 space-y-1.5">
            {request.services.map((item, index) => (
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
            {request.services.length === 0 ? (
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
              String(totalDurationHours(request.slots)),
            )}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
        <p className="text-sm text-stone-600">
          {t("Total")}{" "}
          <span className="text-lg font-bold text-forest">
            {formatLevaAmount(request.totalAmountMinor)} {t("лв.")}
          </span>
        </p>

        {request.status === "pending" ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAction(request.reservationId, "reject")}
              disabled={isActing}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="size-4" aria-hidden="true" />
              {isActing && pendingAction?.action === "reject"
                ? t("Declining…")
                : t("Decline")}
            </button>
            <button
              type="button"
              onClick={() => onAction(request.reservationId, "approve")}
              disabled={isActing}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="size-4" aria-hidden="true" />
              {isActing && pendingAction?.action === "approve"
                ? t("Approving…")
                : t("Approve")}
            </button>
          </div>
        ) : request.hasChat ? (
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

export default function CaregiverRequestsPage() {
  const { t } = useI18n();
  const { status, isCaregiver, envError } = useCurrentUser();
  const [requests, setRequests] = useState<CaregiverRequest[]>([]);
  const [threadByReservation, setThreadByReservation] = useState<
    Map<string, string>
  >(new Map());
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: "approve" | "reject";
  } | null>(null);

  const refresh = useCallback(async () => {
    const { supabase } = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    setLoading(true);
    // Requests + chat threads together, so each approved booking links to chat.
    const [{ requests: rows, errorMessage: error }, { threads }] =
      await Promise.all([
        loadCaregiverRequests(supabase),
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
    setRequests(rows);
  }, []);

  useEffect(() => {
    if (status === "signed-in" && isCaregiver) {
      void refresh();
    }
  }, [status, isCaregiver, refresh]);

  const handleAction = useCallback(
    async (id: string, action: "approve" | "reject") => {
      const { supabase } = getSupabaseBrowserClient();
      if (!supabase) {
        return;
      }
      setPendingAction({ id, action });
      setActionError(null);
      const { errorMessage: error } = await transitionReservation(
        supabase,
        id,
        action,
      );
      setPendingAction(null);
      if (error) {
        setActionError(error);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const pending = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );
  const approved = useMemo(
    () => requests.filter((r) => r.status === "approved"),
    [requests],
  );
  const past = useMemo(
    () =>
      requests.filter(
        (r) => r.status !== "pending" && r.status !== "approved",
      ),
    [requests],
  );

  return (
    <section className="mx-auto max-w-4xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow={t("Caregiver dashboard")}
        title={t("Requests")}
        description={t(
          "Review incoming booking requests and approve or decline them. Approving opens a private chat with the family and reserves your time slots.",
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
            {t("You need to sign in to view your incoming requests.")}
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            {t("Sign in")}
          </Link>
        </div>
      ) : null}

      {status === "signed-in" && !isCaregiver ? (
        <div className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6 text-stone-700 shadow-sm">
          <h2 className="text-2xl font-bold text-forest">
            {t("Approved caregivers only")}
          </h2>
          <p className="mt-3 leading-7">
            {t(
              "Incoming requests appear once an admin approves your caregiver application.",
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/helper/apply"
              className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 font-semibold text-white transition hover:bg-stone-800"
            >
              {t("Become a caregiver")}
            </Link>
            <Link
              href="/dashboard/reservations"
              className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-6 py-3 font-semibold text-forest transition hover:bg-sage"
            >
              {t("My bookings")}
            </Link>
          </div>
        </div>
      ) : null}

      {status === "signed-in" && isCaregiver ? (
        <div className="mt-8 space-y-8">
          {actionError ? (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
              role="alert"
            >
              {t("We couldn't update that request right now. Please try again.")}
            </div>
          ) : null}

          {errorMessage ? (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900"
              role="alert"
            >
              {t("We couldn't load your requests right now. Please try again.")}
            </div>
          ) : null}

          {loading && requests.length === 0 ? (
            <div
              className="rounded-[2rem] border border-stone-200 bg-white p-6 text-stone-700 shadow-sm"
              role="status"
            >
              {t("Loading your requests…")}
            </div>
          ) : null}

          <div>
            <h2 className="text-xl font-bold text-forest">
              {t("New requests")}{" "}
              <span className="text-base font-semibold text-stone-500">
                ({pending.length})
              </span>
            </h2>
            {pending.length === 0 && !loading ? (
              <p className="mt-3 rounded-[2rem] bg-cream p-6 text-sm font-semibold text-stone-600">
                {t("No new requests right now. We'll notify you when one arrives.")}
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {pending.map((request) => (
                  <RequestCard
                    key={request.reservationId}
                    request={request}
                    onAction={handleAction}
                    pendingAction={pendingAction}
                    chatThreadId={
                      threadByReservation.get(request.reservationId) ?? null
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {approved.length > 0 ? (
            <div>
              <h2 className="text-xl font-bold text-forest">
                {t("Approved bookings")}{" "}
                <span className="text-base font-semibold text-stone-500">
                  ({approved.length})
                </span>
              </h2>
              <div className="mt-4 space-y-4">
                {approved.map((request) => (
                  <RequestCard
                    key={request.reservationId}
                    request={request}
                    onAction={handleAction}
                    pendingAction={pendingAction}
                    chatThreadId={
                      threadByReservation.get(request.reservationId) ?? null
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {past.length > 0 ? (
            <div>
              <h2 className="text-xl font-bold text-forest">{t("Past requests")}</h2>
              <div className="mt-4 space-y-4">
                {past.map((request) => (
                  <RequestCard
                    key={request.reservationId}
                    request={request}
                    onAction={handleAction}
                    pendingAction={pendingAction}
                    chatThreadId={
                      threadByReservation.get(request.reservationId) ?? null
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
