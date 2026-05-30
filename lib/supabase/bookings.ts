import type { SupabaseClient } from "@supabase/supabase-js";

export type ServiceCategory = {
  id: string;
  name: string;
  description: string;
  is_allowed: boolean;
};

export type BookingStatus = "requested" | "cancelled";

export type ClientBooking = {
  id: string;
  client_id: string;
  elderly_profile_id: string;
  helper_profile_id: string | null;
  service_category_id: string;
  status: string;
  requested_start_at: string | null;
  requested_duration_minutes: number | null;
  city: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ClientBookingRequestInput = {
  clientId: string;
  elderlyProfileId: string;
  serviceCategoryId: string;
  city: string;
  requestedStartAt: string;
  requestedDurationMinutes: number;
  notes: string;
  helperProfileId?: string | null;
};

const bookingColumns =
  "id,client_id,elderly_profile_id,helper_profile_id,service_category_id,status,requested_start_at,requested_duration_minutes,city,notes,created_at,updated_at";

export async function loadAllowedServiceCategories(
  supabase: SupabaseClient,
): Promise<{ categories: ServiceCategory[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("service_categories")
    .select("id,name,description,is_allowed")
    .eq("is_allowed", true)
    .order("name", { ascending: true });

  if (error) {
    return { categories: [], errorMessage: error.message };
  }

  return { categories: (data as ServiceCategory[] | null) ?? [], errorMessage: null };
}

export async function loadOwnBookings(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ bookings: ClientBooking[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("bookings")
    .select(bookingColumns)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return { bookings: [], errorMessage: error.message };
  }

  return { bookings: (data as ClientBooking[] | null) ?? [], errorMessage: null };
}

export async function countOwnBookings(
  supabase: SupabaseClient,
  clientId: string,
): Promise<{ count: number | null; errorMessage: string | null }> {
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (error) {
    return { count: null, errorMessage: error.message };
  }

  return { count: count ?? 0, errorMessage: null };
}

export async function createOwnBookingRequest(
  supabase: SupabaseClient,
  input: ClientBookingRequestInput,
): Promise<{ booking: ClientBooking | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id: input.clientId,
      elderly_profile_id: input.elderlyProfileId,
      helper_profile_id: input.helperProfileId ?? null,
      service_category_id: input.serviceCategoryId,
      status: "requested",
      requested_start_at: input.requestedStartAt,
      requested_duration_minutes: input.requestedDurationMinutes,
      city: input.city.trim(),
      notes: input.notes.trim() || null,
    })
    .select(bookingColumns)
    .single();

  if (error) {
    return { booking: null, errorMessage: error.message };
  }

  return { booking: data as ClientBooking, errorMessage: null };
}

export async function cancelOwnRequestedBooking(
  supabase: SupabaseClient,
  input: { clientId: string; bookingId: string },
): Promise<{ booking: ClientBooking | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", input.bookingId)
    .eq("client_id", input.clientId)
    .eq("status", "requested")
    .select(bookingColumns)
    .single();

  if (error) {
    return { booking: null, errorMessage: error.message };
  }

  return { booking: data as ClientBooking, errorMessage: null };
}
