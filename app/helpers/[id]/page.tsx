"use client";

import { PageIntro } from "@/components/PageIntro";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { withReturnTo } from "@/lib/auth/returnTo";
import {
  createOwnBookingRequest,
  loadAllowedServiceCategories,
  type ServiceCategory,
} from "@/lib/supabase/bookings";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadOwnElderlyProfiles, type ElderlyProfile } from "@/lib/supabase/elderlyProfiles";
import {
  loadVisibleVerifiedHelperProfileById,
  type PublicHelperProfile,
} from "@/lib/supabase/helperProfiles";
import { loadProfile, type Profile, type ProfileRole } from "@/lib/supabase/profiles";

type PageStatus = "loading" | "loaded" | "unavailable" | "unconfigured" | "error";
type AuthStatus = "checking" | "signed-out" | "signed-in";
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

function buildDatabaseErrorMessage(action: string, errorMessage: string) {
  return `${action}: ${errorMessage}. If this mentions row-level security or permission denied, confirm the profiles, helper_profiles, elderly_profiles, service_categories, and bookings RLS policies are applied for the signed-in account.`;
}

export default function HelperDetailPage() {
  const params = useParams<{ id: string }>();
  const helperProfileId = params.id;
  // Preserve any marketplace filter query (carried into this URL from the
  // listing) through the auth flow, so signup/login returns the elder here
  // with their filters intact.
  const searchParams = useSearchParams();
  const filterQuery = searchParams.toString();
  const marketplaceHref = filterQuery ? `/helpers?${filterQuery}` : "/helpers";
  const returnTo = filterQuery
    ? `/helpers/${helperProfileId}?${filterQuery}`
    : `/helpers/${helperProfileId}`;
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [helperProfile, setHelperProfile] = useState<PublicHelperProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfile[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isClient = profile?.role === "client";

  const loadClientFormData = useCallback(async (currentProfile: Profile, fallbackCity: string) => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setMessage(envError);
      return;
    }

    const [elderlyResult, categoriesResult] = await Promise.all([
      loadOwnElderlyProfiles(supabase, currentProfile.id),
      loadAllowedServiceCategories(supabase),
    ]);

    if (elderlyResult.errorMessage) {
      setElderlyProfiles([]);
      setMessage(buildDatabaseErrorMessage("Could not load your elderly profiles", elderlyResult.errorMessage));
    } else {
      setElderlyProfiles(elderlyResult.profiles);
      setForm((current) => ({
        ...current,
        elderlyProfileId: current.elderlyProfileId || elderlyResult.profiles[0]?.id || "",
        city: current.city || elderlyResult.profiles[0]?.city || fallbackCity,
      }));
    }

    if (categoriesResult.errorMessage) {
      setServiceCategories([]);
      setMessage(buildDatabaseErrorMessage("Could not load allowed service categories", categoriesResult.errorMessage));
    } else {
      setServiceCategories(categoriesResult.categories);
      setForm((current) => ({
        ...current,
        serviceCategoryId: current.serviceCategoryId || categoriesResult.categories[0]?.id || "",
      }));
    }
  }, []);

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setPageStatus("unconfigured");
      setAuthStatus("signed-out");
      setMessage(envError);
      return;
    }

    const activeSupabase = supabase;
    let isMounted = true;

    async function loadPage() {
      setPageStatus("loading");
      setAuthStatus("checking");
      setMessage(null);
      setSuccessMessage(null);

      const helperResult = await loadVisibleVerifiedHelperProfileById(activeSupabase, helperProfileId);

      if (!isMounted) {
        return;
      }

      if (helperResult.errorMessage) {
        setPageStatus("error");
        setMessage(`Could not load this public helper profile: ${helperResult.errorMessage}. Confirm the helper_profiles public visibility RLS policy is applied.`);
        return;
      }

      if (!helperResult.helperProfile) {
        setPageStatus("unavailable");
        setHelperProfile(null);
        setMessage("This helper profile is not available publicly. It may be hidden, unverified, or missing.");
        return;
      }

      setHelperProfile(helperResult.helperProfile);
      setPageStatus("loaded");
      setForm((current) => ({ ...current, city: current.city || helperResult.helperProfile?.city || "" }));

      const { data: userData, error: userError } = await activeSupabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError || !userData.user) {
        setAuthStatus("signed-out");
        setUser(null);
        setProfile(null);
        if (userError) {
          setMessage(`Could not confirm your login session: ${userError.message}`);
        }
        return;
      }

      setAuthStatus("signed-in");
      setUser(userData.user);

      const profileResult = await loadProfile(activeSupabase, userData.user.id);

      if (!isMounted) {
        return;
      }

      if (profileResult.errorMessage) {
        setProfile(null);
        setMessage(`Could not load your profile from the profiles table: ${profileResult.errorMessage}. Confirm the profiles table and RLS policies are applied.`);
        return;
      }

      if (!profileResult.profile) {
        setProfile(null);
        setMessage("Your auth account is signed in, but the profiles table row is missing. Open the dashboard to complete profile setup before requesting a helper.");
        return;
      }

      setProfile(profileResult.profile);

      if (profileResult.profile.role === "client") {
        await loadClientFormData(profileResult.profile, helperResult.helperProfile.city);
      }
    }

    void loadPage();

    return () => {
      isMounted = false;
    };
  }, [helperProfileId, loadClientFormData]);

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

  async function handleCreateRequest() {
    if (!helperProfile) {
      setMessage("This helper profile is not available publicly, so a request cannot be created.");
      return;
    }

    if (!profile || profile.role !== "client") {
      setMessage("Booking requests for a specific helper are only available to client/caregiver accounts.");
      return;
    }

    if (elderlyProfiles.length === 0) {
      setMessage("Create at least one elderly profile before requesting this helper.");
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

    const latestHelperResult = await loadVisibleVerifiedHelperProfileById(supabase, helperProfile.id);

    if (latestHelperResult.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not re-check helper visibility", latestHelperResult.errorMessage));
      setIsSaving(false);
      return;
    }

    if (!latestHelperResult.helperProfile) {
      setHelperProfile(null);
      setPageStatus("unavailable");
      setMessage("This helper is no longer visible or verified publicly, so the request was not created.");
      setIsSaving(false);
      return;
    }

    const result = await createOwnBookingRequest(supabase, {
      clientId: profile.id,
      elderlyProfileId: form.elderlyProfileId,
      helperProfileId: latestHelperResult.helperProfile.id,
      serviceCategoryId: form.serviceCategoryId,
      city: form.city,
      requestedStartAt: requestedStartAt.toISOString(),
      requestedDurationMinutes: duration,
      notes: form.notes,
    });

    if (result.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not create booking request for this helper", result.errorMessage));
      setIsSaving(false);
      return;
    }

    setSuccessMessage("Request saved with status Requested for this visible helper. Helper acceptance, final confirmation, and payment are not implemented yet.");
    setForm((current) => ({
      ...emptyForm,
      elderlyProfileId: current.elderlyProfileId,
      serviceCategoryId: current.serviceCategoryId,
      city: current.city,
    }));
    setIsSaving(false);
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Caregiver profile"
        title="Certified caregiver"
        description="Review the caregiver profile details. Private contact information, applications, and admin-only fields are not shown publicly."
      />

      {pageStatus === "loading" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200" role="status">
          Loading caregiver profile…
        </div>
      ) : null}

      {pageStatus === "unconfigured" ? (
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <h2 className="text-2xl font-bold">Supabase configuration needed</h2>
          <p className="mt-4 leading-7">{message}</p>
        </div>
      ) : null}

      {(pageStatus === "error" || pageStatus === "unavailable") ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200" role={pageStatus === "error" ? "alert" : undefined}>
          <h2 className="text-2xl font-bold text-forest">Caregiver unavailable</h2>
          <p className="mt-4 leading-7">{message}</p>
          <Link href={marketplaceHref} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
            Back to certified caregivers
          </Link>
        </div>
      ) : null}

      {pageStatus === "loaded" && helperProfile ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-5">
            <article className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <div className="grid gap-6 md:grid-cols-[12rem_1fr] md:items-start">
                <div className="flex aspect-square items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-sage via-cream to-white ring-1 ring-moss/20">
                  <div className="grid size-20 place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-stone-200">
                    <svg viewBox="0 0 48 48" className="size-11" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="24" cy="18" r="8" /><path d="M10 40c2.6-8 8-12 14-12s11.4 4 14 12" /></svg>
                  </div>
                </div>
                <div>
              <p className="inline-flex rounded-full bg-sage px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-forest">
                Certified caregiver
              </p>
              <h2 className="mt-3 text-3xl font-bold text-forest">Caregiver in {helperProfile.city}</h2>
              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-forest">City</dt>
                  <dd className="mt-1">{helperProfile.city}</dd>
                </div>
                <div>
                  <dt className="font-bold text-forest">Service radius</dt>
                  <dd className="mt-1">{helperProfile.service_radius_km === null ? "Not listed" : `${helperProfile.service_radius_km} km`}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-bold text-forest">Full profile</dt>
                  <dd className="mt-1 whitespace-pre-wrap leading-7">{helperProfile.bio}</dd>
                </div>
              </dl>
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-cream p-5 text-sm leading-6 text-stone-700">
                <h3 className="font-bold text-forest">Non-medical service boundary</h3>
                <p className="mt-2">
                  Vnuk Pod Naem helpers may be requested for companionship, errands, shopping, walks, check-ins, technology help, and accompaniment. Do not request medical care, medication management, clinical tasks, card PINs, passwords, cash handling, or access to valuables. Helpers are independent marketplace participants, not Vnuk Pod Naem employees, and the platform does not guarantee absolute safety.
                </p>
              </div>
            </article>

            <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-2xl font-bold text-forest">Request this caregiver</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                A request saves this caregiver profile with status Requested. No payment is collected, and caregiver acceptance is not implemented yet.
              </p>

              {authStatus === "checking" ? <p className="mt-5 rounded-3xl bg-cream p-5 text-sm font-semibold" role="status">Checking your login session…</p> : null}

              {authStatus === "signed-out" ? (
                <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                  <h3 className="font-bold">Login required</h3>
                  <p className="mt-2 text-sm leading-6">Sign in with a normal account before requesting a caregiver.</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={withReturnTo("/login", returnTo)} className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">Login</Link>
                    <Link href={withReturnTo("/signup", returnTo)} className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-forest transition hover:bg-sage">Create account</Link>
                  </div>
                </div>
              ) : null}

              {authStatus === "signed-in" && !profile ? (
                <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="alert">
                  <h3 className="font-bold">Profile setup needed</h3>
                  <p className="mt-2 text-sm leading-6">{message}</p>
                  <Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">Open dashboard</Link>
                </div>
              ) : null}

              {profile && profile.role !== "client" ? (
                <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="alert">
                  <h3 className="font-bold">Client/caregiver access only</h3>
                  <p className="mt-2 text-sm leading-6">
                    Booking requests are for client/caregiver accounts. Your current role is {formatRole(profile.role)}.
                  </p>
                  <Link href="/dashboard" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">Return to dashboard</Link>
                </div>
              ) : null}

              {message && isClient ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
                  {message}
                </div>
              ) : null}

              {successMessage ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">
                  {successMessage} <Link href="/dashboard/bookings" className="underline">View your booking requests</Link>.
                </div>
              ) : null}

              {isClient ? (
                <>
                  {elderlyProfiles.length === 0 ? (
                    <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
                      <h3 className="font-bold">Elderly profile required</h3>
                      <p className="mt-2 text-sm leading-6">Create an elderly profile before requesting this helper.</p>
                      <Link href="/dashboard/elderly-profiles" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">Manage elderly profiles</Link>
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

                  <button type="button" onClick={() => void handleCreateRequest()} disabled={isSaving || elderlyProfiles.length === 0 || serviceCategories.length === 0} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? "Creating request…" : "Request this caregiver"}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] bg-sage p-6 text-stone-700">
              <h2 className="text-xl font-bold text-forest">What happens next</h2>
              <ul className="mt-4 space-y-3 leading-7">
                <li>• The booking is saved with status Requested.</li>
                <li>• The selected visible helper profile is stored on the booking.</li>
                <li>• Helper acceptance, final confirmation, and payment are later phases.</li>
                <li>• No card details or payment information are collected here.</li>
              </ul>
            </div>
            <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-xl font-bold text-forest">Public data only</h2>
              <p className="mt-4 leading-7">
                This page uses safe helper profile fields only: bio, city, service radius, and verification label. It does not show email addresses, private user details, profile ownership IDs, application answers, or hidden/admin-only fields.
              </p>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
