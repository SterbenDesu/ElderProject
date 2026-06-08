import type { SupabaseClient } from "@supabase/supabase-js";
import type { HelperApplication } from "@/lib/supabase/helperApplications";

export type AdminHelperApplication = HelperApplication & {
  applicant_email: string | null;
};

export type AdminApplicationActionStatus = "under_review" | "approved" | "rejected";

type ProfileEmailRow = {
  id: string;
  email: string | null;
};

const helperApplicationSelect = "id,profile_id,status,full_name,city,motivation,experience_summary,availability_summary,created_at,updated_at";

export async function loadAdminHelperApplications(
  supabase: SupabaseClient,
): Promise<{ applications: AdminHelperApplication[]; errorMessage: string | null; emailWarning: string | null }> {
  const { data, error } = await supabase
    .from("caregiver_applications")
    .select(helperApplicationSelect)
    .order("created_at", { ascending: false });

  if (error) {
    return { applications: [], errorMessage: error.message, emailWarning: null };
  }

  const applications = ((data as HelperApplication[] | null) ?? []).map((application) => ({
    ...application,
    applicant_email: null,
  }));

  const profileIds = Array.from(new Set(applications.map((application) => application.profile_id)));

  if (profileIds.length === 0) {
    return { applications, errorMessage: null, emailWarning: null };
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,email")
    .in("id", profileIds);

  if (profilesError) {
    return {
      applications,
      errorMessage: null,
      emailWarning: `Applications loaded, but profile emails could not be loaded: ${profilesError.message}. Confirm the admin profiles RLS policy is applied.`,
    };
  }

  const emailByProfileId = new Map(
    ((profiles as ProfileEmailRow[] | null) ?? []).map((profile) => [profile.id, profile.email]),
  );

  return {
    applications: applications.map((application) => ({
      ...application,
      applicant_email: emailByProfileId.get(application.profile_id) ?? null,
    })),
    errorMessage: null,
    emailWarning: null,
  };
}

// Shape returned by the canonical `review_caregiver_application` RPC
// (SUPABASE_SETUP.sql §14). Unlike the retired `review_helper_application`, it
// returns the application id/status as flat fields rather than a nested object.
export type CaregiverApplicationReviewRpcResult = {
  ok?: boolean;
  action?: AdminApplicationActionStatus;
  application_id?: string;
  application_status?: HelperApplication["status"];
  caregiver_profile_id?: string | null;
  caregiver_profile_is_visible?: boolean | null;
  audit_logged?: boolean;
  audit_error?: string | null;
};

function isReviewRpcResult(value: unknown): value is CaregiverApplicationReviewRpcResult {
  return typeof value === "object" && value !== null && "application_id" in value;
}

export async function changeHelperApplicationStatus(
  supabase: SupabaseClient,
  input: {
    applicationId: string;
    newStatus: AdminApplicationActionStatus;
  },
): Promise<{
  applicationId: string | null;
  applicationStatus: HelperApplication["status"] | null;
  errorMessage: string | null;
  auditWarning: string | null;
}> {
  const { data, error } = await supabase.rpc("review_caregiver_application", {
    p_application_id: input.applicationId,
    p_action: input.newStatus,
  });

  if (error) {
    return {
      applicationId: null,
      applicationStatus: null,
      errorMessage:
        input.newStatus === "approved"
          ? "We couldn't approve this application right now. Please try again in a moment."
          : "We couldn't update this application right now. Please try again in a moment.",
      auditWarning: null,
    };
  }

  if (!isReviewRpcResult(data) || !data.application_id) {
    return {
      applicationId: null,
      applicationStatus: null,
      errorMessage: "The review did not complete as expected. Please refresh and try again.",
      auditWarning: null,
    };
  }

  return {
    applicationId: data.application_id,
    applicationStatus: data.application_status ?? null,
    errorMessage: null,
    auditWarning:
      data.audit_logged === false
        ? "The status was changed, but the action could not be written to the audit log."
        : null,
  };
}
