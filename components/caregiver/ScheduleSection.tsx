"use client";

// Section 2 of the caregiver dashboard: publish availability as 2-hour slots.
//
// SCHEDULE MODEL: the single source of truth is the live `availability_slots`
// table — concrete dated 2-hour rows, each with its own status (open/held/
// booked/blocked). That per-slot status is exactly what lets a future booking
// flow mark one slot taken without double-booking. This UI offers two ways to
// create those rows: a tappable WEEK grid (specific dates) and a RECURRING
// weekly pattern that materialises open slots across the next few weeks. There
// is no separate recurring table — recurring just generates dated rows.

import {
  CalendarDays,
  CircleCheck,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  addDays,
  createAvailabilitySlots,
  deleteAvailabilitySlot,
  loadAvailabilitySlots,
  startOfWeek,
  TIME_SLOTS,
  toDateKey,
  toSlotStart,
  WEEKDAYS,
  type AvailabilitySlotRow,
} from "@/lib/supabase/caregiverDashboard";

const cardClass =
  "rounded-[2rem] border border-sand bg-white p-6 shadow-sm sm:p-8";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60";

const DEFAULT_HORIZON_WEEKS = 4;

function cellKey(dateKey: string, start: string) {
  return `${dateKey}|${start}`;
}

function isPast(dateKey: string, start: string): boolean {
  const slotStart = new Date(`${dateKey}T${start}:00`);
  return slotStart.getTime() <= Date.now();
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
      date,
    );
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

