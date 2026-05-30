import type { SupabaseClient } from "@supabase/supabase-js";

export type HelperApplicationStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected";

export type HelperApplication = {
  id: string;
  profile_id: string;
  status: HelperApplicationStatus;
  full_name: string;
  city: string;
  motivation: string;
  experience_summary: string | null;
  availability_summary: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type HelperApplicationInput = {
  profileId: string;
  status: "draft" | "submitted";
  fullName: string;
  city: string;
  motivation: string;
  experienceSummary: string;
  availabilitySummary: string;
};

const noRowsCode = "PGRST116";

function isNoRowsError(error: { code?: string } | null) {
  return error?.code === noRowsCode;
}

export function formatHelperApplicationStatus(status: HelperApplicationStatus) {
  const labels: Record<HelperApplicationStatus, string> = {
    draft: "Draft",
    submitted: "Submitted",
    under_review: "Under review",
    approved: "Approved",
    rejected: "Rejected",
  };

  return labels[status];
}

export function canApplicantEditApplication(status: HelperApplicationStatus) {
  return status === "draft" || status === "submitted";
}

export async function loadOwnHelperApplication(
  supabase: SupabaseClient,
  profileId: string,
): Promise<{ application: HelperApplication | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("helper_applications")
    .select("id,profile_id,status,full_name,city,motivation,experience_summary,availability_summary,created_at,updated_at")
    .eq("profile_id", profileId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isNoRowsError(error)) {
    return { application: null, errorMessage: null };
  }

  if (error) {
    return { application: null, errorMessage: error.message };
  }

  return { application: (data as HelperApplication | null) ?? null, errorMessage: null };
}

export async function saveOwnHelperApplication(
  supabase: SupabaseClient,
  input: HelperApplicationInput & { applicationId?: string },
): Promise<{ application: HelperApplication | null; errorMessage: string | null }> {
  const payload = {
    profile_id: input.profileId,
    status: input.status,
    full_name: input.fullName.trim(),
    city: input.city.trim(),
    motivation: input.motivation.trim(),
    experience_summary: input.experienceSummary.trim() || null,
    availability_summary: input.availabilitySummary.trim() || null,
  };

  const query = input.applicationId
    ? supabase
        .from("helper_applications")
        .update(payload)
        .eq("id", input.applicationId)
        .eq("profile_id", input.profileId)
        .select("id,profile_id,status,full_name,city,motivation,experience_summary,availability_summary,created_at,updated_at")
        .single()
    : supabase
        .from("helper_applications")
        .insert(payload)
        .select("id,profile_id,status,full_name,city,motivation,experience_summary,availability_summary,created_at,updated_at")
        .single();

  const { data, error } = await query;

  if (error) {
    return { application: null, errorMessage: error.message };
  }

  return { application: data as HelperApplication, errorMessage: null };
}
