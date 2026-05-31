"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

function formatRole(role: ProfileRole) {
  const labels: Record<ProfileRole, string> = {
    client: "Standard account",
    helper_applicant: "Caregiver applicant",
    verified_helper: "Verified caregiver",
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

function getInitials(displayName: string | null, email: string | null) {
  const source = displayName?.trim() || email?.split("@")[0]?.trim() || "VP";
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
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

  const initials = useMemo(
    () => getInitials(profile?.display_name ?? null, user?.email ?? null),
    [profile?.display_name, user?.email],
  );

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

    const helperApplicationResult = await loadOwnHelperApplication(
      supabase,
      result.profile.id,
    );

    if (helperApplicationResult.errorMessage) {
      setHelperApplication(null);
      setHelperApplicationMessage(
        `Could not load caregiver application status: ${helperApplicationResult.errorMessage}. If this is an RLS error, confirm the helper_applications policies are applied.`,
      );
    } else {
      setHelperApplication(helperApplicationResult.application);
      setHelperApplicationMessage(null);
    }

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
      displayName: user.user_metadata?.display_name,
      phone: user.user_metadata?.phone,
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

      if (error || !data.user) {
        setStatus("signed-out");
        setMessage(error?.message ?? null);
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

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
        Account hub
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">
        My profile
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
            <h2 className="text-2xl font-bold text-forest">Please sign in</h2>
            <p className="mt-4 text-lg leading-8">
              Sign in to view your profile, manage booking requests, or start a
              caregiver application.
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
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-5 py-3 font-semibold text-forest transition hover:bg-sage"
              >
                Create account
              </Link>
            </div>
          </div>
          <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
            <h2 className="text-xl font-bold text-forest">What you can do</h2>
            <ul className="mt-4 space-y-3 leading-7">
              <li>• Browse caregivers and request everyday support.</li>
              <li>• Save elderly profiles for family booking requests.</li>
              <li>• Apply to become a caregiver after account creation.</li>
            </ul>
          </aside>
        </div>
      ) : null}

      {status === "signed-in" && user ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <div className="flex flex-wrap items-center gap-4">
              <span className="grid size-16 place-items-center rounded-full bg-forest text-xl font-bold text-white">
                {initials}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-forest">
                  {profile?.display_name || "Welcome"}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {user.email} {profile ? `• ${formatRole(profile.role)}` : ""}
                </p>
              </div>
            </div>

            {profileStatus === "loading" ? (
              <p className="mt-5 rounded-3xl bg-cream p-5 text-sm font-semibold text-stone-700">
                Loading your profile…
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
                <dl className="mt-6 grid gap-4 rounded-3xl bg-cream p-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-bold text-forest">Email</dt>
                    <dd className="mt-1 break-words">{profile.email}</dd>
                  </div>
                  <div>
                    <dt className="font-bold text-forest">Phone</dt>
                    <dd className="mt-1">{profile.phone || "Not set yet"}</dd>
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

                <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5">
                  <h3 className="font-bold text-forest">Account actions</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Use these shortcuts to browse support, manage family request
                    details, or apply to become a caregiver.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="/helpers"
                      className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Browse caregivers
                    </Link>
                    <Link
                      href="/helper/apply"
                      className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-forest transition hover:bg-sage"
                    >
                      Become a caregiver
                    </Link>
                    <Link
                      href="/dashboard/elderly-profiles"
                      className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-forest transition hover:bg-sage"
                    >
                      Elderly profiles
                    </Link>
                    <Link
                      href="/dashboard/bookings"
                      className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-forest transition hover:bg-sage"
                    >
                      Bookings
                    </Link>
                  </div>
                </section>

                <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5">
                  <h3 className="font-bold text-forest">Caregiver application</h3>
                  {helperApplicationMessage ? (
                    <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">
                      {helperApplicationMessage}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {helperApplication
                        ? `Current status: ${formatHelperApplicationStatus(helperApplication.status)}.`
                        : "No caregiver application has been saved yet."}
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    The existing application flow is used for caregiver review.
                    Admin approval is required before caregiver functionality is
                    available.
                  </p>
                  <Link
                    href="/helper/apply"
                    className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                  >
                    Open caregiver application
                  </Link>
                </section>

                {profile.role === "client" ? (
                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    <section className="rounded-3xl border border-stone-200 bg-white p-5">
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
                    </section>
                    <section className="rounded-3xl border border-stone-200 bg-white p-5">
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
                    </section>
                  </div>
                ) : null}

                {profile.role === "verified_helper" ? (
                  <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5">
                    <h3 className="font-bold text-forest">Caregiver profile</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      You are approved as a caregiver. You can manage safe public
                      helper profile fields; admins still control public
                      visibility.
                    </p>
                    <Link
                      href="/dashboard/helper-profile"
                      className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Manage caregiver profile
                    </Link>
                  </section>
                ) : null}

                {profile.role === "admin" ? (
                  <section className="mt-6 rounded-3xl border border-clay/30 bg-cream p-5">
                    <h3 className="font-bold text-forest">Admin tools</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      Admin tools are visible only for admin profiles.
                    </p>
                    <Link
                      href="/admin"
                      className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                    >
                      Open admin
                    </Link>
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
          <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
            <h2 className="text-xl font-bold text-forest">Profile direction</h2>
            <ul className="mt-4 space-y-3 leading-7">
              <li>• Your profile is the account hub after login.</li>
              <li>• New users start with a standard account.</li>
              <li>• Become a caregiver uses the existing application flow.</li>
              <li>
                • Final reservation, scheduling, and payment steps are not
                active yet.
              </li>
            </ul>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
