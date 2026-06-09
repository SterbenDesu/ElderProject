// Pure presentation helpers shared by the caregiver Requests view and the elder
// My-bookings view. Status labels are returned in English so components can pass
// them through the i18n `t()` translator (BG strings live in phraseTranslations).

import type { ReservationSlot, ReservationStatus } from "@/lib/supabase/reservations";

// English status label (translate at the call site with t()).
export function reservationStatusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Declined",
    in_progress: "In progress",
    awaiting_confirmation: "Awaiting confirmation",
    completed: "Completed",
    disputed: "Reported",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

// Tailwind classes for the status pill, by semantic tone.
export function reservationStatusClasses(status: ReservationStatus): string {
  switch (status) {
    case "approved":
    case "completed":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
    case "rejected":
    case "cancelled":
      return "bg-stone-100 text-stone-600 ring-1 ring-stone-200";
    case "disputed":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    case "pending":
    default:
      return "bg-sage text-forest ring-1 ring-moss/20";
  }
}

// Each published slot is a fixed 2-hour block, so total duration is simply the
// number of booked slots × 2 hours.
export function totalDurationHours(slots: ReservationSlot[]): number {
  return slots.length * 2;
}

// Group slots by date and collapse each date's slots into "HH:MM–HH:MM" ranges.
export function slotsByDate(
  slots: ReservationSlot[],
): { date: string; ranges: string[] }[] {
  const grouped = new Map<string, string[]>();
  for (const slot of slots) {
    const list = grouped.get(slot.date) ?? [];
    list.push(`${slot.start}–${slot.end}`);
    grouped.set(slot.date, list);
  }
  return Array.from(grouped.entries())
    .map(([date, ranges]) => ({ date, ranges }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
