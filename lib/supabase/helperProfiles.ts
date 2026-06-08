import type { SupabaseClient } from "@supabase/supabase-js";

export type HelperVerificationStatus =
  | "applicant"
  | "verified_basic"
  | "trusted"
  | "suspended"
  | "banned";

// Public marketplace shape. Mirrors the safe, publicly-readable columns of the
// canonical `caregiver_profiles` table (see DATABASE_SCHEMA.md §4.2). The old
// `helper_profiles` table and its `city`/`service_radius_km` columns no longer
// exist — geography now lives in the regions model, and the public display uses
// `display_name`, `bio`, and `experience`. Never selects private payout fields.
export type PublicHelperProfile = {
  id: string;
  verification_status: "verified_basic" | "trusted";
  display_name: string;
  bio: string;
  experience: string | null;
};

export type OwnHelperProfile = {
  id: string;
  profile_id: string;
  verification_status: HelperVerificationStatus;
  bio: string;
  city: string;
  service_radius_km: number | null;
  is_visible: boolean;
  created_at: string | null;
  updated_at: string | null;
};

// Admin view of an approved caregiver profile. Mirrors the canonical
// `caregiver_profiles` columns (no `city`/`service_radius_km` — geography now
// lives in the regions model) plus the owner account email/name an admin is
// allowed to read for support purposes.
export type AdminHelperProfile = {
  id: string;
  profile_id: string;
  verification_status: HelperVerificationStatus;
  display_name: string;
  bio: string;
  experience: string | null;
  covers_whole_city: boolean;
  is_visible: boolean;
  created_at: string | null;
  updated_at: string | null;
  account_email: string | null;
  account_name: string | null;
};

export type HelperProfileFormInput = {
  bio: string;
  city: string;
  serviceRadiusKm: number | null;
};

type ProfileSummaryRow = {
  id: string;
  email: string | null;
  first_name: string | null;
};

// Safe public columns of `caregiver_profiles` only — never `stripe_account_id`
// or any owner-private field. Matches the column-level GRANT in SUPABASE_FIX.sql.
const publicHelperProfileSelect =
  "id,verification_status,display_name,bio,experience";

const ownHelperProfileSelect =
  "id,profile_id,verification_status,bio,city,service_radius_km,is_visible,created_at,updated_at";

// Safe, existing columns of `caregiver_profiles` for the admin review surface.
const adminCaregiverProfileSelect =
  "id,profile_id,verification_status,display_name,bio,experience,covers_whole_city,is_visible,created_at,updated_at";

export function formatHelperVerificationStatus(
  status: HelperVerificationStatus,
) {
  const labels: Record<HelperVerificationStatus, string> = {
    applicant: "Applicant",
    verified_basic: "Verified basic",
    trusted: "Trusted",
    suspended: "Suspended",
    banned: "Banned",
  };

  return labels[status];
}

export async function loadVisibleVerifiedHelperProfiles(
  supabase: SupabaseClient,
): Promise<{
  helperProfiles: PublicHelperProfile[];
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(publicHelperProfileSelect)
    .eq("is_visible", true)
    .in("verification_status", ["verified_basic", "trusted"])
    .order("display_name", { ascending: true });

  if (error) {
    return { helperProfiles: [], errorMessage: error.message };
  }

  return {
    helperProfiles: (data as PublicHelperProfile[]) ?? [],
    errorMessage: null,
  };
}

export async function loadVisibleVerifiedHelperProfileById(
  supabase: SupabaseClient,
  helperProfileId: string,
): Promise<{
  helperProfile: PublicHelperProfile | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(publicHelperProfileSelect)
    .eq("id", helperProfileId)
    .eq("is_visible", true)
    .in("verification_status", ["verified_basic", "trusted"])
    .maybeSingle();

  if (error) {
    return { helperProfile: null, errorMessage: error.message };
  }

  return {
    helperProfile: (data as PublicHelperProfile | null) ?? null,
    errorMessage: null,
  };
}