function formatDayHeading(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

export function ScheduleSection({
  caregiverProfileId,
}: {
  caregiverProfileId: string;
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [slots, setSlots] = useState<AvailabilitySlotRow[]>([]);
  const [weekOpen, setWeekOpen] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [savingWeek, setSavingWeek] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);
  const [weekSuccess, setWeekSuccess] = useState<string | null>(null);

  // Recurring pattern: map of "<jsDay>-<start>" -> selected.
  const [pattern, setPattern] = useState<Set<string>>(new Set());
  const [horizonWeeks, setHorizonWeeks] = useState(DEFAULT_HORIZON_WEEKS);
  const [publishing, setPublishing] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [recurringSuccess, setRecurringSuccess] = useState<string | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const loadWeek = useCallback(async () => {
    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setLoadError(envError);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setWeekSuccess(null);
    setWeekError(null);

    const fromDate = toDateKey(weekStart);
    const toDate = toDateKey(addDays(weekStart, 6));
    const { data, errorMessage } = await loadAvailabilitySlots(
      supabase,
      caregiverProfileId,
      fromDate,
      toDate,
    );

    if (errorMessage) {
      setLoadError(errorMessage);
      setIsLoading(false);
      return;
    }

    setSlots(data);
    const open = new Set<string>();
    for (const slot of data) {
      if (slot.status === "open") {
        open.add(cellKey(slot.slot_date, toSlotStart(slot.start_time)));
      }
    }
    setWeekOpen(open);
    setIsLoading(false);
  }, [caregiverProfileId, weekStart]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  const slotByCell = useMemo(() => {
    const map = new Map<string, AvailabilitySlotRow>();
    for (const slot of slots) {
      map.set(cellKey(slot.slot_date, toSlotStart(slot.start_time)), slot);
    }
    return map;
  }, [slots]);

  function toggleCell(dateKey: string, start: string) {
    const key = cellKey(dateKey, start);
    const existing = slotByCell.get(key);
    if (existing && existing.status !== "open") {
      return; // locked (held/booked/blocked) — cannot edit here
    }
    if (isPast(dateKey, start)) {
      return;
    }
    setWeekSuccess(null);
    setWeekOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSaveWeek() {
    setWeekError(null);
    setWeekSuccess(null);

    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setWeekError(envError);
      return;
    }

    // Diff the editable (future, non-locked) cells against what is stored.
    const toCreate: { slotDate: string; start: string }[] = [];
    const toDelete: string[] = [];

    for (const day of weekDays) {
      const dateKey = toDateKey(day);
      for (const slot of TIME_SLOTS) {
        if (isPast(dateKey, slot.start)) {
          continue;
        }
        const key = cellKey(dateKey, slot.start);
        const existing = slotByCell.get(key);
        if (existing && existing.status !== "open") {
          continue; // locked
        }
        const wantOpen = weekOpen.has(key);
        if (wantOpen && !existing) {
          toCreate.push({ slotDate: dateKey, start: slot.start });
        } else if (!wantOpen && existing && existing.status === "open") {
          toDelete.push(existing.id);
        }
      }
    }

    if (toCreate.length === 0 && toDelete.length === 0) {
      setWeekSuccess("No changes to save for this week.");
      return;
    }

    setSavingWeek(true);

    if (toCreate.length > 0) {
      const { errorMessage } = await createAvailabilitySlots(
        supabase,
        caregiverProfileId,
        toCreate,
      );
      if (errorMessage) {
        setSavingWeek(false);
        setWeekError(`Could not add slots: ${errorMessage}`);
        return;
      }
    }

    for (const slotId of toDelete) {
      const { errorMessage } = await deleteAvailabilitySlot(
        supabase,
        caregiverProfileId,
        slotId,
      );
      if (errorMessage) {
        setSavingWeek(false);
        setWeekError(`Could not remove a slot: ${errorMessage}`);
        return;
      }
    }

    setSavingWeek(false);
    setWeekSuccess(
      `Saved. Added ${toCreate.length} and removed ${toDelete.length} slot(s).`,
    );
    await loadWeek();
  }

  function togglePattern(jsDay: number, start: string) {
    setRecurringSuccess(null);
    const key = `${jsDay}-${start}`;
    setPattern((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handlePublishRecurring() {
    setRecurringError(null);
    setRecurringSuccess(null);

    if (pattern.size === 0) {
      setRecurringError("Select at least one weekday and time slot first.");
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setRecurringError(envError);
      return;
    }

    // Generate concrete dated slots for the next N weeks, starting today.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonEnd = addDays(today, horizonWeeks * 7);
    const toCreate: { slotDate: string; start: string }[] = [];

    for (
      let day = new Date(today);
      day <= horizonEnd;
      day = addDays(day, 1)
    ) {
      const jsDay = day.getDay();
      const dateKey = toDateKey(day);
      for (const slot of TIME_SLOTS) {
        if (!pattern.has(`${jsDay}-${slot.start}`)) {
          continue;
        }
        if (isPast(dateKey, slot.start)) {
          continue;
        }
        toCreate.push({ slotDate: dateKey, start: slot.start });
      }
    }

    if (toCreate.length === 0) {
      setRecurringError("This pattern produced no upcoming slots to publish.");
      return;
    }

    setPublishing(true);
    const { errorMessage } = await createAvailabilitySlots(
      supabase,
      caregiverProfileId,
      toCreate,
    );
    setPublishing(false);

    if (errorMessage) {
      setRecurringError(`Could not publish your pattern: ${errorMessage}`);
      return;
    }

    setRecurringSuccess(
      `Published your weekly pattern for the next ${horizonWeeks} weeks. Already-existing slots were kept.`,
    );
    await loadWeek();
  }

  return (
    <div className="grid gap-5">
      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linen text-terracotta">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-espresso">
              My schedule
            </h2>
            <p className="mt-1 text-base leading-7 text-espresso-light">
              Tap the 2-hour slots you are available, then save the week. Booked
              slots are locked and shown for reference.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
              className="inline-flex min-h-11 items-center rounded-full border border-sand bg-white px-4 py-2 text-sm font-bold text-terracotta transition hover:bg-linen"
            >
              Previous week
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
              className="inline-flex min-h-11 items-center rounded-full border border-sand bg-white px-4 py-2 text-sm font-bold text-terracotta transition hover:bg-linen"
            >
              Next week
            </button>
          </div>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-bold text-espresso-light transition hover:text-terracotta"
          >
            This week
          </button>
          <p className="flex items-center gap-2 text-base font-bold text-espresso">
            <Clock className="size-4 text-terracotta" aria-hidden="true" />
            {formatWeekLabel(weekStart)}
          </p>
        </div>

        {isLoading ? (
          <p
            className="mt-6 flex items-center gap-2 text-espresso-light"
            role="status"
          >
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            Loading your week…
          </p>
        ) : loadError ? (
          <p
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
            role="alert"
          >
            {loadError}
          </p>
        ) : (
          <div className="mt-6 -mx-2 overflow-x-auto px-2">
            <div className="grid min-w-[640px] grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1.5">
              <div aria-hidden="true" />
              {weekDays.map((day) => (
                <div
                  key={toDateKey(day)}
                  className="px-1 pb-1 text-center text-xs font-bold uppercase tracking-wide text-espresso-light"
                >
                  {formatDayHeading(day)}
                </div>
              ))}

              {TIME_SLOTS.map((slot) => (
                <div key={slot.start} className="contents">
                  <div className="flex items-center justify-end pr-2 text-xs font-bold text-espresso-light">
                    {slot.start}–{slot.end}
                  </div>
                  {weekDays.map((day) => {
                    const dateKey = toDateKey(day);
                    const key = cellKey(dateKey, slot.start);
                    const existing = slotByCell.get(key);
                    const past = isPast(dateKey, slot.start);
                    const locked = Boolean(
                      existing && existing.status !== "open",
                    );
                    const open = weekOpen.has(key);

                    let label = "Add";
                    let cls =
                      "border-sand bg-ivory text-espresso-light hover:border-terracotta/40 hover:bg-linen";
                    if (locked) {
                      label =
                        existing?.status === "booked"
                          ? "Booked"
                          : existing?.status === "held"
                            ? "Held"
                            : "Blocked";
                      cls =
                        "border-espresso/20 bg-espresso/10 text-espresso cursor-not-allowed";
                    } else if (past) {
                      label = "—";
                      cls =
                        "border-transparent bg-transparent text-stone-300 cursor-not-allowed";
                    } else if (open) {
                      label = "Open";
                      cls =
                        "border-terracotta bg-terracotta text-white hover:bg-terracotta-dark";
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={locked || past}
                        onClick={() => toggleCell(dateKey, slot.start)}
                        aria-pressed={open}
                        aria-label={`${formatDayHeading(day)} ${slot.start} to ${slot.end} — ${label}`}
                        className={`min-h-12 rounded-xl border text-xs font-bold transition ${cls}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {weekError ? (
          <p
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {weekError}
          </p>
        ) : null}
        {weekSuccess ? (
          <p
            className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            <CircleCheck className="size-4" aria-hidden="true" />
            {weekSuccess}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSaveWeek}
          disabled={savingWeek || isLoading}
          className={`mt-6 ${primaryButtonClass}`}
        >
          {savingWeek ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {savingWeek ? "Saving…" : "Save this week"}
        </button>
      </div>

      <div className={cardClass}>
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linen text-terracotta">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-espresso">
              Recurring weekly pattern
            </h2>
            <p className="mt-1 text-base leading-7 text-espresso-light">
              Pick the slots you are usually free, then publish them across the
              coming weeks. This adds open slots and never overwrites booked
              ones.
            </p>
          </div>
        </div>

        <div className="mt-6 -mx-2 overflow-x-auto px-2">
          <div className="grid min-w-[640px] grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1.5">
            <div aria-hidden="true" />
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday.jsDay}
                className="px-1 pb-1 text-center text-xs font-bold uppercase tracking-wide text-espresso-light"
              >
                {weekday.short}
              </div>
            ))}

            {TIME_SLOTS.map((slot) => (
              <div key={slot.start} className="contents">
                <div className="flex items-center justify-end pr-2 text-xs font-bold text-espresso-light">
                  {slot.start}–{slot.end}
                </div>
                {WEEKDAYS.map((weekday) => {
                  const key = `${weekday.jsDay}-${slot.start}`;
                  const selected = pattern.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePattern(weekday.jsDay, slot.start)}
                      aria-pressed={selected}
                      aria-label={`${weekday.label} ${slot.start} to ${slot.end}`}
                      className={`min-h-12 rounded-xl border text-xs font-bold transition ${
                        selected
                          ? "border-terracotta bg-terracotta text-white hover:bg-terracotta-dark"
                          : "border-sand bg-ivory text-espresso-light hover:border-terracotta/40 hover:bg-linen"
                      }`}
                    >
                      {selected ? "On" : "Off"}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-base font-bold text-espresso">
            Publish for the next
            <select
              value={horizonWeeks}
              onChange={(event) => setHorizonWeeks(Number(event.target.value))}
              className="min-h-12 rounded-2xl border border-sand bg-white px-3 py-2 text-base font-semibold text-espresso focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25"
            >
              {[1, 2, 4, 6, 8].map((weeks) => (
                <option key={weeks} value={weeks}>
                  {weeks}
                </option>
              ))}
            </select>
            weeks
          </label>
        </div>

        {recurringError ? (
          <p
            className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            role="alert"
          >
            {recurringError}
          </p>
        ) : null}
        {recurringSuccess ? (
          <p
            className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
            role="status"
          >
            <CircleCheck className="size-4" aria-hidden="true" />
            {recurringSuccess}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handlePublishRecurring}
          disabled={publishing}
          className={`mt-6 ${primaryButtonClass}`}
        >
          {publishing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {publishing ? "Publishing…" : "Publish weekly pattern"}
        </button>
      </div>
    </div>
  );
}
