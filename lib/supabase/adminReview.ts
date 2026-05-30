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

function buildHelperProfileBio(application: HelperApplication) {
  const bioSource = application.experience_summary?.trim() || application.motivation.trim();

  if (bioSource.length <= 500) {
    return bioSource;
  }

  return `${bioSource.slice(0, 497)}...`;
}

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

export async function changeHelperApplicationStatus(
  supabase: SupabaseClient,
  input: {
    actorId: string;
    application: HelperApplication;
    newStatus: AdminApplicationActionStatus;
  },
): Promise<{ application: HelperApplication | null; errorMessage: string | null; auditWarning: string | null }> {
  if (input.application.profile_id === input.actorId) {
    return {
      application: null,
      errorMessage: "Admins cannot review or approve their own helper application.",
      auditWarning: null,
    };
  }

  const oldStatus = input.application.status;

  if (input.newStatus === "approved") {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "verified_helper" })
      .eq("id", input.application.profile_id)
      .select("id")
      .single();

    if (profileError) {
      return {
        application: null,
        errorMessage: `Could not update applicant profile role to verified_helper: ${profileError.message}. Confirm the admin profiles update policy is applied.`,
        auditWarning: null,
      };
    }

    const helperProfilePayload = {
      profile_id: input.application.profile_id,
      verification_status: "verified_basic",
      bio: buildHelperProfileBio(input.application),
      city: input.application.city.trim(),
      is_visible: false,
    };

    const { data: existingHelperProfile, error: existingHelperProfileError } = await supabase
      .from("helper_profiles")
      .select("id")
      .eq("profile_id", input.application.profile_id)
      .maybeSingle();

    if (existingHelperProfileError) {
      return {
        application: null,
        errorMessage: `Could not check for an existing helper profile: ${existingHelperProfileError.message}. Confirm the helper_profiles admin policy is applied.`,
        auditWarning: null,
      };
    }

    const helperProfileResult = existingHelperProfile
      ? await supabase
          .from("helper_profiles")
          .update(helperProfilePayload)
          .eq("id", (existingHelperProfile as { id: string }).id)
      : await supabase.from("helper_profiles").insert(helperProfilePayload);

    if (helperProfileResult.error) {
      return {
        application: null,
        errorMessage: `Could not create or update the helper profile: ${helperProfileResult.error.message}. The application was not marked approved.`,
        auditWarning: null,
      };
    }
  }

  const { data, error } = await supabase
    .from("helper_applications")
    .update({ status: input.newStatus })
    .eq("id", input.application.id)
    .select(helperApplicationSelect)
    .single();

  if (error) {
    return {
      application: null,
      errorMessage: `Could not update helper application status: ${error.message}. Confirm the helper_applications admin update policy is applied.`,
      auditWarning: null,
    };
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: input.actorId,
    action: "helper_application_status_changed",
    target_table: "helper_applications",
    target_id: input.application.id,
    metadata: {
      old_status: oldStatus,
      new_status: input.newStatus,
    },
  });

  return {
    application: data as HelperApplication,
    errorMessage: null,
    auditWarning: auditError
      ? `Status changed, but audit logging failed: ${auditError.message}. Confirm the audit_logs admin insert policy is applied.`
      : null,
  };
}

