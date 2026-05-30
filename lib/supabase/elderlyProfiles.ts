import type { SupabaseClient } from "@supabase/supabase-js";

export type ElderlyProfile = {
  id: string;
  caregiver_id: string;
  full_name: string;
  city: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ElderlyProfileInput = {
  caregiverId: string;
  fullName: string;
  city: string;
  notes: string;
};

const elderlyProfileColumns = "id,caregiver_id,full_name,city,notes,created_at,updated_at";

export async function loadOwnElderlyProfiles(
  supabase: SupabaseClient,
  caregiverId: string,
): Promise<{ profiles: ElderlyProfile[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("elderly_profiles")
    .select(elderlyProfileColumns)
    .eq("caregiver_id", caregiverId)
    .order("updated_at", { ascending: false });

  if (error) {
    return { profiles: [], errorMessage: error.message };
  }

  return { profiles: (data as ElderlyProfile[] | null) ?? [], errorMessage: null };
}

export async function countOwnElderlyProfiles(
  supabase: SupabaseClient,
  caregiverId: string,
): Promise<{ count: number | null; errorMessage: string | null }> {
  const { count, error } = await supabase
    .from("elderly_profiles")
    .select("id", { count: "exact", head: true })
    .eq("caregiver_id", caregiverId);

  if (error) {
    return { count: null, errorMessage: error.message };
  }

  return { count: count ?? 0, errorMessage: null };
}

export async function saveOwnElderlyProfile(
  supabase: SupabaseClient,
  input: ElderlyProfileInput & { elderlyProfileId?: string },
): Promise<{ profile: ElderlyProfile | null; errorMessage: string | null }> {
  const payload = {
    caregiver_id: input.caregiverId,
    full_name: input.fullName.trim(),
    city: input.city.trim(),
    notes: input.notes.trim() || null,
  };

  const query = input.elderlyProfileId
    ? supabase
        .from("elderly_profiles")
        .update(payload)
        .eq("id", input.elderlyProfileId)
        .eq("caregiver_id", input.caregiverId)
        .select(elderlyProfileColumns)
        .single()
    : supabase.from("elderly_profiles").insert(payload).select(elderlyProfileColumns).single();

  const { data, error } = await query;

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  return { profile: data as ElderlyProfile, errorMessage: null };
}

export async function deleteOwnElderlyProfile(
  supabase: SupabaseClient,
  input: { caregiverId: string; elderlyProfileId: string },
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase
    .from("elderly_profiles")
    .delete()
    .eq("id", input.elderlyProfileId)
    .eq("caregiver_id", input.caregiverId);

  if (error) {
    return { errorMessage: error.message };
  }

  return { errorMessage: null };
}
