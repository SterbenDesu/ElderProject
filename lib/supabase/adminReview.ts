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
    .from("helper_applications")
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

export type HelperApplicationReviewRpcResult = {
  ok?: boolean;
  action?: AdminApplicationActionStatus;
  application?: HelperApplication;
  audit_logged?: boolean;
  audit_error?: string | null;
};

function isReviewRpcResult(value: unknown): value is HelperApplicationReviewRpcResult {
  return typeof value === "object" && value !== null && "application" in value;
}

export async function changeHelperApplicationStatus(
  supabase: SupabaseClient,
  input: {
    applicationId: string;
    newStatus: AdminApplicationActionStatus;
  },
): Promise<{ application: HelperApplication | null; errorMessage: string | null; auditWarning: string | null }> {
  const { data, error } = await supabase.rpc("review_helper_application", {
    p_application_id: input.applicationId,
    p_action: input.newStatus,
  });

  if (error) {
    return {
      application: null,
      errorMessage: `Could not ${input.newStatus === "approved" ? "approve" : "update"} the helper application: ${error.message}. Confirm the admin helper review RPC migration is applied.`,
      auditWarning: null,
    };
  }

  if (!isReviewRpcResult(data) || !data.application) {
    return {
      application: null,
      errorMessage: "The helper review RPC returned an unexpected result. The application list was not updated locally.",
      auditWarning: null,
    };
  }

  return {
    application: data.application,
    errorMessage: null,
    auditWarning: data.audit_logged === false
      ? `Status changed, but audit logging failed: ${data.audit_error ?? "Unknown audit log error"}.`
      : null,
  };
}
