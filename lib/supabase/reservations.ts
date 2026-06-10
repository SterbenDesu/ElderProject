import type { SupabaseClient } from "@supabase/supabase-js";

// Data layer for the elder + caregiver reservation views (Phase 8).
//
// SECURITY / one-way rule: the two list RPCs are SECURITY DEFINER and re-scope
// every row to auth.uid() — a caregiver only ever reads reservations directed at
// their OWN caregiver profile, and only the elder's FIRST NAME + district (never
// phone/email; the precise address only after approval). State changes go through
// transition_reservation, the single choke point that re-checks the caller.

export type ReservationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "disputed"
  | "cancelled";

export type ReservationLineItem = {
  label: string;
  unitPriceMinor: number;
  quantity: number;
  isExtra: boolean;
};

export type ReservationSlot = {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
};

export type CaregiverRequest = {
  reservationId: string;
  status: ReservationStatus;
  elderFirstName: string | null;
  regionName: string | null;
  /** Precise address — null until the caregiver approves the request. */
  addressSnapshot: string | null;
  startAt: string;
  endAt: string;
  totalAmountMinor: number;
  currency: string;
  createdAt: string;
  services: ReservationLineItem[];
  slots: ReservationSlot[];
  hasChat: boolean;
};

export type ElderReservation = {
  reservationId: string;
  status: ReservationStatus;
  caregiverName: string | null;
  regionName: string | null;
  startAt: string;
  endAt: string;
  totalAmountMinor: number;
  currency: string;
  createdAt: string;
  services: ReservationLineItem[];
  slots: ReservationSlot[];
  hasChat: boolean;
};

type LineItemJson = {
  label: string;
  unit_price: number;
  quantity: number;
  is_extra: boolean;
};

type SlotJson = { date: string; start: string; end: string };

function toTimeLabel(time: string): string {
  // Postgres `time` serialises as "HH:MM:SS"; trim to "HH:MM".
  return time.length >= 5 ? time.slice(0, 5) : time;
}

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
    start: toTimeLabel(slot.start),
    end: toTimeLabel(slot.end),
  }));
}

type CaregiverRequestRpcRow = {
  reservation_id: string;
  status: string;
  elder_first_name: string | null;
  region_name: string | null;
  address_snapshot: string | null;
  start_at: string;
  end_at: string;
  total_amount: number;
  currency: string;
  created_at: string;
  services: unknown;
  slots: unknown;
  has_chat: boolean;
};

export async function loadCaregiverRequests(
  supabase: SupabaseClient,
): Promise<{ requests: CaregiverRequest[]; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("get_caregiver_requests");

  if (error) {
    return { requests: [], errorMessage: error.message };
  }

  const requests: CaregiverRequest[] = (
    (data as CaregiverRequestRpcRow[] | null) ?? []
  ).map((row) => ({
    reservationId: row.reservation_id,
    status: row.status as ReservationStatus,
    elderFirstName: row.elder_first_name,
    regionName: row.region_name,
    addressSnapshot: row.address_snapshot,
    startAt: row.start_at,
    endAt: row.end_at,
    totalAmountMinor: row.total_amount,
    currency: row.currency,
    createdAt: row.created_at,
    services: mapLineItems(row.services),
    slots: mapSlots(row.slots),
    hasChat: row.has_chat,
  }));

  return { requests, errorMessage: null };
}

type ElderReservationRpcRow = {
  reservation_id: string;
  status: string;
  caregiver_name: string | null;
  region_name: string | null;
  start_at: string;
  end_at: string;
  total_amount: number;
  currency: string;
  created_at: string;
  services: unknown;
  slots: unknown;
  has_chat: boolean;
};

export async function loadElderReservations(
  supabase: SupabaseClient,
): Promise<{ reservations: ElderReservation[]; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("get_elder_reservations");

  if (error) {
    return { reservations: [], errorMessage: error.message };
  }

  const reservations: ElderReservation[] = (
    (data as ElderReservationRpcRow[] | null) ?? []
  ).map((row) => ({
    reservationId: row.reservation_id,
    status: row.status as ReservationStatus,
    caregiverName: row.caregiver_name,
    regionName: row.region_name,
    startAt: row.start_at,
    endAt: row.end_at,
    totalAmountMinor: row.total_amount,
    currency: row.currency,
    createdAt: row.created_at,
    services: mapLineItems(row.services),
    slots: mapSlots(row.slots),
    hasChat: row.has_chat,
  }));

  return { reservations, errorMessage: null };
}

export type ReservationAction =
  | "approve"
  | "reject"
  | "cancel"
  | "complete"
  | "report";

// Drives a reservation transition through the single SECURITY DEFINER choke
// point. The DB re-checks that the caller is the right party for the action,
// validates it against the state machine, moves slots + escrow status, opens the
// chat thread on approval, and writes the notification + audit log.
//
// `detail` carries the elder's free-text issue description for the "report"
// action; it is stored on the dispute record and ignored for other actions. No
// money ever moves here — only STATUS fields (Phase 11 acts on those).
export async function transitionReservation(
  supabase: SupabaseClient,
  reservationId: string,
  action: ReservationAction,
  detail?: string,
): Promise<{ status: ReservationStatus | null; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("transition_reservation", {
    p_reservation_id: reservationId,
    p_action: action,
    p_detail: detail ?? null,
  });

  if (error) {
    return { status: null, errorMessage: error.message };
  }

  const result = (data as { status?: string } | null) ?? null;
  return { status: (result?.status as ReservationStatus) ?? null, errorMessage: null };
}

// MVP completion detection (no background job): advance the caller's own
// reservations approved -> in_progress -> awaiting_confirmation by comparing the
// booked window to the clock. Call this on page load BEFORE listing reservations
// so a booking whose end time has passed surfaces the elder's close-out buttons.
// Failure is non-fatal — the list still renders with the stored statuses.
export async function refreshReservationProgress(
  supabase: SupabaseClient,
): Promise<{ promoted: number; errorMessage: string | null }> {
  const { data, error } = await supabase.rpc("refresh_reservation_progress");

  if (error) {
    return { promoted: 0, errorMessage: error.message };
  }

  return { promoted: (data as number | null) ?? 0, errorMessage: null };
}
