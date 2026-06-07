import type { SupabaseClient } from "@supabase/supabase-js";

// Data layer for the caregiver dashboard (services + prices, schedule, regions).
//
// Everything here runs against the *live* target schema with the publishable
// (anon) key and the signed-in caregiver's session. RLS does the real guarding:
//   - caregiver_services / service_extras / caregiver_regions / availability_slots
//     each have an "owner_all" policy scoped to the caregiver_profiles row owned
//     by auth.uid(), so a caregiver can only ever read/write THEIR OWN config.
//   - covers_whole_city lives on caregiver_profiles, which has no owner UPDATE
//     policy, so it is changed through the existing SECURITY DEFINER RPC
//     update_own_caregiver_profile (re-checks the caller is an approved caregiver).
//
// Prices are stored in MINOR UNITS (стотинки) with currency 'BGN' and shown in лв.

// ---------------------------------------------------------------------------
// Money helpers — store minor units, display лв.
// ---------------------------------------------------------------------------

export const CAREGIVER_CURRENCY = "BGN";

/** Format minor units (стотинки) as a plain "12.00" string (no currency mark). */
export function formatLevaAmount(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

/**
 * Parse a user-typed price in лв. (e.g. "12", "12.5", "12,50") into minor units.
 * Returns null when the value is empty or not a valid non-negative number.
 */
export function parseLevaToMinor(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) {
    return null;
  }
  const asNumber = Number(trimmed);
  if (!Number.isFinite(asNumber) || asNumber < 0) {
    return null;
  }
  return Math.round(asNumber * 100);
}

// ---------------------------------------------------------------------------
// Schedule constants — 2-hour slots, 06:00–20:00, and weekday labels.
// ---------------------------------------------------------------------------

export type TimeSlot = { start: string; end: string };

/** The canonical 2-hour slot grid from the product spec (06:00 → 20:00). */
export const TIME_SLOTS: TimeSlot[] = [
  { start: "06:00", end: "08:00" },
  { start: "08:00", end: "10:00" },
  { start: "10:00", end: "12:00" },
  { start: "12:00", end: "14:00" },
  { start: "14:00", end: "16:00" },
  { start: "16:00", end: "18:00" },
  { start: "18:00", end: "20:00" },
];

/** Weekday order used by the recurring pattern (Mon = 1 … Sun = 0, JS getDay()). */
export const WEEKDAYS: { jsDay: number; label: string; short: string }[] = [
  { jsDay: 1, label: "Monday", short: "Mon" },
  { jsDay: 2, label: "Tuesday", short: "Tue" },
  { jsDay: 3, label: "Wednesday", short: "Wed" },
  { jsDay: 4, label: "Thursday", short: "Thu" },
  { jsDay: 5, label: "Friday", short: "Fri" },
  { jsDay: 6, label: "Saturday", short: "Sat" },
  { jsDay: 0, label: "Sunday", short: "Sun" },
];

/** Normalise a Postgres time ("HH:MM:SS") to the "HH:MM" used by the grid. */
export function toSlotStart(time: string): string {
  return time.slice(0, 5);
}

/** Format a Date as a local "YYYY-MM-DD" date string (no timezone shift). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Monday-of-week for a given date (the grid weeks start on Monday). */
export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7; // days since Monday
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CaregiverDashboardProfile = {
  id: string;
  display_name: string;
  bio: string;
  experience: string | null;
  covers_whole_city: boolean;
  verification_status: string;
  is_visible: boolean;
};

export type ServiceCatalogItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export type CaregiverServiceRow = {
  id: string;
  service_id: string;
  price_amount: number;
  currency: string;
  is_active: boolean;
};

export type ServiceExtraRow = {
  id: string;
  label: string;
  price_amount: number;
  currency: string;
  is_active: boolean;
};

export type RegionRow = {
  id: string;
  name: string;
  slug: string;
};

export type AvailabilitySlotRow = {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: "open" | "held" | "booked" | "blocked";
};

type Result<T> = { data: T; errorMessage: string | null };

const CAREGIVER_PROFILE_COLUMNS =
  "id,display_name,bio,experience,covers_whole_city,verification_status,is_visible";

// ---------------------------------------------------------------------------
// Caregiver profile (for id + whole-city flag)
// ---------------------------------------------------------------------------

export async function loadCaregiverDashboardProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  profile: CaregiverDashboardProfile | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(CAREGIVER_PROFILE_COLUMNS)
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  return {
    profile: (data as CaregiverDashboardProfile | null) ?? null,
    errorMessage: null,
  };
}

// ---------------------------------------------------------------------------
// Section 1 — services + prices, and optional extras
// ---------------------------------------------------------------------------

