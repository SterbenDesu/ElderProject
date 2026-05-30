import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicHelperProfile = {
  id: string;
  verification_status: "verified_basic" | "trusted";
  bio: string;
  city: string;
  service_radius_km: number | null;
};

export async function loadVisibleVerifiedHelperProfiles(
  supabase: SupabaseClient,
): Promise<{ helperProfiles: PublicHelperProfile[]; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("helper_profiles")
    .select("id,verification_status,bio,city,service_radius_km")
    .eq("is_visible", true)
    .in("verification_status", ["verified_basic", "trusted"])
    .order("city", { ascending: true });

  if (error) {
    return { helperProfiles: [], errorMessage: error.message };
  }

  return { helperProfiles: (data as PublicHelperProfile[]) ?? [], errorMessage: null };
}
