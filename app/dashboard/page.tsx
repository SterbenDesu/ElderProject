"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { countOwnBookings } from "@/lib/supabase/bookings";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { countOwnElderlyProfiles } from "@/lib/supabase/elderlyProfiles";
import {
  formatHelperApplicationStatus,
  loadOwnHelperApplication,
  type HelperApplication,
} from "@/lib/supabase/helperApplications";
import {
  createSignupDatabaseRecords,
  getSignupAccountTypeFromUser,
  loadProfile,
  type Profile,
  type ProfileRole,
} from "@/lib/supabase/profiles";

type DashboardStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";
type ProfileStatus = "idle" | "loading" | "loaded" | "missing" | "error";

type DashboardSection = {
  title: string;
  description: string;
};

function formatRole(role: ProfileRole) {
  const labels: Record<ProfileRole, string> = {
    client: "Client/caregiver",
    helper_applicant: "Helper applicant",
    verified_helper: "Verified helper",
    admin: "Admin",
  };

  return labels[role];
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function getRoleSections(role: ProfileRole): DashboardSection[] {
  if (role === "helper_applicant") {
    return [
      {
        title: "Helper application",
        description:
          "Use /helper/apply to save a draft or submit your helper application.",
      },
      {
        title: "Verification status",
        description:
          "Submitted applications can be reviewed by admins. Approval is not guaranteed, and approved helpers are not automatically public.",
      },
      {
        title: "Service boundaries",
        description:
          "Reminder that VnukPodNaem covers non-medical support and helpers are independent marketplace participants.",
      },
    ];
  }

  if (role === "verified_helper") {
    return [
      {
        title: "Assigned bookings placeholder",
        description:
          "Future area for accepted non-medical support bookings assigned through the marketplace.",
      },
      {
        title: "Helper profile",
        description:
          "Manage safe public helper profile fields. Admins still control whether the profile is visible publicly.",
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        title: "Admin dashboard",
        description:
          "Use /admin to review helper applications and manage public helper visibility.",
      },
      {
        title: "Helper applications",
        description:
          "Review submitted applications, mark under review, approve, or reject.",
      },
      {
        title: "Disputes placeholder",
        description:
          "Future area for admin-reviewed complaints and booking disputes.",
      },
      {
        title: "Audit logs placeholder",
        description:
          "Future area for viewing important safety and moderation actions.",
      },
    ];
  }

  return [
    {
      title: "Elderly profiles",
      description:
        "Create and manage non-medical elderly profiles connected to your client/caregiver account.",
    },
    {
      title: "Booking requests",
      description:
        "Create and manage requested non-medical service requests. Payment and helper assignment are not active yet.",
    },
    {
      title: "Safety and service boundaries",
      description:
        "Reminder that the platform supports non-medical help only and does not guarantee absolute safety.",
    },
  ];
}

export default function DashboardPage() {
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [helperApplication, setHelperApplication] =
    useState<HelperApplication | null>(null);
  const [helperApplicationMessage, setHelperApplicationMessage] = useState<
    string | null
  >(null);
  const [elderlyProfileCount, setElderlyProfileCount] = useState<number | null>(
    null,
  );
  const [elderlyProfileMessage, setElderlyProfileMessage] = useState<
    string | null
  >(null);
  const [bookingRequestCount, setBookingRequestCount] = useState<number | null>(
    null,
  );
  const [bookingRequestMessage, setBookingRequestMessage] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isRetryingProfileSetup, setIsRetryingProfileSetup] = useState(false);

  const fetchProfile = useCallback(async (currentUser: User) => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setProfileStatus("error");
      setProfileMessage(envError);
      return;
    }

    setProfileStatus("loading");
    setProfileMessage(null);

    const result = await loadProfile(supabase, currentUser.id);

    if (result.errorMessage) {
      setProfile(null);
      setHelperApplication(null);
      setHelperApplicationMessage(null);
      setElderlyProfileCount(null);
      setElderlyProfileMessage(null);
      setBookingRequestCount(null);
      setBookingRequestMessage(null);
      setProfileStatus("error");
      setProfileMessage(result.errorMessage);
      return;
    }

    if (!result.profile) {
      setProfile(null);
      setHelperApplication(null);
      setHelperApplicationMessage(null);
      setElderlyProfileCount(null);
      setElderlyProfileMessage(null);
      setBookingRequestCount(null);
      setBookingRequestMessage(null);
      setProfileStatus("missing");
      setProfileMessage(
        "Your auth account exists, but profile setup is incomplete. Use the retry button below after the database schema and RLS policies are applied.",
      );
      return;
    }

    setProfile(result.profile);
    setProfileStatus("loaded");
    setProfileMessage(null);

    if (result.profile.role === "client") {
      const [elderlyProfileResult, bookingRequestResult] = await Promise.all([
        countOwnElderlyProfiles(supabase, result.profile.id),
        countOwnBookings(supabase, result.profile.id),
      ]);

      if (elderlyProfileResult.errorMessage) {
        setElderlyProfileCount(null);
        setElderlyProfileMessage(
          `Could not load elderly profile count: ${elderlyProfileResult.errorMessage}. If this is an RLS error, confirm the elderly_profiles policies are applied.`,
        );
      } else {
        setElderlyProfileCount(elderlyProfileResult.count);
        setElderlyProfileMessage(null);
      }

      if (bookingRequestResult.errorMessage) {
        setBookingRequestCount(null);
        setBookingRequestMessage(
          `Could not load booking request count: ${bookingRequestResult.errorMessage}. If this is an RLS error, confirm the bookings policies are applied.`,
        );
      } else {
        setBookingRequestCount(bookingRequestResult.count);
        setBookingRequestMessage(null);
      }
    } else {
      setElderlyProfileCount(null);
      setElderlyProfileMessage(null);
      setBookingRequestCount(null);
      setBookingRequestMessage(null);
    }

    if (result.profile.role === "helper_applicant") {
      const helperApplicationResult = await loadOwnHelperApplication(
        supabase,
        result.profile.id,
      );

      if (helperApplicationResult.errorMessage) {
        setHelperApplication(null);
        setHelperApplicationMessage(
          `Could not load helper application status: ${helperApplicationResult.errorMessage}. If this is an RLS error, confirm the helper_applications policies are applied.`,
        );
        return;
      }

      setHelperApplication(helperApplicationResult.application);
      setHelperApplicationMessage(null);
      return;
    }

    setHelperApplication(null);
    setHelperApplicationMessage(null);
  }, []);

  async function retryProfileSetup() {
    if (!user?.email) {
      setProfileMessage(
        "Cannot retry profile setup because the signed-in user email is unavailable.",
      );
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setProfileMessage(envError);
      return;
    }

    setIsRetryingProfileSetup(true);
    setProfileMessage(null);

    const result = await createSignupDatabaseRecords(supabase, {
      userId: user.id,
      email: user.email,
      accountType: getSignupAccountTypeFromUser(user),
    });

    if (result.errorMessage) {
      setProfileStatus("error");
      setProfileMessage(result.errorMessage);
      setIsRetryingProfileSetup(false);
      return;
    }

    await fetchProfile(user);
    setIsRetryingProfileSetup(false);
  }

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
        setHelperApplication(null);
        setHelperApplicationMessage(null);
        setElderlyProfileCount(null);
        setElderlyProfileMessage(null);
        setBookingRequestCount(null);
        setBookingRequestMessage(null);
        setProfileStatus("idle");
        return;
      }

      if (!data.user) {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setHelperApplication(null);
        setHelperApplicationMessage(null);
        setElderlyProfileCount(null);
        setElderlyProfileMessage(null);
        setBookingRequestCount(null);
        setBookingRequestMessage(null);
        setProfileStatus("idle");
        return;
      }

      setStatus("signed-in");
      setUser(data.user);
      setMessage(null);
      void fetchProfile(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setHelperApplication(null);
        setHelperApplicationMessage(null);
        setElderlyProfileCount(null);
        setElderlyProfileMessage(null);
        setBookingRequestCount(null);
        setBookingRequestMessage(null);
        setProfileStatus("idle");
        return;
      }

      setStatus("signed-in");
      setUser(session.user);
      setMessage(null);
      void fetchProfile(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const roleSections = profile ? getRoleSections(profile.role) : [];

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
        Account dashboard
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">
        Dashboard
      </h1>

      {status === "loading" ? (
        <div
          className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200"
          role="status"
        >
          Checking your account session…
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
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold text-forest">Please log in</h2>
            <p className="mt-4 text-lg leading-8">
              You need to log in before viewing your database-backed dashboard
              profile. Protected middleware is intentionally deferred.
            </p>
            {message ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {message}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-5 py-3 font-semibold text-forest transition hover:bg-sage"
              >
                Sign up
              </Link>
            </div>
          </div>
          <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
            <h2 className="text-xl font-bold text-forest">Dashboard access</h2>
            <ul className="mt-4 space-y-3 leading-7">
              <li>
                • Signed-in users load their profile from the Supabase
                `profiles` table.
              </li>
              <li>
                • No bookings, payments, or live booking payment workflows are
                active.
              </li>
              <li>
                • Route protection middleware is still intentionally deferred.
              </li>
            </ul>
          </aside>
        </div>
      ) : null}

      {status === "signed-in" && user ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold text-forest">Welcome</h2>

            {profileStatus === "loading" ? (
              <p className="mt-5 rounded-3xl bg-cream p-5 text-sm font-semibold text-stone-700">
                Loading your profile from Supabase…
              </p>
            ) : null}

            {(profileStatus === "missing" || profileStatus === "error") &&
            profileMessage ? (
              <div
                className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
                role="alert"
              >
                <h3 className="font-bold">Profile setup needs attention</h3>
                <p className="mt-2 text-sm leading-6">{profileMessage}</p>
                <button
                  type="button"
                  onClick={retryProfileSetup}
                  disabled={isRetryingProfileSetup}
                  className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRetryingProfileSetup
                    ? "Retrying profile setup…"
                    : "Retry profile setup"}
                </button>
              </div>
            ) : null}

            {profile ? (
              <>
                <dl className="mt-5 grid gap-4 rounded-3xl bg-cream p-5 text-sm">
                  <div>
                    <dt className="font-bold text-forest">Email</dt>
                    <dd className="mt-1 break-words">{profile.email}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Role</dt>
                    <dd className="mt-1">{formatRole(profile.role)}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Display name</dt>
                    <dd className="mt-1">
                      {profile.display_name || "Not set yet"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Created date</dt>
                    <dd className="mt-1">{formatDate(profile.created_at)}</dd>
                  </div>
                </dl>

                {profile.role === "client" ? (
                  <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5">
                    <h3 className="font-bold text-forest">Elderly profiles</h3>
                    {elderlyProfileMessage ? (
                      <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                        {elderlyProfileMessage}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {elderlyProfileCount === null
                          ? "Elderly profile count is not loaded yet."
                          : `You have ${elderlyProfileCount} elderly ${elderlyProfileCount === 1 ? "profile" : "profiles"} saved.`}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Manage simple, non-medical elderly profiles and use them
                      when creating booking requests.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href="/dashboard/elderly-profiles"
                        className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                      >
                        Manage elderly profiles
                      </Link>
                      <Link
                        href="/dashboard/bookings"
                        className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-forest transition hover:bg-sage"
                      >
                        Open booking requests
                      </Link>
                    </div>
                  </section>
                ) : null}

                {profile.role === "client" ? (
                  <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5">
                    <h3 className="font-bold text-forest">Booking requests</h3>
                    {bookingRequestMessage ? (
                      <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                        {bookingRequestMessage}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {bookingRequestCount === null
                          ? "Booking request count is not loaded yet."
                          : `You have ${bookingRequestCount} booking ${bookingRequestCount === 1 ? "request" : "requests"} saved.`}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Clients can now create requested non-medical service
                      requests. Payment processing, helper assignment, helper
                      acceptance, matching, and notifications are not active
                      yet.
                    </p>
                    <Link
                      href="/dashboard/bookings"
                      className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Manage booking requests
                    </Link>
                  </section>
                ) : null}

                {profile.role === "helper_applicant" ? (
                  <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5">
                    <h3 className="font-bold text-forest">
                      Helper application status
                    </h3>
                    {helperApplicationMessage ? (
                      <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                        {helperApplicationMessage}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {helperApplication
                          ? `Current status: ${formatHelperApplicationStatus(helperApplication.status)}.`
                          : "No helper application has been saved yet."}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      You can save a draft or submit your application while it
                      remains editable. Submitted applications can be reviewed
                      by admins; approval is not guaranteed, and public helper
                      visibility is not controlled from this dashboard.
                    </p>
                    <Link
                      href="/helper/apply"
                      className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Open helper application
                    </Link>
                  </section>
                ) : null}

                {profile.role === "admin" ? (
                  <section className="mt-6 rounded-3xl border border-clay/30 bg-cream p-5">
                    <h3 className="font-bold text-forest">Admin tools</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Open the admin dashboard to review helper applications and
                      manage public helper visibility. Non-admin users cannot
                      view admin data.
                    </p>
                    <Link
                      href="/admin"
                      className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Open admin dashboard
                    </Link>
                  </section>
                ) : null}

                {profile.role === "verified_helper" ? (
                  <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5">
                    <h3 className="font-bold text-forest">
                      Verified helper status
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Your profile role is verified helper. Applicant-only draft
                      and submission language is hidden here; public marketplace
                      visibility is managed by admins and is not automatic.
                    </p>
                    <Link
                      href="/dashboard/helper-profile"
                      className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Manage helper profile
                    </Link>
                  </section>
                ) : null}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {roleSections.map((section) => (
                    <section
                      key={section.title}
                      className="rounded-3xl border border-stone-200 p-4"
                    >
                      <h3 className="font-bold text-forest">{section.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-stone-600">
                        {section.description}
                      </p>
                    </section>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
            <h2 className="text-xl font-bold text-forest">
              Current dashboard scope
            </h2>
            <ul className="mt-4 space-y-3 leading-7">
              <li>
                • Profile data now comes from the Supabase `profiles` table.
              </li>
              <li>• Dashboard placeholders change by database role.</li>
              <li>
                • Client booking requests can be saved, but payment processing,
                helper assignment, helper acceptance, and live booking payments
                are not active.
              </li>
              <li>
                • Verified helpers can edit safe helper profile fields; only
                admins can make approved helper profiles public.
              </li>
            </ul>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
