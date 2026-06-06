import type { SupabaseClient, User } from "@supabase/supabase-js";

// NOTE: The applied target-model migrations simplified profiles.role to
// 'elder' | 'admin' and renamed display_name -> first_name. The NEW identity
// layer for elders lives in `lib/auth/account.ts` + `lib/auth/useCurrentUser.ts`
// (the single source of truth used by signup, login, the account page and the
// header). This module is the LEGACY surface kept so older marketplace/booking
// pages keep compiling; its runtime is patched here to read/write the real
// columns. The legacy `display_name` field below mirrors `first_name`, and the
// legacy `ProfileRole` union is retained only for those older pages.

export type SignupAccountType = "client_caregiver" | "helper_applicant";

export type ProfileRole = "client" | "helper_applicant" | "verified_helper" | "admin";

export type Profile = {
  id: string;
  email: string;
  role: ProfileRole;
  /** Mirrors profiles.first_name (the column display_name was renamed to). */
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

export function deriveDisplayNameFromEmail(email: string) {
  const fallback = email.split("@")[0]?.trim();

  if (fallback) {
    return fallback;
  }

  return "Vnuk Pod Naem user";
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
    .select("id,email,role,first_name,phone,created_at")
    .eq("id", userId)
    .single();

  if (isNoRowsError(error)) {
    return { profile: null, errorMessage: null };
  }

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  const row = data as {
    id: string;
    email: string;
    role: string;
    first_name: string | null;
    phone: string | null;
    created_at: string | null;
  };

  return {
    profile: {
      id: row.id,
      email: row.email,
      role: row.role as ProfileRole,
      display_name: row.first_name,
      phone: row.phone,
      created_at: row.created_at,
    },
    errorMessage: null,
  };
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
  // Universal account model: every self-created profile is an 'elder' (RLS only
  // permits id = auth.uid() with role = 'elder'). Admin is assigned manually.
  const { error } = await supabase.from("profiles").insert({
    id: input.userId,
    email: input.email,
    role: "elder",
    first_name: input.displayName?.trim() || deriveDisplayNameFromEmail(input.email),
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
