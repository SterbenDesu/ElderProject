import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ReservationLineItem,
  ReservationSlot,
} from "@/lib/supabase/reservations";

// Admin-only data layer for the dispute review queue (Phase 10).
//
// SECURITY: both calls go through SECURITY DEFINER RPCs that re-check
// public.is_admin() server-side and raise for everyone else, so a normal user
// can never read or resolve another user's dispute. No money moves here — the
// resolution only sets STATES that Phase 11's Stripe logic will act on.

export type AdminDispute = {
  reservationId: string;
  disputeId: string | null;
  disputeStatus: string | null;
  reportedAt: string | null;
  issueDetails: string | null;
  elderName: string | null;
  caregiverName: string | null;
  regionName: string | null;
  startAt: string;
  endAt: string;
  totalAmountMinor: number;
  currency: string;
  paymentStatus: string | null;
  payoutStatus: string | null;
  services: ReservationLineItem[];
  slots: ReservationSlot[];
};

export type DisputeResolution = "release" | "refund";

type LineItemJson = {
  label: string;
  unit_price: number;
  quantity: number;
  is_extra: boolean;
};

type SlotJson = { date: string; start: string; end: string };

function mapLineItems(value: unknown): ReservationLineItem[] {
  return ((value as LineItemJson[] | null) ?? []).map((item) => ({
    label: item.label,
    unitPriceMinor: item.unit_price,
    quantity: item.quantity,
    isExtra: item.is_extra,
  }));
}

function mapSlots(value: unknown): ReservationSlot[] {
  return ((value as SlotJson[] | null) ?? []).map((slot) => ({
    date: slot.date,
    start: slot.start.length >= 5 ? slot.start.slice(0, 5) : slot.start,
    end: slot.end.length >= 5 ? slot.end.slice(0, 5) : slot.end,
  }));
}

type AdminDisputeRpcRow = {
  reservation_id: string;
  dispute_id: string | null;
  dispute_status: string | null;
  reported_at: string | null;
  issue_details: string | null;
  elder_name: string | null;
  caregiver_name: string | null;
  region_name: string | null;
  start_at: string;
  end_at: string;
  total_amount: number;
  currency: string;
  payment_status: string | null;
  payout_status: string | null;
  services: unknown;
  slots: unknown;
};

export async function loadAdminDisputes(
  supabase: SupabaseClient,
): Promise<{ disputes: AdminDispute[]; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("get_admin_disputes");

  if (error) {
    return { disputes: [], errorMessage: error.message };
  }

  const disputes: AdminDispute[] = (
    (data as AdminDisputeRpcRow[] | null) ?? []
  ).map((row) => ({
    reservationId: row.reservation_id,
    disputeId: row.dispute_id,
    disputeStatus: row.dispute_status,
    reportedAt: row.reported_at,
    issueDetails: row.issue_details,
    elderName: row.elder_name,
    caregiverName: row.caregiver_name,
    regionName: row.region_name,
    startAt: row.start_at,
    endAt: row.end_at,
    totalAmountMinor: row.total_amount,
    currency: row.currency,
    paymentStatus: row.payment_status,
    payoutStatus: row.payout_status,
    services: mapLineItems(row.services),
    slots: mapSlots(row.slots),
  }));

  return { disputes, errorMessage: null };
}

// Resolve a dispute. `release` -> reservation completed + payout ready_for_release;
// `refund` -> reservation cancelled + payment to_be_refunded. Both set STATES only.
export async function resolveDispute(
  supabase: SupabaseClient,
  reservationId: string,
  resolution: DisputeResolution,
  adminNotes?: string,
): Promise<{ status: string | null; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("resolve_dispute", {
    p_reservation_id: reservationId,
    p_resolution: resolution,
    p_admin_notes: adminNotes ?? null,
  });

  if (error) {
    return { status: null, errorMessage: error.message };
  }

  const result = (data as { status?: string } | null) ?? null;
  return { status: result?.status ?? null, errorMessage: null };
}