export async function loadServiceCatalog(
  supabase: SupabaseClient,
): Promise<Result<ServiceCatalogItem[]>> {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,slug,description")
    .eq("is_allowed", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return { data: [], errorMessage: error.message };
  }
  return { data: (data as ServiceCatalogItem[]) ?? [], errorMessage: null };
}

export async function loadCaregiverServices(
  supabase: SupabaseClient,
  caregiverProfileId: string,
): Promise<Result<CaregiverServiceRow[]>> {
  const { data, error } = await supabase
    .from("caregiver_services")
    .select("id,service_id,price_amount,currency,is_active")
    .eq("caregiver_profile_id", caregiverProfileId);

  if (error) {
    return { data: [], errorMessage: error.message };
  }
  return { data: (data as CaregiverServiceRow[]) ?? [], errorMessage: null };
}

export type DesiredCaregiverService = {
  serviceId: string;
  enabled: boolean;
  priceMinor: number;
};

/**
 * Reconcile the caregiver's selected services. Enabled rows are upserted with
 * their price; disabled rows are removed. RLS guarantees this only ever touches
 * the caller's own caregiver profile.
 */
export async function saveCaregiverServices(
  supabase: SupabaseClient,
  caregiverProfileId: string,
  desired: DesiredCaregiverService[],
): Promise<{ errorMessage: string | null }> {
  const enabled = desired.filter((item) => item.enabled);
  const disabled = desired.filter((item) => !item.enabled);

  if (enabled.length > 0) {
    const { error } = await supabase.from("caregiver_services").upsert(
      enabled.map((item) => ({
        caregiver_profile_id: caregiverProfileId,
        service_id: item.serviceId,
        price_amount: item.priceMinor,
        currency: CAREGIVER_CURRENCY,
        is_active: true,
      })),
      { onConflict: "caregiver_profile_id,service_id" },
    );
    if (error) {
      return { errorMessage: error.message };
    }
  }

  const disabledIds = disabled.map((item) => item.serviceId);
  if (disabledIds.length > 0) {
    const { error } = await supabase
      .from("caregiver_services")
      .delete()
      .eq("caregiver_profile_id", caregiverProfileId)
      .in("service_id", disabledIds);
    if (error) {
      return { errorMessage: error.message };
    }
  }

  return { errorMessage: null };
}

export async function loadServiceExtras(
  supabase: SupabaseClient,
  caregiverProfileId: string,
): Promise<Result<ServiceExtraRow[]>> {
  const { data, error } = await supabase
    .from("service_extras")
    .select("id,label,price_amount,currency,is_active")
    .eq("caregiver_profile_id", caregiverProfileId)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], errorMessage: error.message };
  }
  return { data: (data as ServiceExtraRow[]) ?? [], errorMessage: null };
}

export type DesiredServiceExtra = {
  id?: string;
  label: string;
  priceMinor: number;
};

/**
 * Reconcile per-caregiver optional extras: delete removed rows, insert new ones,
 * update changed labels/prices. Owner-scoped by RLS.
 */
export async function saveServiceExtras(
  supabase: SupabaseClient,
  caregiverProfileId: string,
  desired: DesiredServiceExtra[],
  existingIds: string[],
): Promise<{ errorMessage: string | null }> {
  const desiredIds = new Set(
    desired.map((item) => item.id).filter((id): id is string => Boolean(id)),
  );
  const toDelete = existingIds.filter((id) => !desiredIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("service_extras")
      .delete()
      .eq("caregiver_profile_id", caregiverProfileId)
      .in("id", toDelete);
    if (error) {
      return { errorMessage: error.message };
    }
  }

  const toInsert = desired.filter((item) => !item.id);
  if (toInsert.length > 0) {
    const { error } = await supabase.from("service_extras").insert(
      toInsert.map((item) => ({
        caregiver_profile_id: caregiverProfileId,
        label: item.label,
        price_amount: item.priceMinor,
        currency: CAREGIVER_CURRENCY,
        is_active: true,
      })),
    );
    if (error) {
      return { errorMessage: error.message };
    }
  }

  const toUpdate = desired.filter((item) => Boolean(item.id));
  for (const item of toUpdate) {
    const { error } = await supabase
      .from("service_extras")
      .update({ label: item.label, price_amount: item.priceMinor })
      .eq("id", item.id as string)
      .eq("caregiver_profile_id", caregiverProfileId);
    if (error) {
      return { errorMessage: error.message };
    }
  }

  return { errorMessage: null };
}

// ---------------------------------------------------------------------------
// Section 2 — schedule (2-hour availability slots)
// ---------------------------------------------------------------------------

