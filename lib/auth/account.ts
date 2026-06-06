// Identity & role helpers — the single source of truth for "who is the current
// user and what can they do", built on the *applied* target schema:
//
//   profiles.role        = 'elder' | 'admin'   (admin is manually assigned)
//   caregiver capability = the existence of an APPROVED caregiver_profiles row
//                          (verification_status in 'verified_basic' | 'trusted').
//                          It is NOT a profiles.role — this keeps the universal
//                          account model: everyone is an elder by default.
//
// PHONE PRIVACY: profiles.phone is owner/admin-only at the database level (no
// cross-user/public SELECT policy exists). Nothing here ever reads another
// user's profile, so the phone can only ever be read by its owner.

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AccountRole = "elder" | "admin";

export type AccountProfile = {
  id: string;
  email: string;
  role: AccountRole;
  first_name: string | null;
  last_name: string | null;
  /** PRIVATE — owner/admin only. Never shown publicly. */
  phone: string | null;
  age: number | null;
  avatar_url: string | null;
  account_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const currentTermsVersion = "v0.1-placeholder";
export const currentPrivacyVersion = "v0.1-placeholder";

const noRowsCode = "PGRST116";
const duplicateRowCode = "23505";

const PROFILE_COLUMNS =
  "id,email,role,first_name,last_name,phone,age,avatar_url,account_status,created_at,updated_at";

function isNoRowsError(error: { code?: string } | null) {
  return error?.code === noRowsCode;
}

function isDuplicateRowError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === duplicateRowCode ||
    Boolean(error?.message?.toLowerCase().includes("duplicate key"))
  );
}

function deriveFirstNameFromEmail(email: string) {
  const fallback = email.split("@")[0]?.trim();
  return fallback || "Vnuk Pod Naem user";
}

/** Load the signed-in user's own profile row (RLS: owner-only). */
export async function loadAccountProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ profile: AccountProfile | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (isNoRowsError(error)) {
    return { profile: null, errorMessage: null };
  }

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  return { profile: data as AccountProfile, errorMessage: null };
}

export type ElderProfileInput = {
  firstName: string;
  lastName: string;
  phone: string;
  age: number | null;
  avatarUrl?: string | null;
};

/**
 * Details captured at signup are mirrored into Supabase Auth user_metadata so
 * the profile row can be created on the first authenticated load even when
 * email confirmation delays the very first session (see ensureElderProfile).
 */
export function readElderDetailsFromUser(user: User): ElderProfileInput {
  const meta = user.user_metadata ?? {};
  const rawAge = meta.age;
  const parsedAge =
    typeof rawAge === "number"
      ? rawAge
      : typeof rawAge === "string" && rawAge.trim() !== ""
        ? Number(rawAge)
        : null;

  return {
    firstName: String(meta.first_name ?? "").trim(),
    lastName: String(meta.last_name ?? "").trim(),
    phone: String(meta.phone ?? "").trim(),
    age: parsedAge !== null && Number.isFinite(parsedAge) ? parsedAge : null,
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
}

/** Insert the elder's profile row. RLS allows id = auth.uid() and role 'elder' only. */
export async function createElderProfile(
  supabase: SupabaseClient,
  input: { userId: string; email: string } & ElderProfileInput,
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase.from("profiles").insert({
    id: input.userId,
    email: input.email,
    role: "elder",
    first_name: input.firstName || deriveFirstNameFromEmail(input.email),
    last_name: input.lastName || null,
    phone: input.phone || null,
    age: input.age,
    avatar_url: input.avatarUrl || null,
  });

  if (isDuplicateRowError(error)) {
    return { errorMessage: null };
  }

  if (error) {
    return { errorMessage: error.message };
  }

  return { errorMessage: null };
}

/** Record Terms/Privacy acceptance for the owner (best-effort, owner-insert RLS). */
export async function recordTermsAcceptance(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ errorMessage: string | null }> {
  const { error } = await supabase.from("terms_acceptances").insert({
    profile_id: userId,
    terms_version: currentTermsVersion,
    privacy_version: currentPrivacyVersion,
  });

  if (error) {
    return { errorMessage: error.message };
  }

  return { errorMessage: null };
}

/**
 * Guarantee the signed-in user has a profile row. Used by the single source of
 * truth on first authenticated load so the profile exists even when email
 * confirmation deferred it past signup. Creates an elder row from metadata.
 */
export async function ensureElderProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ profile: AccountProfile | null; errorMessage: string | null }> {
  const existing = await loadAccountProfile(supabase, user.id);

  if (existing.errorMessage || existing.profile) {
    return existing;
  }

  if (!user.email) {
    return {
      profile: null,
      errorMessage:
        "Your account is missing an email address, so the profile could not be created.",
    };
  }

  const details = readElderDetailsFromUser(user);
  const created = await createElderProfile(supabase, {
    userId: user.id,
    email: user.email,
    ...details,
  });

  if (created.errorMessage) {
    return { profile: null, errorMessage: created.errorMessage };
  }

  // Best-effort terms record; never block profile readiness on it.
  await recordTermsAcceptance(supabase, user.id);

  return loadAccountProfile(supabase, user.id);
}

/** Update the owner's own editable fields (RLS: profiles_update_own). */
export async function updateOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  input: ElderProfileInput,
): Promise<{ profile: AccountProfile | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      phone: input.phone || null,
      age: input.age,
      avatar_url: input.avatarUrl ?? null,
    })
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  return { profile: data as AccountProfile, errorMessage: null };
}

/**
 * Caregiver capability = an approved caregiver_profiles row owned by the user.
 * RLS lets the owner read their own caregiver_profiles row; this never reads
 * anyone else's data, so the one-way rule is preserved.
 */
export async function loadIsCaregiver(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("caregiver_profiles")
    .select("verification_status")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return ["verified_basic", "trusted"].includes(
    data.verification_status as string,
  );
}

/**
 * Upload an optional profile photo to the public `avatars` bucket under the
 * user's own folder (storage RLS restricts writes to `{auth.uid}/...`).
 * The resulting public URL is stored in profiles.avatar_url (a public-safe
 * field — it is never a private contact field).
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<{ url: string | null; errorMessage: string | null }> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from("avatars").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    return { url: null, errorMessage: error.message };
  }

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl, errorMessage: null };
}

export function getAccountInitials(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
) {
  const first = firstName?.trim();
  const last = lastName?.trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  const source = first || email?.split("@")[0]?.trim() || "VP";
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}
