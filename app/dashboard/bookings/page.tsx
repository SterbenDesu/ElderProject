"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelOwnRequestedBooking,
  createOwnBookingRequest,
  loadAllowedServiceCategories,
  loadOwnBookings,
  type ClientBooking,
  type ServiceCategory,
} from "@/lib/supabase/bookings";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadOwnElderlyProfiles, type ElderlyProfile } from "@/lib/supabase/elderlyProfiles";
import {
  formatHelperVerificationStatus,
  loadVisibleVerifiedHelperProfilesByIds,
  type PublicHelperProfile,
} from "@/lib/supabase/helperProfiles";
import { loadProfile, type Profile, type ProfileRole } from "@/lib/supabase/profiles";

type PageStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";
type ProfileStatus = "idle" | "loading" | "loaded" | "missing" | "error";
type FormState = {
  elderlyProfileId: string;
  serviceCategoryId: string;
  city: string;
  requestedStartAt: string;
  requestedDurationMinutes: string;
  notes: string;
};

const emptyForm: FormState = {
  elderlyProfileId: "",
  serviceCategoryId: "",
  city: "",
  requestedStartAt: "",
  requestedDurationMinutes: "120",
  notes: "",
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: string) {
  if (status === "requested") {
    return "Requested";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return status.replaceAll("_", " ");
}

function buildDatabaseErrorMessage(action: string, errorMessage: string) {
  return `${action}: ${errorMessage}. If this mentions row-level security or permission denied, confirm the bookings, elderly_profiles, service_categories, helper_profiles, and profiles RLS policies from the Supabase migration are applied for your signed-in client account.`;
}

export default function BookingsPage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfile[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [bookingHelperProfiles, setBookingHelperProfiles] = useState<PublicHelperProfile[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const isClient = profile?.role === "client";

  const elderlyProfileById = useMemo(
    () => new Map(elderlyProfiles.map((elderlyProfile) => [elderlyProfile.id, elderlyProfile])),
    [elderlyProfiles],
  );
  const serviceCategoryById = useMemo(
    () => new Map(serviceCategories.map((category) => [category.id, category])),
    [serviceCategories],
  );
  const helperProfileById = useMemo(
    () => new Map(bookingHelperProfiles.map((helperProfile) => [helperProfile.id, helperProfile])),
    [bookingHelperProfiles],
  );

  const fetchClientData = useCallback(async (currentProfile: Profile) => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setMessage(envError);
      return;
    }

    setMessage(null);

    const [elderlyResult, categoriesResult, bookingsResult] = await Promise.all([
      loadOwnElderlyProfiles(supabase, currentProfile.id),
      loadAllowedServiceCategories(supabase),
      loadOwnBookings(supabase, currentProfile.id),
    ]);

    if (elderlyResult.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not load your elderly profiles", elderlyResult.errorMessage));
      setElderlyProfiles([]);
    } else {
      setElderlyProfiles(elderlyResult.profiles);
      setForm((current) => ({
        ...current,
        elderlyProfileId: current.elderlyProfileId || elderlyResult.profiles[0]?.id || "",
        city: current.city || elderlyResult.profiles[0]?.city || "",
      }));
    }

    if (categoriesResult.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not load allowed service categories", categoriesResult.errorMessage));
      setServiceCategories([]);
    } else {
      setServiceCategories(categoriesResult.categories);
      setForm((current) => ({
        ...current,
        serviceCategoryId: current.serviceCategoryId || categoriesResult.categories[0]?.id || "",
      }));
    }

    if (bookingsResult.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not load booking requests", bookingsResult.errorMessage));
      setBookings([]);
      setBookingHelperProfiles([]);
    } else {
      setBookings(bookingsResult.bookings);

      const helperProfileIds = bookingsResult.bookings
        .map((booking) => booking.helper_profile_id)
        .filter((helperProfileId): helperProfileId is string => Boolean(helperProfileId));
      const helperProfilesResult = await loadVisibleVerifiedHelperProfilesByIds(supabase, helperProfileIds);

      if (helperProfilesResult.errorMessage) {
        setBookingHelperProfiles([]);
        setMessage(buildDatabaseErrorMessage("Booking requests loaded, but requested helper public details could not be loaded", helperProfilesResult.errorMessage));
      } else {
        setBookingHelperProfiles(helperProfilesResult.helperProfiles);
      }
    }
  }, []);

  const fetchProfile = useCallback(async (currentUser: User) => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setProfileStatus("error");
      setMessage(envError);
      return;
    }

    setProfileStatus("loading");
    setMessage(null);
    setSuccessMessage(null);

    const result = await loadProfile(supabase, currentUser.id);

    if (result.errorMessage) {
      setProfile(null);
      setElderlyProfiles([]);
      setServiceCategories([]);
      setBookings([]);
      setBookingHelperProfiles([]);
      setProfileStatus("error");
      setMessage(`Could not load your profile from the profiles table: ${result.errorMessage}. Confirm the profiles table and RLS policies are applied.`);
      return;
    }

    if (!result.profile) {
      setProfile(null);
      setElderlyProfiles([]);
      setServiceCategories([]);
      setBookings([]);
      setBookingHelperProfiles([]);
      setProfileStatus("missing");
      setMessage("Your auth account is signed in, but the profiles table row is missing. Complete profile setup from the dashboard or confirm signup database records were created.");
      return;
    }

    setProfile(result.profile);
    setProfileStatus("loaded");

    if (result.profile.role === "client") {
      await fetchClientData(result.profile);
    } else {
      setElderlyProfiles([]);
      setServiceCategories([]);
      setBookings([]);
      setBookingHelperProfiles([]);
    }
  }, [fetchClientData]);

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
        setProfileStatus("idle");
        setElderlyProfiles([]);
        setServiceCategories([]);
        setBookings([]);
        setBookingHelperProfiles([]);
        return;
      }

      if (!data.user) {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setProfileStatus("idle");
        setElderlyProfiles([]);
        setServiceCategories([]);
        setBookings([]);
        setBookingHelperProfiles([]);
        return;
      }

      setStatus("signed-in");
      setUser(data.user);
      void fetchProfile(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setProfileStatus("idle");
        setElderlyProfiles([]);
        setServiceCategories([]);
        setBookings([]);
        setBookingHelperProfiles([]);
        return;
      }

      setStatus("signed-in");
      setUser(session.user);
      void fetchProfile(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleElderlyProfileChange(elderlyProfileId: string) {
    const selectedProfile = elderlyProfiles.find((item) => item.id === elderlyProfileId);
    setForm((current) => ({
      ...current,
      elderlyProfileId,
      city: selectedProfile?.city || current.city,
    }));
  }

  async function handleCreateBooking() {
    if (!profile || profile.role !== "client") {
      setMessage("Only client/caregiver accounts can create booking requests.");
      return;
    }

    if (elderlyProfiles.length === 0) {
      setMessage("Create at least one elderly profile before making a booking request.");
      return;
    }

    if (serviceCategories.length === 0) {
      setMessage("No allowed service categories are available. Confirm the service_categories seed data and RLS policy are applied.");
      return;
    }

    if (!form.elderlyProfileId || !form.serviceCategoryId || !form.city.trim() || !form.requestedStartAt) {
      setMessage("Elderly profile, service category, city, and requested start date/time are required.");
      return;
    }

    const duration = Number(form.requestedDurationMinutes);

    if (!Number.isInteger(duration) || duration <= 0) {
      setMessage("Requested duration must be a positive number of minutes.");
      return;
    }

    const requestedStartAt = new Date(form.requestedStartAt);

    if (Number.isNaN(requestedStartAt.getTime())) {
      setMessage("Requested start date/time is not valid. Please choose a date and time from the picker.");
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setMessage(envError);
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setSuccessMessage(null);

    const result = await createOwnBookingRequest(supabase, {
      clientId: profile.id,
      elderlyProfileId: form.elderlyProfileId,
      serviceCategoryId: form.serviceCategoryId,
      city: form.city,
      requestedStartAt: requestedStartAt.toISOString(),
      requestedDurationMinutes: duration,
      notes: form.notes,
    });

    if (result.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not create booking request", result.errorMessage));
      setIsSaving(false);
      return;
    }

    await fetchClientData(profile);
    setForm((current) => ({
      ...emptyForm,
      elderlyProfileId: current.elderlyProfileId,
      serviceCategoryId: current.serviceCategoryId,
      city: current.city,
    }));
    setSuccessMessage("Booking request created with status Requested. Payment and final confirmation are not active yet.");
    setIsSaving(false);
  }

  async function handleCancelBooking(booking: ClientBooking) {
    if (!profile || profile.role !== "client") {
      setMessage("Only client/caregiver accounts can cancel their own requested booking requests.");
      return;
    }

    if (booking.status !== "requested") {
      setMessage("Only booking requests with status Requested can be cancelled in this phase.");
      return;
    }

    const confirmed = window.confirm("Cancel this booking request? The record will stay in the database with status Cancelled.");

    if (!confirmed) {
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setMessage(envError);
      return;
    }

    setCancellingBookingId(booking.id);
    setMessage(null);
    setSuccessMessage(null);

    const result = await cancelOwnRequestedBooking(supabase, {
      clientId: profile.id,
      bookingId: booking.id,
    });

    if (result.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not cancel booking request", result.errorMessage));
      setCancellingBookingId(null);
      return;
    }

    await fetchClientData(profile);
    setSuccessMessage("Booking request cancelled. It was not deleted.");
    setCancellingBookingId(null);
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Client dashboard</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Booking requests</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        Create and manage basic non-medical service requests, including requests for a specific visible helper. Payment processing, helper acceptance, final confirmation, and matching are not active yet.
      </p>

      {status === "loading" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200" role="status">
          Checking your account session…
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <h2 className="text-2xl font-bold">Supabase configuration needed</h2>
          <p className="mt-4 leading-7">{message}</p>
        </div>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Please log in</h2>
          <p className="mt-4 text-lg leading-8">You need to log in as a client/caregiver before creating or viewing booking requests.</p>
          {message ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
              Login
            </Link>
            <Link href="/signup" className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-5 py-3 font-semibold text-forest transition hover:bg-sage">
              Sign up as client/caregiver
            </Link>
          </div>
        </div>
      ) : null}

      {status === "signed-in" ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            {profileStatus === "loading" ? <p className="rounded-3xl bg-cream p-5 text-sm font-semibold text-stone-700">Loading your profile and access role…</p> : null}

            {(profileStatus === "missing" || profileStatus === "error") && message ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="alert">
                <h2 className="text-xl font-bold">Profile setup error</h2>
                <p className="mt-2 text-sm leading-6">{message}</p>
                <Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">
                  Open dashboard profile setup
                </Link>
              </div>
            ) : null}

            {profile && profile.role !== "client" ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="alert">
                <h2 className="text-xl font-bold">Client/caregiver access only</h2>
                <p className="mt-2 leading-7">
                  Booking requests are for client/caregiver accounts. Your current role is {formatRole(profile.role)}.
                </p>
                {profile.role === "admin" ? (
                  <p className="mt-2 text-sm leading-6">
                    Admin users see this placeholder only. Full admin booking management is not enabled here because this route uses owner-scoped browser actions.
                  </p>
                ) : null}
                <Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">
                  Return to dashboard
                </Link>
              </div>
            ) : null}

            {isClient ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-forest">Create booking request</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">Signed in as {user?.email}. New requests start with status Requested.</p>
                  </div>
                  <span className="rounded-full bg-sage px-4 py-2 text-sm font-bold text-forest">{bookings.length} saved</span>
                </div>

                {message ? (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
                    {message}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
                    {successMessage}
                  </div>
                ) : null}

                {elderlyProfiles.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                    <h3 className="font-bold">Elderly profile required</h3>
                    <p className="mt-2 text-sm leading-6">Create an elderly profile before making a booking request.</p>
                    <Link href="/dashboard/elderly-profiles" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">
                      Manage elderly profiles
                    </Link>
                  </div>
                ) : null}

                {serviceCategories.length === 0 ? (
                  <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                    <h3 className="font-bold">No allowed service categories</h3>
                    <p className="mt-2 text-sm leading-6">Booking requests need an allowed service category. Confirm the database seed data and service_categories RLS policy are applied.</p>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-5">
                  <label className="block">
                    <span className="font-semibold text-forest">Elderly profile</span>
                    <select value={form.elderlyProfileId} onChange={(event) => handleElderlyProfileChange(event.target.value)} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest">
                      <option value="">Select an elderly profile</option>
                      {elderlyProfiles.map((elderlyProfile) => (
                        <option key={elderlyProfile.id} value={elderlyProfile.id}>{elderlyProfile.full_name} · {elderlyProfile.city}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-semibold text-forest">Allowed service category</span>
                    <select value={form.serviceCategoryId} onChange={(event) => updateField("serviceCategoryId", event.target.value)} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest">
                      <option value="">Select a non-medical service category</option>
                      {serviceCategories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-semibold text-forest">City</span>
                    <input value={form.city} onChange={(event) => updateField("city", event.target.value)} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest" />
                  </label>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="font-semibold text-forest">Requested start date and time</span>
                      <input type="datetime-local" value={form.requestedStartAt} onChange={(event) => updateField("requestedStartAt", event.target.value)} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest" />
                    </label>
                    <label className="block">
                      <span className="font-semibold text-forest">Requested duration in minutes</span>
                      <input type="number" min="1" step="15" value={form.requestedDurationMinutes} onChange={(event) => updateField("requestedDurationMinutes", event.target.value)} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="font-semibold text-forest">Notes for non-medical support</span>
                    <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={5} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest" />
                    <span className="mt-2 block text-sm leading-6 text-stone-600">
                      Keep notes practical and non-medical, such as timing, communication preferences, routine errands, or companionship context. Do not enter medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests.
                    </span>
                  </label>
                </div>

                <button type="button" onClick={() => void handleCreateBooking()} disabled={isSaving || elderlyProfiles.length === 0 || serviceCategories.length === 0} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {isSaving ? "Creating request…" : "Create booking request"}
                </button>
              </>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] bg-sage p-6 text-stone-700">
              <h2 className="text-xl font-bold text-forest">Current limits</h2>
              <ul className="mt-4 space-y-3 leading-7">
                <li>• Requests are saved with status Requested.</li>
                <li>• Specific-helper requests only store the helper profile ID; helper acceptance, matching, and notifications are not active.</li>
                <li>• Payment processing and live booking payments are not active.</li>
                <li>• Services remain non-medical only.</li>
              </ul>
            </div>
            <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-xl font-bold text-forest">Safety boundaries</h2>
              <ul className="mt-4 space-y-3 leading-7">
                <li>• Do not include medical tasks or medication instructions.</li>
                <li>• Do not include PINs, passwords, or valuable-access instructions.</li>
                <li>• Helpers are independent marketplace participants, not VnukPodNaem employees.</li>
                <li>• The platform does not guarantee absolute safety.</li>
              </ul>
            </div>
          </aside>
        </div>
      ) : null}

      {isClient ? (
        <section className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-forest">Your booking requests</h2>
              <p className="mt-2 text-sm text-stone-600">Only booking requests owned by your signed-in account should appear here under current RLS policies.</p>
            </div>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-forest transition hover:bg-sage">
              Back to dashboard
            </Link>
          </div>

          {bookings.length === 0 ? (
            <p className="mt-6 rounded-3xl bg-cream p-5 text-sm font-semibold text-stone-700">No booking requests have been created yet.</p>
          ) : (
            <div className="mt-6 grid gap-4">
              {bookings.map((booking) => {
                const elderlyProfile = elderlyProfileById.get(booking.elderly_profile_id);
                const serviceCategory = serviceCategoryById.get(booking.service_category_id);
                const helperProfile = booking.helper_profile_id ? helperProfileById.get(booking.helper_profile_id) : null;

                return (
                  <article key={booking.id} className="rounded-3xl border border-stone-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold text-forest">{serviceCategory?.name ?? "Service category unavailable"}</h3>
                        <p className="mt-1 text-sm font-semibold text-stone-600">For {elderlyProfile?.full_name ?? "elderly profile unavailable"}</p>
                      </div>
                      <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-forest">{formatStatus(booking.status)}</span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-bold text-forest">City</dt>
                        <dd className="mt-1">{booking.city}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-forest">Requested date/time</dt>
                        <dd className="mt-1">{formatDateTime(booking.requested_start_at)}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-forest">Duration</dt>
                        <dd className="mt-1">{booking.requested_duration_minutes ? `${booking.requested_duration_minutes} minutes` : "Not set"}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-forest">Status</dt>
                        <dd className="mt-1">{formatStatus(booking.status)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-bold text-forest">Helper request type</dt>
                        <dd className="mt-1 leading-6">
                          {booking.helper_profile_id ? (
                            helperProfile ? (
                              <>
                                Requested for a specific visible helper in {helperProfile.city} ({formatHelperVerificationStatus(helperProfile.verification_status)}). Service radius: {helperProfile.service_radius_km === null ? "Not listed" : `${helperProfile.service_radius_km} km`}.
                              </>
                            ) : (
                              "Requested for a specific helper, but the helper is no longer publicly visible or the safe public helper details could not be read."
                            )
                          ) : (
                            "General/unassigned request. No specific helper profile is stored on this booking."
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-bold text-forest">Non-medical notes</dt>
                        <dd className="mt-1 whitespace-pre-wrap leading-6">{booking.notes || "No notes saved."}</dd>
                      </div>
                    </dl>
                    {booking.status === "requested" ? (
                      <button type="button" onClick={() => void handleCancelBooking(booking)} disabled={cancellingBookingId === booking.id} className="mt-5 inline-flex min-h-11 items-center rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                        {cancellingBookingId === booking.id ? "Cancelling…" : "Cancel request"}
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