export async function loadAvailabilitySlots(
  supabase: SupabaseClient,
  caregiverProfileId: string,
  fromDate: string,
  toDate: string,
): Promise<Result<AvailabilitySlotRow[]>> {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id,slot_date,start_time,end_time,status")
    .eq("caregiver_profile_id", caregiverProfileId)
    .gte("slot_date", fromDate)
    .lte("slot_date", toDate)
    .order("slot_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return { data: [], errorMessage: error.message };
  }
  return { data: (data as AvailabilitySlotRow[]) ?? [], errorMessage: null };
}

export type NewSlot = { slotDate: string; start: string };

/**
 * Create OPEN 2-hour slots. Duplicates (same caregiver/date/start) are ignored
 * so re-publishing a recurring pattern is safe and idempotent.
 */
export async function createAvailabilitySlots(
  supabase: SupabaseClient,
  caregiverProfileId: string,
  slots: NewSlot[],
): Promise<{ insertedAttempted: number; errorMessage: string | null }> {
  if (slots.length === 0) {
    return { insertedAttempted: 0, errorMessage: null };
  }

  const rows = slots.map((slot) => {
    const matching = TIME_SLOTS.find((s) => s.start === slot.start);
    const end = matching ? matching.end : slot.start;
    return {
      caregiver_profile_id: caregiverProfileId,
      slot_date: slot.slotDate,
      start_time: `${slot.start}:00`,
      end_time: `${end}:00`,
      status: "open" as const,
    };
  });

  const { error } = await supabase.from("availability_slots").upsert(rows, {
    onConflict: "caregiver_profile_id,slot_date,start_time",
    ignoreDuplicates: true,
  });

  if (error) {
    return { insertedAttempted: rows.length, errorMessage: error.message };
  }
  return { insertedAttempted: rows.length, errorMessage: null };
}

/** Remove an OPEN slot. Booked/held/blocked slots are never deleted here. */
export async function deleteAvailabilitySlot(
  supabase: SupabaseClient,
  caregiverProfileId: string,
  slotId: string,
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", slotId)
    .eq("caregiver_profile_id", caregiverProfileId)
    .eq("status", "open");

  if (error) {
    return { errorMessage: error.message };
  }
  return { errorMessage: null };
}

// ---------------------------------------------------------------------------
// Section 3 — operating regions
// ---------------------------------------------------------------------------

export async function loadRegions(
  supabase: SupabaseClient,
): Promise<Result<RegionRow[]>> {
  const { data, error } = await supabase
    .from("regions")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return { data: [], errorMessage: error.message };
  }
  return { data: (data as RegionRow[]) ?? [], errorMessage: null };
}

export async function loadCaregiverRegionIds(
  supabase: SupabaseClient,
  caregiverProfileId: string,
): Promise<Result<string[]>> {
  const { data, error } = await supabase
    .from("caregiver_regions")
    .select("region_id")
    .eq("caregiver_profile_id", caregiverProfileId);

  if (error) {
    return { data: [], errorMessage: error.message };
  }
  return {
    data: ((data as { region_id: string }[]) ?? []).map((row) => row.region_id),
    errorMessage: null,
  };
}

/** Reconcile selected districts: insert newly chosen, delete unchosen. */
export async function saveCaregiverRegions(
  supabase: SupabaseClient,
  caregiverProfileId: string,
  desiredRegionIds: string[],
  existingRegionIds: string[],
): Promise<{ errorMessage: string | null }> {
  const desired = new Set(desiredRegionIds);
  const existing = new Set(existingRegionIds);

  const toInsert = desiredRegionIds.filter((id) => !existing.has(id));
  const toDelete = existingRegionIds.filter((id) => !desired.has(id));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("caregiver_regions").insert(
      toInsert.map((regionId) => ({
        caregiver_profile_id: caregiverProfileId,
        region_id: regionId,
      })),
    );
    if (error) {
      return { errorMessage: error.message };
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("caregiver_regions")
      .delete()
      .eq("caregiver_profile_id", caregiverProfileId)
      .in("region_id", toDelete);
    if (error) {
      return { errorMessage: error.message };
    }
  }

  return { errorMessage: null };
}

/**
 * Set the "whole city" flag. caregiver_profiles has no owner UPDATE policy, so
 * this goes through the existing approved-caregiver-only RPC, which also keeps
 * the other public fields (display_name/bio/experience) intact.
 */
export async function setCoversWholeCity(
  supabase: SupabaseClient,
  profile: CaregiverDashboardProfile,
  coversWholeCity: boolean,
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase.rpc("update_own_caregiver_profile", {
    p_display_name: profile.display_name,
    p_bio: profile.bio,
    p_experience: profile.experience,
    p_covers_whole_city: coversWholeCity,
  });

  if (error) {
    return { errorMessage: error.message };
  }
  return { errorMessage: null };
}
