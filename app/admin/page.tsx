"use client";

import { PageIntro } from "@/components/PageIntro";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  changeHelperApplicationStatus,
  loadAdminHelperApplications,
  type AdminApplicationActionStatus,
  type AdminHelperApplication,
} from "@/lib/supabase/adminReview";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatHelperApplicationStatus } from "@/lib/supabase/helperApplications";
import {
  changeHelperProfileVisibility,
  formatHelperVerificationStatus,
  loadAdminApprovedHelperProfiles,
  type AdminHelperProfile,
} from "@/lib/supabase/helperProfiles";
import { loadProfile, type Profile } from "@/lib/supabase/profiles";
import {
  loadAdminDisputes,
  resolveDispute,
  type AdminDispute,
  type DisputeResolution,
} from "@/lib/supabase/disputes";
import { formatLevaAmount } from "@/lib/supabase/caregiverDashboard";
import { slotsByDate } from "@/lib/reservationFormat";

type AdminPageStatus =
  | "loading"
  | "signed-out"
  | "unconfigured"
  | "checking-profile"
  | "missing-profile"
  | "access-denied"
  | "admin"
  | "error";

type DashboardSection = {
  title: string;
  description: string;
};

const adminSections: DashboardSection[] = [
  {
    title: "Helper applications",
    description:
      "Review submitted helper applications and make basic verification decisions.",
  },
  {
    title: "Helper visibility",
    description:
      "Manage whether approved helper profiles appear publicly on /helpers.",
  },
  {
    title: "Users/profiles overview",
    description:
      "Placeholder for future support-safe profile lookup and account status tools.",
  },
  {
    title: "Bookings",
    description:
      "Placeholder only. Booking management and booking payments are not implemented.",
  },
  {
    title: "Disputes",
    description:
      "Review reported bookings in the dispute review queue below. Release the booking to the caregiver or refund the family — no money moves until Phase 11.",
  },
  {
    title: "Audit logs",
    description:
      "Placeholder for future review of safety and moderation events.",
  },
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function previewText(value: string, maxLength = 150) {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3)}...`;
}

function actionLabel(status: AdminApplicationActionStatus) {
  const labels: Record<AdminApplicationActionStatus, string> = {
    under_review: "Mark under review",
    approved: "Approve",
    rejected: "Reject",
  };

  return labels[status];
}

function heldStateLabel(payoutStatus: string | null): string {
  switch (payoutStatus) {
    case "held_review":
      return "Held — under review";
    case "ready_for_release":
      return "Ready for release";
    case "reversed":
      return "Payout reversed";
    default:
      return payoutStatus ?? "Held";
  }
}

function DisputeReviewCard({
  dispute,
  onResolve,
  isWorking,
}: {
  dispute: AdminDispute;
  onResolve: (dispute: AdminDispute, resolution: DisputeResolution) => void;
  isWorking: boolean;
}) {
  const dates = slotsByDate(dispute.slots);
  const reportedLabel = dispute.reportedAt
    ? new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dispute.reportedAt))
    : "Not available";

  return (
    <article className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-forest">
            {dispute.elderName || "Family"} ↔ {dispute.caregiverName || "Caregiver"}
          </h3>
          <p className="mt-1 text-sm font-semibold text-stone-600">
            {dispute.regionName ?? "District not set"} · Reported {reportedLabel}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-800">
          {heldStateLabel(dispute.payoutStatus)}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
            Services
          </h4>
          <ul className="mt-2 space-y-1.5">
            {dispute.services.map((item, index) => (
              <li
                key={`${item.label}-${index}`}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="text-stone-700">{item.label}</span>
                <span className="font-semibold text-forest">
                  {formatLevaAmount(item.unitPriceMinor * item.quantity)} лв.
                </span>
              </li>
            ))}
            {dispute.services.length === 0 ? (
              <li className="text-sm text-stone-500">No services listed</li>
            ) : null}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
            Dates &amp; time slots
          </h4>
          <ul className="mt-2 space-y-1.5">
            {dates.map((day) => (
              <li key={day.date} className="text-sm text-stone-700">
                <span className="font-semibold text-forest">{day.date}</span>
                <span className="ml-1.5">{day.ranges.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
          The family&apos;s reported issue
        </h4>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
          {dispute.issueDetails || "No description was provided."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/70 pt-4">
        <p className="text-sm text-stone-600">
          Total{" "}
          <span className="text-lg font-bold text-forest">
            {formatLevaAmount(dispute.totalAmountMinor)} лв.
          </span>
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onResolve(dispute, "refund")}
            disabled={isWorking}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? "Saving…" : "Refund to family"}
          </button>
          <button
            type="button"
            onClick={() => onResolve(dispute, "release")}
            disabled={isWorking}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWorking ? "Saving…" : "Release to caregiver"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const [status, setStatus] = useState<AdminPageStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<AdminHelperApplication[]>(
    [],
  );
  const [helperProfiles, setHelperProfiles] = useState<AdminHelperProfile[]>(
    [],
  );
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [disputesWarning, setDisputesWarning] = useState<string | null>(null);
  const [workingDisputeId, setWorkingDisputeId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [auditWarning, setAuditWarning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [workingApplicationId, setWorkingApplicationId] = useState<
    string | null
  >(null);
  const [workingHelperProfileId, setWorkingHelperProfileId] = useState<
    string | null
  >(null);

  const selectedApplication =
    applications.find(
      (application) => application.id === selectedApplicationId,
    ) ??
    applications[0] ??
    null;

  const loadAdminData = useCallback(async () => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    const [applicationsResult, helperProfilesResult, disputesResult] =
      await Promise.all([
        loadAdminHelperApplications(supabase),
        loadAdminApprovedHelperProfiles(supabase),
        loadAdminDisputes(supabase),
      ]);

    // The dispute queue is non-blocking: a failure here shouldn't hide the rest
    // of the admin panel. Surface a warning and keep going.
    if (disputesResult.errorMessage) {
      setDisputes([]);
      setDisputesWarning(
        "We couldn't load the dispute review queue right now. Please refresh in a moment.",
      );
    } else {
      setDisputes(disputesResult.disputes);
      setDisputesWarning(null);
    }

    if (applicationsResult.errorMessage) {
      setStatus("error");
      setMessage(
        "We couldn't load caregiver applications right now. Please refresh in a moment. If this keeps happening, the admin access policy may need to be reapplied.",
      );
      setApplications([]);
      setHelperProfiles([]);
      return;
    }

    if (helperProfilesResult.errorMessage) {
      setStatus("error");
      setMessage(
        "We couldn't load approved caregivers right now. Please refresh in a moment. If this keeps happening, the admin access policy may need to be reapplied.",
      );
      setApplications([]);
      setHelperProfiles([]);
      return;
    }

    setApplications(applicationsResult.applications);
    setHelperProfiles(helperProfilesResult.helperProfiles);
    setSelectedApplicationId((currentId) => {
      if (
        currentId &&
        applicationsResult.applications.some(
          (application) => application.id === currentId,
        )
      ) {
        return currentId;
      }

      return applicationsResult.applications[0]?.id ?? null;
    });
    setEmailWarning(
      applicationsResult.emailWarning ?? helperProfilesResult.emailWarning,
    );
    setStatus("admin");
    setMessage(null);
  }, []);

  const checkAdminAccess = useCallback(
    async (currentUser: User) => {
      const { supabase, envError } = getSupabaseBrowserClient();

      if (envError || !supabase) {
        setStatus("unconfigured");
        setMessage(envError);
        return;
      }

      setStatus("checking-profile");
      setMessage(null);
      setActionSuccess(null);
      setActionError(null);

      const profileResult = await loadProfile(supabase, currentUser.id);

      if (profileResult.errorMessage) {
        setStatus("error");
        setMessage(
          "We couldn't confirm your admin access right now. Please refresh and try again in a moment.",
        );
        setProfile(null);
        setApplications([]);
        setHelperProfiles([]);
        return;
      }

      if (!profileResult.profile) {
        setStatus("missing-profile");
        setMessage(
          "Your auth account exists, but no profiles row was found. Create or repair the profile before using admin tools.",
        );
        setProfile(null);
        setApplications([]);
        setHelperProfiles([]);
        return;
      }

      setProfile(profileResult.profile);

      if (profileResult.profile.role !== "admin") {
        setStatus("access-denied");
        setMessage(
          "Access denied. Your profile role is not admin, so this page will not load helper application review data.",
        );
        setApplications([]);
        setHelperProfiles([]);
        return;
      }

      await loadAdminData();
    },
    [loadAdminData],
  );

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    let isMounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        setStatus("signed-out");
        setMessage(error.message);
        setUser(null);
        setProfile(null);
        setApplications([]);
        setHelperProfiles([]);
        return;
      }

      if (!data.user) {
        setStatus("signed-out");
        setMessage(null);
        setUser(null);
        setProfile(null);
        setApplications([]);
        setHelperProfiles([]);
        return;
      }

      setUser(data.user);
      void checkAdminAccess(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setStatus("signed-out");
        setMessage(null);
        setUser(null);
        setProfile(null);
        setApplications([]);
        setHelperProfiles([]);
        return;
      }

      setUser(session.user);
      void checkAdminAccess(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdminAccess]);

  async function handleStatusChange(
    application: AdminHelperApplication,
    newStatus: AdminApplicationActionStatus,
  ) {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    if (!user || !profile || profile.role !== "admin") {
      setActionError(
        "Only signed-in admin users can review helper applications.",
      );
      return;
    }

    setWorkingApplicationId(application.id);
    setActionSuccess(null);
    setActionError(null);
    setAuditWarning(null);

    const result = await changeHelperApplicationStatus(supabase, {
      applicationId: application.id,
      newStatus,
    });

    if (result.errorMessage || !result.applicationId) {
      setActionError(
        result.errorMessage ??
          "The status update did not complete. Please refresh and try again.",
      );
      setWorkingApplicationId(null);
      return;
    }

    setActionSuccess(
      `${actionLabel(newStatus)} completed for ${application.full_name}.`,
    );
    setAuditWarning(result.auditWarning);
    await loadAdminData();
    setSelectedApplicationId(result.applicationId);
    setWorkingApplicationId(null);
  }

  async function handleVisibilityChange(
    helperProfile: AdminHelperProfile,
    isVisible: boolean,
  ) {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    if (!user || !profile || profile.role !== "admin") {
      setActionError(
        "Only signed-in admin users can change public helper visibility.",
      );
      return;
    }

    setWorkingHelperProfileId(helperProfile.id);
    setActionSuccess(null);
    setActionError(null);
    setAuditWarning(null);

    const result = await changeHelperProfileVisibility(supabase, {
      caregiverProfileId: helperProfile.id,
      isVisible,
    });

    if (result.errorMessage || result.isVisible === null) {
      setActionError(
        result.errorMessage ??
          "The visibility update did not complete. Please refresh and try again.",
      );
      setWorkingHelperProfileId(null);
      return;
    }

    setActionSuccess(
      result.isVisible
        ? `${helperProfile.display_name} is now visible on the caregivers list.`
        : `${helperProfile.display_name} is now hidden from the caregivers list.`,
    );
    await loadAdminData();
    setWorkingHelperProfileId(null);
  }

  async function handleResolveDispute(
    dispute: AdminDispute,
    resolution: DisputeResolution,
  ) {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    if (!user || !profile || profile.role !== "admin") {
      setActionError("Only signed-in admin users can resolve disputes.");
      return;
    }

    // resolve_dispute only sets STATES — release marks the booking completed with
    // payout "ready for release"; refund marks it cancelled with payment "to be
    // refunded". Phase 11's Stripe logic moves the actual money.
    const confirmed = window.confirm(
      resolution === "release"
        ? "Release this booking to the caregiver? It will be marked completed and queued for payout. No money moves yet."
        : "Refund the family? The booking will be cancelled and queued for a refund. No money moves yet.",
    );

    if (!confirmed) {
      return;
    }

    setWorkingDisputeId(dispute.reservationId);
    setActionSuccess(null);
    setActionError(null);

    const result = await resolveDispute(supabase, dispute.reservationId, resolution);

    if (result.errorMessage) {
      setActionError(
        "The dispute resolution did not complete. Please refresh and try again.",
      );
      setWorkingDisputeId(null);
      return;
    }

    setActionSuccess(
      resolution === "release"
        ? "Dispute resolved. The booking was released to the caregiver and queued for payout."
        : "Dispute resolved. A refund to the family was queued.",
    );
    await loadAdminData();
    setWorkingDisputeId(null);
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Admin dashboard"
        title="Helper application review"
        description="Admin users can review helper applications, update review status, and control whether approved helper profiles are publicly visible on /helpers."
      />

      {status === "loading" || status === "checking-profile" ? (
        <div
          className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200"
          role="status"
        >
          {status === "loading"
            ? "Checking your admin session..."
            : "Checking your profile role..."}
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <div
          className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900"
          role="alert"
        >
          <h2 className="text-2xl font-bold">Supabase configuration needed</h2>
          <p className="mt-4 leading-7">{message}</p>
        </div>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Please log in</h2>
          <p className="mt-4 text-lg leading-8">
            You need to log in with an admin account before viewing helper
            application review data.
          </p>
          {message ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </p>
          ) : null}
          <Link
            href="/login"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            Login
          </Link>
        </div>
      ) : null}

      {status === "missing-profile" ||
      status === "access-denied" ||
      status === "error" ? (
        <div
          className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900"
          role="alert"
        >
          <h2 className="text-2xl font-bold">
            {status === "access-denied"
              ? "Access denied"
              : "Admin access needs attention"}
          </h2>
          <p className="mt-4 leading-7">{message}</p>
          <p className="mt-4 text-sm font-semibold leading-6">
            No admin application data is loaded for this account.
          </p>
        </div>
      ) : null}

      {status === "admin" ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[0.95fr_1.35fr]">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-2xl font-bold text-forest">
                Dashboard sections
              </h2>
              <div className="mt-5 grid gap-3">
                {adminSections.map((section) => (
                  <article
                    key={section.title}
                    className="rounded-3xl border border-stone-200 p-4"
                  >
                    <h3 className="font-bold text-forest">{section.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {section.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-forest">Applications</h2>
                <button
                  type="button"
                  onClick={loadAdminData}
                  className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-forest transition hover:bg-sage"
                >
                  Refresh
                </button>
              </div>

              {emailWarning ? (
                <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                  {emailWarning}
                </p>
              ) : null}

              {applications.length === 0 ? (
                <p className="mt-5 rounded-3xl bg-cream p-5 leading-7 text-stone-700">
                  No helper applications are available for review yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {applications.map((application) => (
                    <button
                      key={application.id}
                      type="button"
                      onClick={() => setSelectedApplicationId(application.id)}
                      className={`w-full rounded-3xl border p-4 text-left transition ${selectedApplication?.id === application.id ? "border-clay bg-cream" : "border-stone-200 bg-white hover:bg-sage"}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-forest">
                          {application.full_name}
                        </h3>
                        <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-forest">
                          {formatHelperApplicationStatus(application.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-stone-600">
                        {application.city} ·{" "}
                        {formatDateTime(application.created_at)}
                      </p>
                      {application.applicant_email ? (
                        <p className="mt-1 break-words text-sm text-stone-600">
                          {application.applicant_email}
                        </p>
                      ) : null}
                      <p className="mt-3 text-sm leading-6 text-stone-600">
                        {previewText(application.motivation)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-2xl font-bold text-forest">
                Approved caregiver visibility
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Only admins can make verified caregivers public. Hidden
                caregivers and unverified applicants do not appear on the
                caregivers list.
              </p>

              {helperProfiles.length === 0 ? (
                <p className="mt-5 rounded-3xl bg-cream p-5 leading-7 text-stone-700">
                  No approved caregivers are available yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {helperProfiles.map((helperProfile) => (
                    <article
                      key={helperProfile.id}
                      className="rounded-3xl border border-stone-200 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-forest">
                            {helperProfile.display_name ||
                              helperProfile.account_name ||
                              "Approved caregiver"}
                          </h3>
                          <p className="mt-1 break-words text-sm text-stone-600">
                            {helperProfile.account_email ??
                              "Email not available"}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-stone-600">
                            {helperProfile.covers_whole_city
                              ? "Whole city"
                              : "Selected districts"}{" "}
                            ·{" "}
                            {formatHelperVerificationStatus(
                              helperProfile.verification_status,
                            )}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${helperProfile.is_visible ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-700"}`}
                        >
                          {helperProfile.is_visible ? "Visible" : "Hidden"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-stone-600">
                        {previewText(helperProfile.bio, 180)}
                      </p>
                      {helperProfile.experience ? (
                        <p className="mt-2 text-sm leading-6 text-stone-600">
                          {previewText(helperProfile.experience, 140)}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() =>
                          handleVisibilityChange(
                            helperProfile,
                            !helperProfile.is_visible,
                          )
                        }
                        disabled={workingHelperProfileId === helperProfile.id}
                        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {workingHelperProfileId === helperProfile.id
                          ? "Saving..."
                          : helperProfile.is_visible
                            ? "Hide from caregivers list"
                            : "Show on caregivers list"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold text-forest">Review details</h2>

            {actionSuccess ? (
              <p
                className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800"
                role="status"
              >
                {actionSuccess}
              </p>
            ) : null}
            {actionError ? (
              <p
                className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-800"
                role="alert"
              >
                {actionError}
              </p>
            ) : null}
            {auditWarning ? (
              <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                {auditWarning}
              </p>
            ) : null}

            {!selectedApplication ? (
              <p className="mt-5 rounded-3xl bg-cream p-5 leading-7">
                Select an application to review, or wait for applicants to
                submit helper applications.
              </p>
            ) : (
              <article className="mt-5">
                <dl className="grid gap-4 rounded-3xl bg-cream p-5 text-sm">
                  <div>
                    <dt className="font-bold text-forest">Full name</dt>
                    <dd className="mt-1">{selectedApplication.full_name}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Email</dt>
                    <dd className="mt-1 break-words">
                      {selectedApplication.applicant_email ??
                        "Not available through current profile read"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">City</dt>
                    <dd className="mt-1">{selectedApplication.city}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Current status</dt>
                    <dd className="mt-1">
                      {formatHelperApplicationStatus(
                        selectedApplication.status,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Created date</dt>
                    <dd className="mt-1">
                      {formatDateTime(selectedApplication.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Updated date</dt>
                    <dd className="mt-1">
                      {formatDateTime(selectedApplication.updated_at)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 space-y-4">
                  <section className="rounded-3xl border border-stone-200 p-4">
                    <h3 className="font-bold text-forest">Motivation</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                      {selectedApplication.motivation}
                    </p>
                  </section>
                  <section className="rounded-3xl border border-stone-200 p-4">
                    <h3 className="font-bold text-forest">
                      Experience summary
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                      {selectedApplication.experience_summary || "Not provided"}
                    </p>
                  </section>
                  <section className="rounded-3xl border border-stone-200 p-4">
                    <h3 className="font-bold text-forest">
                      Availability summary
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                      {selectedApplication.availability_summary ||
                        "Not provided"}
                    </p>
                  </section>
                </div>

                <div className="mt-6 rounded-3xl border border-clay/30 bg-cream p-5">
                  <h3 className="font-bold text-forest">Admin actions</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Approving sets the application to approved, unlocks caregiver
                    tools for that account, and publishes a verified caregiver
                    profile on the caregivers list.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {(
                      [
                        "under_review",
                        "approved",
                        "rejected",
                      ] as AdminApplicationActionStatus[]
                    ).map((nextStatus) => (
                      <button
                        key={nextStatus}
                        type="button"
                        onClick={() =>
                          handleStatusChange(selectedApplication, nextStatus)
                        }
                        disabled={
                          workingApplicationId === selectedApplication.id ||
                          selectedApplication.status === nextStatus
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {workingApplicationId === selectedApplication.id
                          ? "Saving..."
                          : actionLabel(nextStatus)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-stone-700">
                    An approved caregiver appears on the caregivers list right
                    away. Use the visibility controls to hide or show an approved
                    caregiver at any time.
                  </p>
                </div>
              </article>
            )}
          </section>
        </div>
      ) : null}

      {status === "admin" ? (
        <section className="mt-5 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-forest">
                Dispute review queue
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Reported bookings only. Funds stay held until you resolve each one.
                Releasing or refunding sets the state for Phase 11 — no money moves
                here. Only admins can see this queue.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-forest transition hover:bg-sage"
            >
              Refresh
            </button>
          </div>

          {disputesWarning ? (
            <p
              className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900"
              role="alert"
            >
              {disputesWarning}
            </p>
          ) : null}

          {disputes.length === 0 ? (
            <p className="mt-5 rounded-3xl bg-cream p-5 leading-7 text-stone-700">
              No bookings are under dispute right now.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {disputes.map((dispute) => (
                <DisputeReviewCard
                  key={dispute.reservationId}
                  dispute={dispute}
                  onResolve={handleResolveDispute}
                  isWorking={workingDisputeId === dispute.reservationId}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
