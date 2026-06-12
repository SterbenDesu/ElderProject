import type { SupabaseClient } from "@supabase/supabase-js";
import { toSlotStart } from "@/lib/supabase/caregiverDashboard";

// Data layer for the elder-facing booking flow (book a specific caregiver).
//
// SECURITY / one-way rule: every read here runs with the publishable (anon) key
// and the signed-in elder's session. RLS already restricts each table to PUBLIC,
// caregiver-side rows of VISIBLE + VERIFIED caregivers and SAFE columns only:
//   - caregiver_services / service_extras : active rows of visible+verified
//     caregivers (so hidden caregivers' prices never leak).
//   - availability_slots                  : ONLY status = 'open' slots of
//     visible+verified caregivers. Held/booked/blocked slots are never returned,
//     so "available = published open" already excludes already-booked slots.
// None of these tables hold elder data — this flow can never enumerate elders.
//
// The reservation itself is created through the SECURITY DEFINER RPC
// create_reservation, which re-checks the caller, locks + holds the slots, and
// snapshots prices server-side. The browser never writes reservations, slots, or
// payments directly. Prices are MINOR UNITS (стотинки), displayed in лв.

// ---------------------------------------------------------------------------
// Offered services (with this caregiver's per-slot price)
// ---------------------------------------------------------------------------

export type BookableService = {
  serviceId: string;
  name: string;
  slug: string;
  /** This caregiver's price for one 2-hour slot, in minor units. */
  priceMinor: number;
};

type CaregiverServiceJoinRow = {
  service_id: string;
  price_amount: number;
  services: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export async function loadBookableServices(
  supabase: SupabaseClient,
  caregiverProfileId: string,
): Promise<{ services: BookableService[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("caregiver_services")
    .select("service_id,price_amount,services(name,slug)")
    .eq("caregiver_profile_id", caregiverProfileId)
    .eq("is_active", true);

  if (error) {
    return { services: [], errorMessage: error.message };
  }

  const services: BookableService[] = (
    (data as unknown as CaregiverServiceJoinRow[] | null) ?? []
  )
    .map((row) => {
      const service = Array.isArray(row.services) ? row.services[0] : row.services;
      if (!service?.name) {
        return null;
      }
      return {
        serviceId: row.service_id,
        name: service.name,
        slug: service.slug,
        priceMinor: row.price_amount,
      };
    })
    .filter((service): service is BookableService => Boolean(service))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { services, errorMessage: null };
}

// ---------------------------------------------------------------------------
// Optional extras
// ---------------------------------------------------------------------------

export type BookableExtra = {
  id: string;
  label: string;
  priceMinor: number;
};

export async function loadBookableExtras(
  supabase: SupabaseClient,
  caregiverProfileId: string,
): Promise<{ extras: BookableExtra[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("service_extras")
    .select("id,label,price_amount")
    .eq("caregiver_profile_id", caregiverProfileId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return { extras: [], errorMessage: error.message };
  }

  const extras: BookableExtra[] = (
    (data as { id: string; label: string; price_amount: number }[] | null) ?? []
  ).map((row) => ({ id: row.id, label: row.label, priceMinor: row.price_amount }));

  return { extras, errorMessage: null };
}

// ---------------------------------------------------------------------------
// Available 2-hour slots
// ---------------------------------------------------------------------------
//
// "Available" = the caregiver's PUBLISHED open slots MINUS any slot already taken
// by a pending/approved reservation. We do not subtract anything in JS: a slot is
// flipped to 'held' (pending) or 'booked' (approved) by create_reservation /
// transition_reservation, and the availability_slots public RLS policy only
// returns status = 'open'. So a slot tied to an existing pending/approved
// reservation simply disappears from this query — the exclusion is enforced in
// the database, the same place that holds the slot, which keeps it consistent.

export type AvailableSlot = {
  id: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
};

export type AvailableSlotsByDate = {
  date: string;
  slots: AvailableSlot[];
};

export async function loadAvailableSlots(
  supabase: SupabaseClient,
  caregiverProfileId: string,
  fromDate: string,
  toDate: string,
): Promise<{ byDate: AvailableSlotsByDate[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id,slot_date,start_time,end_time,status")
    .eq("caregiver_profile_id", caregiverProfileId)
    .eq("status", "open")
    .gte("slot_date", fromDate)
    .lte("slot_date", toDate)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return { byDate: [], errorMessage: error.message };
  }

  const rows =
    (data as
      | { id: string; slot_date: string; start_time: string; end_time: string }[]
      | null) ?? [];

  const grouped = new Map<string, AvailableSlot[]>();
  for (const row of rows) {
    const list = grouped.get(row.slot_date) ?? [];
    list.push({
      id: row.id,
      date: row.slot_date,
      start: toSlotStart(row.start_time),
      end: toSlotStart(row.end_time),
    });
    grouped.set(row.slot_date, list);
  }

  const byDate: AvailableSlotsByDate[] = Array.from(grouped.entries())
    .map(([date, slots]) => ({ date, slots }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { byDate, errorMessage: null };
}

// ---------------------------------------------------------------------------
// Create the reservation (pending) through the SECURITY DEFINER RPC
// ---------------------------------------------------------------------------

export type CreateReservationInput = {
  caregiverProfileId: string;
  regionId: string;
  slotIds: string[];
  serviceIds: string[];
  extraIds: string[];
  addressSnapshot?: string | null;
  recipientFirstName?: string | null;
};

export type CreateReservationResult = {
  reservationId: string | null;
  totalAmountMinor: number | null;
  errorMessage: string | null;
};

type ReservationRpcResult = {
  ok?: boolean;
  reservation_id?: string;
  status?: string;
  total_amount?: number;
};

// ESCROW TIMING (Phase 11 note): the DB currently RECORDS the hold at submit
// (create_reservation sets payments.payment_status = 'authorized_held'), per
// DATABASE_SCHEMA.md open decision #5. The live-integration direction is to
// place the REAL Stripe hold at caregiver APPROVAL instead (authorizeHold in
// lib/payments, wired in transitionReservation), so no Stripe stub is called
// here. Phase 11 must reconcile the recorded status with the real hold moment.
export async function createReservation(
  supabase: SupabaseClient,
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const { data, error } = await supabase.rpc("create_reservation", {
    p_caregiver_profile_id: input.caregiverProfileId,
    p_region_id: input.regionId,
    p_slot_ids: input.slotIds,
    p_service_ids: input.serviceIds,
    p_extra_ids: input.extraIds,
    p_address_snapshot: input.addressSnapshot ?? null,
    p_recipient_first_name: input.recipientFirstName ?? null,
  });

  if (error) {
    return { reservationId: null, totalAmountMinor: null, errorMessage: error.message };
  }

  const result = (data as ReservationRpcResult | null) ?? null;
  if (!result?.reservation_id) {
    return {
      reservationId: null,
      totalAmountMinor: null,
      errorMessage: "The reservation could not be created. Please try again.",
    };
  }

  return {
    reservationId: result.reservation_id,
    totalAmountMinor: result.total_amount ?? null,
    errorMessage: null,
  };
}