export async function loadVisibleVerifiedHelperProfilesByIds(
  supabase: SupabaseClient,
  helperProfileIds: string[],
): Promise<{
  helperProfiles: PublicHelperProfile[];
  errorMessage: string | null;
}> {
  const uniqueIds = Array.from(new Set(helperProfileIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return { helperProfiles: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(publicHelperProfileSelect)
    .in("id", uniqueIds)
    .eq("is_visible", true)
    .in("verification_status", ["verified_basic", "trusted"]);

  if (error) {
    return { helperProfiles: [], errorMessage: error.message };
  }

  return {
    helperProfiles: (data as PublicHelperProfile[] | null) ?? [],
    errorMessage: null,
  };
}

export async function loadOwnHelperProfile(
  supabase: SupabaseClient,
  profileId: string,
): Promise<{
  helperProfile: OwnHelperProfile | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase
    .from("helper_profiles")
    .select(ownHelperProfileSelect)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    return { helperProfile: null, errorMessage: error.message };
  }

  return {
    helperProfile: (data as OwnHelperProfile | null) ?? null,
    errorMessage: null,
  };
}

export type HelperProfileRpcResult = {
  ok?: boolean;
  helper_profile?: OwnHelperProfile;
  audit_logged?: boolean;
  audit_error?: string | null;
};

function isHelperProfileRpcResult(
  value: unknown,
): value is HelperProfileRpcResult {
  return (
    typeof value === "object" && value !== null && "helper_profile" in value
  );
}

export async function updateOwnHelperProfile(
  supabase: SupabaseClient,
  input: HelperProfileFormInput,
): Promise<{
  helperProfile: OwnHelperProfile | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase.rpc("update_own_helper_profile", {
    p_bio: input.bio.trim(),
    p_city: input.city.trim(),
    p_service_radius_km: input.serviceRadiusKm,
  });

  if (error) {
    return {
      helperProfile: null,
      errorMessage: `Could not update helper profile: ${error.message}. Confirm the helper profile management RPC migration is applied.`,
    };
  }

  if (!isHelperProfileRpcResult(data) || !data.helper_profile) {
    return {
      helperProfile: null,
      errorMessage:
        "The helper profile update RPC returned an unexpected result.",
    };
  }

  return { helperProfile: data.helper_profile, errorMessage: null };
}

export async function loadAdminApprovedHelperProfiles(
  supabase: SupabaseClient,
): Promise<{
  helperProfiles: AdminHelperProfile[];
  errorMessage: string | null;
  emailWarning: string | null;
}> {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select(adminCaregiverProfileSelect)
    .in("verification_status", ["verified_basic", "trusted"])
    .order("display_name", { ascending: true });

  if (error) {
    return {
      helperProfiles: [],
      errorMessage: error.message,
      emailWarning: null,
    };
  }

  type AdminCaregiverRow = Omit<AdminHelperProfile, "account_email" | "account_name">;

  const helperProfiles: AdminHelperProfile[] = (
    (data as AdminCaregiverRow[] | null) ?? []
  ).map((helperProfile) => ({
    ...helperProfile,
    account_email: null,
    account_name: null,
  }));

  const profileIds = Array.from(
    new Set(helperProfiles.map((helperProfile) => helperProfile.profile_id)),
  );

  if (profileIds.length === 0) {
    return { helperProfiles, errorMessage: null, emailWarning: null };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,email,first_name")
    .in("id", profileIds);

  if (profilesError) {
    return {
      helperProfiles,
      errorMessage: null,
      emailWarning:
        "Approved caregivers loaded, but their account contact details could not be read.",
    };
  }

  const profileById = new Map(
    ((profiles as ProfileSummaryRow[] | null) ?? []).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  return {
    helperProfiles: helperProfiles.map((helperProfile) => {
      const profile = profileById.get(helperProfile.profile_id);

      return {
        ...helperProfile,
        account_email: profile?.email ?? null,
        account_name: profile?.first_name ?? null,
      };
    }),
    errorMessage: null,
    emailWarning: null,
  };
}

// Shape returned by the canonical `set_caregiver_profile_visibility` RPC
// (SUPABASE_SETUP.sql §14): flat fields, not a nested profile object.
type CaregiverVisibilityRpcResult = {
  ok?: boolean;
  caregiver_profile_id?: string;
  old_is_visible?: boolean;
  new_is_visible?: boolean;
};

function isVisibilityRpcResult(
  value: unknown,
): value is CaregiverVisibilityRpcResult {
  return (
    typeof value === "object" && value !== null && "new_is_visible" in value
  );
}

export async function changeHelperProfileVisibility(
  supabase: SupabaseClient,
  input: { caregiverProfileId: string; isVisible: boolean },
): Promise<{
  isVisible: boolean | null;
  errorMessage: string | null;
}> {
  const { data, error } = await supabase.rpc("set_caregiver_profile_visibility", {
    p_caregiver_profile_id: input.caregiverProfileId,
    p_is_visible: input.isVisible,
  });

  if (error) {
    return {
      isVisible: null,
      errorMessage:
        "We couldn't change this caregiver's visibility right now. Please try again in a moment.",
    };
  }

  if (!isVisibilityRpcResult(data) || typeof data.new_is_visible !== "boolean") {
    return {
      isVisible: null,
      errorMessage: "The visibility change did not complete as expected. Please refresh and try again.",
    };
  }

  return {
    isVisible: data.new_is_visible,
    errorMessage: null,
  };
}
