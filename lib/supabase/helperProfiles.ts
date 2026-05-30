import type { SupabaseClient } from "@supabase/supabase-js";

export type HelperVerificationStatus =
  | "applicant"
  | "verified_basic"
  | "trusted"
  | "suspended"
  | "banned";

export type PublicHelperProfile = {
  id: string;
  verification_status: "verified_basic" | "trusted";
  bio: string;
  city: string;
  service_radius_km: number | null;
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

export type AdminHelperProfile = OwnHelperProfile & {
  helper_email: string | null;
  helper_display_name: string | null;
};

export type HelperProfileFormInput = {
  bio: string;
  city: string;
  serviceRadiusKm: number | null;
};

type ProfileSummaryRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

const ownHelperProfileSelect =
  "id,profile_id,verification_status,bio,city,service_radius_km,is_visible,created_at,updated_at";

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
    .from("helper_profiles")
    .select("id,verification_status,bio,city,service_radius_km")
    .eq("is_visible", true)
    .in("verification_status", ["verified_basic", "trusted"])
    .order("city", { ascending: true });

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
    .from("helper_profiles")
    .select("id,verification_status,bio,city,service_radius_km")
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
    .from("helper_profiles")
    .select("id,verification_status,bio,city,service_radius_km")
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
    .from("helper_profiles")
    .select(ownHelperProfileSelect)
    .in("verification_status", ["verified_basic", "trusted"])
    .order("city", { ascending: true });

  if (error) {
    return {
      helperProfiles: [],
      errorMessage: error.message,
      emailWarning: null,
    };
  }

  const helperProfiles = ((data as OwnHelperProfile[] | null) ?? []).map(
    (helperProfile) => ({
      ...helperProfile,
      helper_email: null,
      helper_display_name: null,
    }),
  );

  const profileIds = Array.from(
    new Set(helperProfiles.map((helperProfile) => helperProfile.profile_id)),
  );

  if (profileIds.length === 0) {
    return { helperProfiles, errorMessage: null, emailWarning: null };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,email,display_name")
    .in("id", profileIds);

  if (profilesError) {
    return {
      helperProfiles,
      errorMessage: null,
      emailWarning: `Approved helper profiles loaded, but helper account details could not be loaded: ${profilesError.message}. Confirm the admin profiles RLS policy is applied.`,
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
        helper_email: profile?.email ?? null,
        helper_display_name: profile?.display_name ?? null,
      };
    }),
    errorMessage: null,
    emailWarning: null,
  };
}

export async function changeHelperProfileVisibility(
  supabase: SupabaseClient,
  input: { helperProfileId: string; isVisible: boolean },
): Promise<{
  helperProfile: OwnHelperProfile | null;
  errorMessage: string | null;
  auditWarning: string | null;
}> {
  const { data, error } = await supabase.rpc("set_helper_profile_visibility", {
    p_helper_profile_id: input.helperProfileId,
    p_is_visible: input.isVisible,
  });

  if (error) {
    return {
      helperProfile: null,
      errorMessage: `Could not change helper visibility: ${error.message}. Confirm the admin helper visibility RPC migration is applied.`,
      auditWarning: null,
    };
  }

  if (!isHelperProfileRpcResult(data) || !data.helper_profile) {
    return {
      helperProfile: null,
      errorMessage: "The helper visibility RPC returned an unexpected result.",
      auditWarning: null,
    };
  }

  return {
    helperProfile: data.helper_profile,
    errorMessage: null,
    auditWarning:
      data.audit_logged === false
        ? `Visibility changed, but audit logging failed: ${data.audit_error ?? "Unknown audit log error"}.`
        : null,
  };
}
