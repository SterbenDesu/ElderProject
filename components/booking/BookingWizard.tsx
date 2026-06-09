"use client";

// The elder-facing booking wizard for a specific caregiver, modelled on the
// buddyguard.bg multi-step booking screen and adapted for elderly care:
//   1. Time     — pick service(s) + 2-hour time slot(s) across the chosen dates
//   2. Duration — confirm how many slots / how much total time
//   3. Extras   — optional add-ons (take out trash, light tidy-up, …)
//   4. Review   — summary + where/recipient details + full price breakdown
//   5. Confirm  — send the request (creates a PENDING reservation)
//
// A persistent right-side summary panel (and a mobile sticky bottom bar) shows
// the caregiver, selected services, dates, and a LIVE total that recomputes on
// every change. Login is required only to CONFIRM: the elder can build the whole
// booking signed-out, and on confirm we persist the in-progress booking and send
// them through the Phase-2 auth flow, returning to this EXACT step afterwards.
//
// No money moves here. The reservation is created PENDING via the SECURITY
// DEFINER create_reservation RPC (escrow held, not charged) and then awaits the
// caregiver's approval (a later phase).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { withReturnTo } from "@/lib/auth/returnTo";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatLevaAmount } from "@/lib/supabase/caregiverDashboard";
import type { RegionRow } from "@/lib/supabase/caregiverDashboard";
import {
  createReservation,
  type AvailableSlotsByDate,
  type BookableExtra,
  type BookableService,
} from "@/lib/supabase/booking";
import { toPublicDisplayName } from "@/lib/marketplace/publicName";

const STEP_KEYS = ["Time", "Duration", "Extras", "Review", "Confirm"] as const;
const LAST_STEP = STEP_KEYS.length - 1;

type PersistedState = {
  step: number;
  serviceIds: string[];
  slotIds: string[];
  extraIds: string[];
  regionId: string;
  recipientFirstName: string;
  addressNote: string;
};

export type BookingWizardProps = {
  caregiver: { id: string; display_name: string };
  services: BookableService[];
  extras: BookableExtra[];
  slotsByDate: AvailableSlotsByDate[];
  regions: RegionRow[];
  defaultRegionId: string;
  defaultRegionName: string;
  /** Services carried over from the marketplace search, pre-ticked at step 1. */
  initialServiceIds: string[];
  isSignedIn: boolean;
  /** Same-origin booking URL (with filters) used as the post-auth returnTo. */
  bookingPath: string;
  /** sessionStorage key — unique per caregiver. */
  storageKey: string;
};

function formatDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function BookingWizard({
  caregiver,
  services,
  extras,
  slotsByDate,
  regions,
  defaultRegionId,
  defaultRegionName,
  initialServiceIds,
  isSignedIn,
  bookingPath,
  storageKey,
}: BookingWizardProps) {
  const { t } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>(initialServiceIds);
  const [slotIds, setSlotIds] = useState<string[]>([]);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [regionId, setRegionId] = useState(defaultRegionId);
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [addressNote, setAddressNote] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    totalMinor: number;
  } | null>(null);

  const restoredRef = useRef(false);

  // Flat lookup of every available slot by id (for the summary + breakdown).
  const slotById = useMemo(() => {
    const map = new Map<
      string,
      { id: string; date: string; start: string; end: string }
    >();
    for (const group of slotsByDate) {
      for (const slot of group.slots) {
        map.set(slot.id, slot);
      }
    }
    return map;
  }, [slotsByDate]);

  // --- Restore an in-progress booking (survives refresh + the auth round-trip).
  useEffect(() => {
    if (restoredRef.current) {
      return;
    }
    restoredRef.current = true;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      const saved = JSON.parse(raw) as Partial<PersistedState>;
      // Keep only ids that still resolve to currently-available data, so a slot
      // booked by someone else while we were away simply drops out.
      const validServiceIds = new Set(services.map((s) => s.serviceId));
      const validExtraIds = new Set(extras.map((e) => e.id));
      setServiceIds((saved.serviceIds ?? []).filter((id) => validServiceIds.has(id)));
      setSlotIds((saved.slotIds ?? []).filter((id) => slotById.has(id)));
      setExtraIds((saved.extraIds ?? []).filter((id) => validExtraIds.has(id)));
      if (saved.regionId) setRegionId(saved.regionId);
      if (saved.recipientFirstName) setRecipientFirstName(saved.recipientFirstName);
      if (saved.addressNote) setAddressNote(saved.addressNote);
      if (typeof saved.step === "number") {
        setStep(Math.min(Math.max(saved.step, 0), LAST_STEP));
      }
    } catch {
      // Corrupt/blocked storage — start fresh, never crash the booking.
    }
  }, [storageKey, services, extras, slotById]);

  const persist = useCallback(
    (next: PersistedState) => {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Storage may be unavailable (private mode) — non-fatal.
      }
    },
    [storageKey],
  );

  // Keep the persisted snapshot in sync with every change.
  useEffect(() => {
    if (!restoredRef.current) {
      return;
    }
    persist({
      step,
      serviceIds,
      slotIds,
      extraIds,
      regionId,
      recipientFirstName,
      addressNote,
    });
  }, [
    step,
    serviceIds,
    slotIds,
    extraIds,
    regionId,
    recipientFirstName,
    addressNote,
    persist,
  ]);

  // --- Derived pricing (live) ------------------------------------------------
  const selectedServices = useMemo(
    () => services.filter((s) => serviceIds.includes(s.serviceId)),
    [services, serviceIds],
  );
  const selectedExtras = useMemo(
    () => extras.filter((e) => extraIds.includes(e.id)),
    [extras, extraIds],
  );
  const slotCount = slotIds.length;
  const perSlotServiceMinor = selectedServices.reduce(
    (sum, s) => sum + s.priceMinor,
    0,
  );
  const serviceSubtotalMinor = perSlotServiceMinor * slotCount;
  const extrasSubtotalMinor = selectedExtras.reduce(
    (sum, e) => sum + e.priceMinor,
    0,
  );
  const totalMinor = serviceSubtotalMinor + extrasSubtotalMinor;

  const selectedDates = useMemo(() => {
    const dates = new Set<string>();
    for (const id of slotIds) {
      const slot = slotById.get(id);
      if (slot) dates.add(slot.date);
    }
    return Array.from(dates).sort((a, b) => a.localeCompare(b));
  }, [slotIds, slotById]);

  // --- Toggles ---------------------------------------------------------------
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  // --- Step gating -----------------------------------------------------------
  const canLeaveStep = (current: number): string | null => {
    if (current === 0) {
      if (serviceIds.length === 0) return t("Choose at least one service to continue.");
      if (slotIds.length === 0) return t("Choose at least one time slot to continue.");
    }
    if (current === 3 && !regionId) {
      return t("Choose the district where the visit takes place.");
    }
    return null;
  };

  const goNext = () => {
    const blocker = canLeaveStep(step);
    if (blocker) {
      setErrorMessage(blocker);
      return;
    }
    setErrorMessage(null);
    setStep((s) => Math.min(s + 1, LAST_STEP));
  };
  const goBack = () => {
    setErrorMessage(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  // --- Confirm (auth-gated) --------------------------------------------------
  const handleConfirm = async () => {
    setErrorMessage(null);

    if (!isSignedIn) {
      // Persist so the elder returns to this exact step with selections intact,
      // then send them through the Phase-2 auth flow.
      persist({
        step,
        serviceIds,
        slotIds,
        extraIds,
        regionId,
        recipientFirstName,
        addressNote,
      });
      router.push(withReturnTo("/login", bookingPath));
      return;
    }

    if (serviceIds.length === 0 || slotIds.length === 0 || !regionId) {
      setErrorMessage(t("Please choose a service, a time slot, and a district before confirming."));
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setErrorMessage(envError);
      return;
    }

    setIsSubmitting(true);
    const result = await createReservation(supabase, {
      caregiverProfileId: caregiver.id,
      regionId,
      slotIds,
      serviceIds,
      extraIds,
      addressSnapshot: addressNote.trim() || null,
      recipientFirstName: recipientFirstName.trim() || null,
    });
    setIsSubmitting(false);

    if (result.errorMessage) {
      // Common, recoverable case: a slot was taken while the elder deliberated.
      const normalized = result.errorMessage.toLowerCase();
      if (normalized.includes("no longer available")) {
        setErrorMessage(
          t("One or more of your chosen time slots was just booked. Please go back and pick another slot."),
        );
      } else {
        setErrorMessage(
          t("We couldn't send your request right now. Please try again in a little while."),
        );
        console.error("create_reservation failed:", result.errorMessage);
      }
      return;
    }

    // Success — clear the in-progress draft and show the confirmation.
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      /* non-fatal */
    }
    setConfirmation({ totalMinor: result.totalAmountMinor ?? totalMinor });
  };

  const publicName = toPublicDisplayName(caregiver.display_name);

  // ---------------------------------------------------------------------------
  // Confirmation screen (replaces the wizard)
  // ---------------------------------------------------------------------------
  if (confirmation) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-moss/20 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-sage text-forest">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </div>
          <h2 className="mt-5 text-3xl font-bold text-forest">
            {t("Your request has been sent")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg leading-7 text-stone-700">
            {t("We've sent your booking request to")} {publicName}.{" "}
            {t("It is now pending the caregiver's approval. You'll be notified once they respond — no payment has been taken.")}
          </p>

          <dl className="mx-auto mt-6 grid max-w-sm gap-2 rounded-3xl bg-cream p-5 text-left text-sm">
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-stone-600">{t("Status")}</dt>
              <dd className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
                {t("Pending approval")}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-stone-600">{t("Time slots")}</dt>
              <dd className="font-bold text-forest">
                {slotCount} ({slotCount * 2} {t("hours")})
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="font-semibold text-stone-600">{t("Total (held, not charged)")}</dt>
              <dd className="font-bold text-forest">
                {formatLevaAmount(confirmation.totalMinor)} {t("лв.")}
              </dd>
            </div>
          </dl>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/account"
              className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800"
            >
              {t("Go to my account")}
            </Link>
            <Link
              href="/helpers"
              className="inline-flex min-h-12 items-center rounded-full border border-moss/30 bg-white px-6 py-3 font-semibold text-forest transition hover:bg-sage"
            >
              {t("Browse more caregivers")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Summary panel (right side on desktop, stacked on mobile) — live
  // ---------------------------------------------------------------------------
  const summaryPanel = (
    <div className="rounded-[2rem] border border-moss/20 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-clay">
        {t("Your booking")}
      </p>
      <h2 className="mt-1 text-xl font-bold text-forest">{publicName}</h2>

      <dl className="mt-5 space-y-4 text-sm">
        <div>
          <dt className="font-semibold text-stone-500">{t("Services")}</dt>
          <dd className="mt-1 font-semibold text-forest">
            {selectedServices.length > 0
              ? selectedServices.map((s) => t(s.name)).join(", ")
              : t("None selected yet")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">{t("Dates")}</dt>
          <dd className="mt-1 font-semibold text-forest">
            {selectedDates.length > 0
              ? selectedDates.map((d) => formatDateLabel(d)).join(" · ")
              : t("None selected yet")}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-stone-500">{t("Time")}</dt>
          <dd className="mt-1 font-semibold text-forest">
            {slotCount > 0
              ? `${slotCount} ${t(slotCount === 1 ? "slot" : "slots")} · ${slotCount * 2} ${t("hours")}`
              : t("None selected yet")}
          </dd>
        </div>
        {selectedExtras.length > 0 ? (
          <div>
            <dt className="font-semibold text-stone-500">{t("Extras")}</dt>
            <dd className="mt-1 font-semibold text-forest">
              {selectedExtras.map((e) => e.label).join(", ")}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 space-y-1.5 border-t border-sand pt-4 text-sm">
        <div className="flex items-center justify-between text-stone-600">
          <span>
            {t("Services")}
            {slotCount > 0 ? ` (× ${slotCount})` : ""}
          </span>
          <span>{formatLevaAmount(serviceSubtotalMinor)} {t("лв.")}</span>
        </div>
        {selectedExtras.length > 0 ? (
          <div className="flex items-center justify-between text-stone-600">
            <span>{t("Extras")}</span>
            <span>{formatLevaAmount(extrasSubtotalMinor)} {t("лв.")}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between pt-1.5 text-base font-bold text-forest">
          <span>{t("Total")}</span>
          <span>{formatLevaAmount(totalMinor)} {t("лв.")}</span>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sage/70 p-3 text-xs leading-5 text-forest">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("You won't be charged now. Your request is sent to the caregiver and the amount is only held once payments go live.")}
      </p>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Step bodies
  // ---------------------------------------------------------------------------
  const stepBody = (() => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-7">
            <section>
              <h3 className="text-lg font-bold text-forest">{t("Choose a service")}</h3>
              <p className="mt-1 text-sm text-stone-600">
                {t("Each service is priced per 2-hour visit.")}
              </p>
              {services.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-cream p-4 text-sm font-semibold text-stone-700">
                  {t("This caregiver hasn't published any services yet.")}
                </p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {services.map((service) => {
                    const active = serviceIds.includes(service.serviceId);
                    return (
                      <li key={service.serviceId}>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setServiceIds((cur) => toggle(cur, service.serviceId))}
                          className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-forest bg-sage ring-2 ring-forest/30"
                              : "border-moss/20 bg-white hover:border-moss/50 hover:bg-cream"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-forest">
                              {t(service.name)}
                            </span>
                            <span className="text-sm text-stone-600">
                              {formatLevaAmount(service.priceMinor)} {t("лв.")} / {t("2h")}
                            </span>
                          </span>
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                              active ? "border-forest bg-forest text-white" : "border-stone-300 text-transparent"
                            }`}
                          >
                            <Check className="size-4" aria-hidden="true" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-lg font-bold text-forest">{t("Pick your time slots")}</h3>
              <p className="mt-1 text-sm text-stone-600">
                {t("These are the caregiver's open 2-hour slots. Slots already booked are not shown. Pick one or more.")}
              </p>
              {slotsByDate.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-cream p-4 text-sm font-semibold text-stone-700">
                  {t("No open time slots for these dates. Try different dates from the search.")}
                </p>
              ) : (
                <div className="mt-4 space-y-5">
                  {slotsByDate.map((group) => (
                    <div key={group.date}>
                      <p className="flex items-center gap-2 text-sm font-bold text-forest">
                        <CalendarDays className="size-4 text-moss" aria-hidden="true" />
                        {formatDateLabel(group.date)}
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {group.slots.map((slot) => {
                          const active = slotIds.includes(slot.id);
                          return (
                            <li key={slot.id}>
                              <button
                                type="button"
                                aria-pressed={active}
                                onClick={() => setSlotIds((cur) => toggle(cur, slot.id))}
                                className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                  active
                                    ? "border-forest bg-forest text-white"
                                    : "border-moss/30 bg-white text-forest hover:bg-sage"
                                }`}
                              >
                                <Clock className="size-4" aria-hidden="true" />
                                {slot.start}–{slot.end}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        );

      case 1:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-forest">{t("Confirm the time you need")}</h3>
            <p className="text-sm text-stone-600">
              {t("Each slot is a 2-hour visit. Your price is the number of slots times the service price.")}
            </p>

            <div className="rounded-2xl bg-cream p-5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-forest">{t("Time slots selected")}</span>
                <span className="text-2xl font-bold text-forest">{slotCount}</span>
              </div>
              <p className="mt-1 text-sm text-stone-600">
                {slotCount * 2} {t("hours total")} · {selectedDates.length}{" "}
                {t(selectedDates.length === 1 ? "day" : "days")}
              </p>
            </div>

            {slotCount === 0 ? (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                {t("No slots selected yet — go back to add at least one.")}
              </p>
            ) : (
              <ul className="grid gap-2">
                {slotIds
                  .map((id) => slotById.get(id))
                  .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
                  .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
                  .map((slot) => (
                    <li
                      key={slot.id}
                      className="flex items-center justify-between rounded-2xl border border-moss/20 bg-white px-4 py-3 text-sm"
                    >
                      <span className="font-semibold text-forest">
                        {formatDateLabel(slot.date)} · {slot.start}–{slot.end}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSlotIds((cur) => cur.filter((x) => x !== slot.id))}
                        className="font-semibold text-clay underline-offset-2 hover:underline"
                      >
                        {t("Remove")}
                      </button>
                    </li>
                  ))}
              </ul>
            )}

            <div className="flex items-center justify-between rounded-2xl bg-sage p-4 text-sm">
              <span className="font-semibold text-forest">{t("Services subtotal")}</span>
              <span className="font-bold text-forest">
                {formatLevaAmount(serviceSubtotalMinor)} {t("лв.")}
              </span>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-forest">{t("Add optional extras")}</h3>
            <p className="text-sm text-stone-600">
              {t("Small add-ons this caregiver offers. The total updates as you choose.")}
            </p>
            {extras.length === 0 ? (
              <p className="rounded-2xl bg-cream p-4 text-sm font-semibold text-stone-700">
                {t("This caregiver hasn't added any optional extras. You can continue.")}
              </p>
            ) : (
              <ul className="grid gap-3">
                {extras.map((extra) => {
                  const active = extraIds.includes(extra.id);
                  return (
                    <li key={extra.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setExtraIds((cur) => toggle(cur, extra.id))}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-forest bg-sage ring-2 ring-forest/30"
                            : "border-moss/20 bg-white hover:border-moss/50 hover:bg-cream"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`grid size-6 shrink-0 place-items-center rounded-full border ${
                              active ? "border-forest bg-forest text-white" : "border-stone-300 text-transparent"
                            }`}
                          >
                            {active ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4 text-stone-400" aria-hidden="true" />}
                          </span>
                          <span className="font-bold text-forest">{extra.label}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-stone-600">
                          +{formatLevaAmount(extra.priceMinor)} {t("лв.")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-forest">{t("Review your booking")}</h3>
              <p className="mt-1 text-sm text-stone-600">
                {t("Check the details below, then add where the visit takes place.")}
              </p>
            </div>

            <dl className="grid gap-3 rounded-2xl border border-moss/20 bg-white p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">{t("Caregiver")}</dt>
                <dd className="text-right font-semibold text-forest">{publicName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">{t("Services")}</dt>
                <dd className="text-right font-semibold text-forest">
                  {selectedServices.map((s) => t(s.name)).join(", ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">{t("Dates")}</dt>
                <dd className="text-right font-semibold text-forest">
                  {selectedDates.map((d) => formatDateLabel(d)).join(" · ") || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">{t("Time slots")}</dt>
                <dd className="text-right font-semibold text-forest">
                  {slotCount} ({slotCount * 2} {t("hours")})
                </dd>
              </div>
              {selectedExtras.length > 0 ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-500">{t("Extras")}</dt>
                  <dd className="text-right font-semibold text-forest">
                    {selectedExtras.map((e) => e.label).join(", ")}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="space-y-4">
              <label className="block">
                <span className="font-semibold text-forest">{t("District for the visit")}</span>
                <select
                  value={regionId}
                  onChange={(event) => setRegionId(event.target.value)}
                  required
                  className="mt-2 w-full rounded-2xl border border-moss/30 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-forest"
                >
                  <option value="">{t("Select a district")}</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
                {defaultRegionName ? (
                  <span className="mt-1 block text-xs text-stone-500">
                    {t("Carried over from your search:")} {defaultRegionName}
                  </span>
                ) : null}
              </label>

              <label className="block">
                <span className="font-semibold text-forest">
                  {t("Who is the visit for?")}{" "}
                  <span className="font-normal text-stone-500">({t("optional")})</span>
                </span>
                <input
                  value={recipientFirstName}
                  onChange={(event) => setRecipientFirstName(event.target.value)}
                  placeholder={t("First name")}
                  className="mt-2 w-full rounded-2xl border border-moss/30 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-forest"
                />
              </label>

              <label className="block">
                <span className="font-semibold text-forest">
                  {t("Address or directions")}{" "}
                  <span className="font-normal text-stone-500">({t("optional, private")})</span>
                </span>
                <textarea
                  value={addressNote}
                  onChange={(event) => setAddressNote(event.target.value)}
                  rows={3}
                  placeholder={t("Shared with the caregiver only after they approve.")}
                  className="mt-2 w-full rounded-2xl border border-moss/30 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-forest"
                />
                <span className="mt-1 block text-xs leading-5 text-stone-500">
                  {t("Keep it practical and non-medical. Never include card PINs, passwords, or access-to-valuables requests.")}
                </span>
              </label>
            </div>
          </div>
        );

      case LAST_STEP:
      default:
        return (
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-forest">{t("Confirm and send")}</h3>
            <p className="text-sm leading-6 text-stone-600">
              {t("Sending this request reserves the caregiver's time and holds the amount — without charging anything yet. The caregiver then approves or declines.")}
            </p>

            <div className="space-y-1.5 rounded-2xl border border-moss/20 bg-white p-5 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>{t("Services")} (× {slotCount})</span>
                <span>{formatLevaAmount(serviceSubtotalMinor)} {t("лв.")}</span>
              </div>
              {selectedExtras.length > 0 ? (
                <div className="flex justify-between text-stone-600">
                  <span>{t("Extras")}</span>
                  <span>{formatLevaAmount(extrasSubtotalMinor)} {t("лв.")}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-sand pt-2 text-base font-bold text-forest">
                <span>{t("Total")}</span>
                <span>{formatLevaAmount(totalMinor)} {t("лв.")}</span>
              </div>
            </div>

            {!isSignedIn ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p className="font-bold">{t("One quick step: please sign in")}</p>
                <p className="mt-1">
                  {t("To send your request you'll sign in or create a free account. We'll bring you right back to this step with everything you chose still here.")}
                </p>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-2xl bg-sage/70 p-4 text-sm leading-6 text-forest">
                <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {t("All set. The caregiver will see your request and respond. You can track it from your account.")}
              </p>
            )}

            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-forest/20 transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  {t("Sending…")}
                </>
              ) : isSignedIn ? (
                t("Send booking request")
              ) : (
                t("Sign in to send request")
              )}
            </button>
          </div>
        );
    }
  })();

  // ---------------------------------------------------------------------------
  // Layout: stepper + step body (left) and the persistent summary (right).
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {STEP_KEYS.map((key, index) => {
          const reached = index <= step;
          return (
            <li key={key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold transition ${
                  index === step
                    ? "bg-forest text-white"
                    : reached
                      ? "bg-sage text-forest hover:bg-moss/20"
                      : "bg-stone-100 text-stone-400"
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-xs ${
                    index === step ? "bg-white text-forest" : reached ? "bg-forest/15 text-forest" : "bg-stone-200 text-stone-400"
                  }`}
                >
                  {index < step ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className="hidden sm:inline">
                  {t(
                    key === "Time"
                      ? "Time"
                      : key === "Duration"
                        ? "Duration"
                        : key === "Extras"
                          ? "Extras"
                          : key === "Review"
                            ? "Review"
                            : "Confirm",
                  )}
                </span>
              </button>
              {index < LAST_STEP ? (
                <span className="hidden h-px w-4 bg-sand sm:block" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        {/* Left: the active step */}
        <div className="rounded-[2rem] border border-moss/20 bg-white p-5 shadow-sm sm:p-7">
          {stepBody}

          {errorMessage ? (
            <p
              className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}

          {/* Desktop nav (mobile uses the sticky bar below) */}
          <div className="mt-7 hidden items-center justify-between gap-3 sm:flex">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-moss/30 bg-white px-5 py-2.5 font-semibold text-forest transition hover:bg-sage disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("Back")}
            </button>
            {step < LAST_STEP ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 py-2.5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-800"
              >
                {t("Continue")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Right: persistent live summary (stacks above the sticky bar on mobile) */}
        <aside className="lg:sticky lg:top-24">{summaryPanel}</aside>
      </div>

      {/* Mobile sticky bottom bar — dates + live total + next, like BuddyGuard. */}
      <div className="sticky bottom-0 z-20 mt-6 -mx-5 border-t border-sand bg-white/95 px-5 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-stone-500">
              {selectedDates.length > 0
                ? selectedDates.map((d) => formatDateLabel(d)).join(" · ")
                : t("Pick your slots")}
            </p>
            <p className="text-lg font-bold text-forest">
              {formatLevaAmount(totalMinor)} {t("лв.")}
            </p>
          </div>
          {step < LAST_STEP ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-forest px-6 py-2.5 font-bold text-white transition hover:bg-stone-800"
            >
              {t("Continue")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={isSubmitting}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-forest px-6 py-2.5 font-bold text-white transition hover:bg-stone-800 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : null}
              {isSignedIn ? t("Send") : t("Sign in")}
            </button>
          )}
        </div>
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-forest"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("Back")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
