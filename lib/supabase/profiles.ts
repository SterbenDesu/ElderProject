import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SignupAccountType = "client_caregiver" | "helper_applicant";

export type ProfileRole = "client" | "helper_applicant" | "verified_helper" | "admin";

export type Profile = {
  id: string;
  email: string;
  role: ProfileRole;
  display_name: string | null;
  phone: string | null;
  created_at: string | null;
};

export const currentTermsVersion = "v0.1-placeholder";
export const currentPrivacyVersion = "v0.1-placeholder";

const duplicateRowCode = "23505";
const noRowsCode = "PGRST116";

function isDuplicateRowError(error: { code?: string; message?: string } | null) {
  return error?.code === duplicateRowCode || error?.message?.toLowerCase().includes("duplicate key");
}

function isNoRowsError(error: { code?: string } | null) {
  return error?.code === noRowsCode;
}

export function mapSignupAccountTypeToProfileRole(accountType: SignupAccountType): "client" | "helper_applicant" {
  if (accountType === "helper_applicant") {
    return "helper_applicant";
  }

  return "client";
}

export function deriveDisplayNameFromEmail(email: string) {
  const fallback = email.split("@")[0]?.trim();

  if (fallback) {
    return fallback;
  }

  return "VnukPodNaem user";
}

export function getSignupAccountTypeFromUser(user: User): SignupAccountType {
  if (user.user_metadata?.account_type === "helper_applicant") {
    return "helper_applicant";
  }

  return "client_caregiver";
}

export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<{ profile: Profile | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role,display_name,phone,created_at")
    .eq("id", userId)
    .single();

  if (isNoRowsError(error)) {
    return { profile: null, errorMessage: null };
  }

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  return { profile: data as Profile, errorMessage: null };
}

export async function createProfileIfMissing(
  supabase: SupabaseClient,
  input: {
    userId: string;
    email: string;
    accountType: SignupAccountType;
    displayName?: string;
    phone?: string;
  },
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase.from("profiles").insert({
    id: input.userId,
    email: input.email,
    role: mapSignupAccountTypeToProfileRole(input.accountType),
    display_name: input.displayName?.trim() || deriveDisplayNameFromEmail(input.email),
    phone: input.phone?.trim() || null,
  });

  if (isDuplicateRowError(error)) {
    return { errorMessage: null };
  }

  if (error) {
    return { errorMessage: error.message };
  }

  return { errorMessage: null };
}

export async function createTermsAcceptance(
  supabase: SupabaseClient,
  profileId: string,
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase.from("terms_acceptances").insert({
    profile_id: profileId,
    terms_version: currentTermsVersion,
    privacy_version: currentPrivacyVersion,
  });

  if (error) {
    return { errorMessage: error.message };
  }

  return { errorMessage: null };
}

export async function createSignupDatabaseRecords(
  supabase: SupabaseClient,
  input: {
    userId: string;
    email: string;
    accountType: SignupAccountType;
    displayName?: string;
    phone?: string;
  },
): Promise<{ errorMessage: string | null }> {
  const profileResult = await createProfileIfMissing(supabase, input);

  if (profileResult.errorMessage) {
    return {
      errorMessage: `Account creation succeeded, but profile setup failed: ${profileResult.errorMessage}`,
    };
  }

  const termsResult = await createTermsAcceptance(supabase, input.userId);

  if (termsResult.errorMessage) {
    return {
      errorMessage: `Account creation succeeded and profile setup was attempted, but Terms/Privacy acceptance storage failed: ${termsResult.errorMessage}`,
    };
  }

  return { errorMessage: null };
}
