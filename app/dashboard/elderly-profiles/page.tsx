"use client";

import { PageIntro } from "@/components/PageIntro";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  deleteOwnElderlyProfile,
  loadOwnElderlyProfiles,
  saveOwnElderlyProfile,
  type ElderlyProfile,
} from "@/lib/supabase/elderlyProfiles";
import { loadProfile, type Profile, type ProfileRole } from "@/lib/supabase/profiles";

type PageStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";
type ProfileStatus = "idle" | "loading" | "loaded" | "missing" | "error";
type FormState = {
  fullName: string;
  city: string;
  notes: string;
};

const emptyForm: FormState = {
  fullName: "",
  city: "",
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

function buildDatabaseErrorMessage(action: string, errorMessage: string) {
  return `${action}: ${errorMessage}. If this mentions row-level security or permission denied, confirm the elderly_profiles RLS policies from the Supabase migration are applied and that your profile role is client.`;
}

export default function ElderlyProfilesPage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfile[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);

  const isClient = profile?.role === "client";
  const editingProfile = useMemo(
    () => elderlyProfiles.find((item) => item.id === editingProfileId) ?? null,
    [editingProfileId, elderlyProfiles],
  );

  const fetchElderlyProfiles = useCallback(async (currentProfile: Profile) => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setMessage(envError);
      return;
    }

    const result = await loadOwnElderlyProfiles(supabase, currentProfile.id);

    if (result.errorMessage) {
      setMessage(buildDatabaseErrorMessage("Could not load elderly profiles", result.errorMessage));
      setElderlyProfiles([]);
      return;
    }

    setElderlyProfiles(result.profiles);
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
      setProfileStatus("error");
      setMessage(`Could not load your profile from the profiles table: ${result.errorMessage}. Confirm the profiles table and RLS policies are applied.`);
      return;
    }

    if (!result.profile) {
      setProfile(null);
      setElderlyProfiles([]);
      setProfileStatus("missing");
      setMessage("Your auth account is signed in, but the profiles table row is missing. Complete profile setup from the dashboard or confirm signup database records were created.");
      return;
    }

    setProfile(result.profile);
    setProfileStatus("loaded");

    if (result.profile.role === "client") {
      await fetchElderlyProfiles(result.profile);
    }
  }, [fetchElderlyProfiles]);

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
        setElderlyProfiles([]);
        setProfileStatus("idle");
        return;
      }

      if (!data.user) {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setElderlyProfiles([]);
        setProfileStatus("idle");
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
        setElderlyProfiles([]);
        setProfileStatus("idle");
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

  function startEditing(item: ElderlyProfile) {
    setEditingProfileId(item.id);
    setForm({
      fullName: item.full_name,
      city: item.city,
      notes: item.notes ?? "",
    });
    setMessage(null);
    setSuccessMessage(null);
  }

  function resetForm() {
    setEditingProfileId(null);
    setForm(emptyForm);
    setMessage(null);
    setSuccessMessage(null);
  }

  async function handleSave() {
    if (!profile || profile.role !== "client") {
      setMessage("Only client/caregiver accounts can save elderly profiles.");
      return;
    }

    if (!form.fullName.trim() || !form.city.trim()) {
      setMessage("Full name and city are required before saving an elderly profile.");
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

    const result = await saveOwnElderlyProfile(supabase, {
      caregiverId: profile.id,
      elderlyProfileId: editingProfileId ?? undefined,
      fullName: form.fullName,
      city: form.city,
      notes: form.notes,
    });

    if (result.errorMessage) {
      setMessage(buildDatabaseErrorMessage(editingProfileId ? "Could not update elderly profile" : "Could not create elderly profile", result.errorMessage));
      setIsSaving(false);
      return;
    }

    await fetchElderlyProfiles(profile);
    setForm(emptyForm);
    setEditingProfileId(null);
    setSuccessMessage(editingProfileId ? "Elderly profile updated." : "Elderly profile created.");
    setIsSaving(false);
  }

  async function handleDelete(item: ElderlyProfile) {
    if (!profile || profile.role !== "client") {
      setMessage("Only client/caregiver accounts can delete elderly profiles.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this elderly profile? If it is connected to future bookings, the database may block deletion. No archive field exists in the current schema yet.",
    );

    if (!confirmed) {
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setMessage(envError);
      return;
    }

    setDeletingProfileId(item.id);
    setMessage(null);
    setSuccessMessage(null);

    const result = await deleteOwnElderlyProfile(supabase, {
      caregiverId: profile.id,
      elderlyProfileId: item.id,
    });

    if (result.errorMessage) {
      setMessage(
        `${buildDatabaseErrorMessage("Could not delete elderly profile", result.errorMessage)} The current schema does not include an archive flag, so keep the profile and edit its notes if deletion is blocked by related records.`,
      );
      setDeletingProfileId(null);
      return;
    }

    if (editingProfileId === item.id) {
      setEditingProfileId(null);
      setForm(emptyForm);
    }

    await fetchElderlyProfiles(profile);
    setSuccessMessage("Elderly profile deleted.");
    setDeletingProfileId(null);
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Client dashboard"
        title="Elderly profiles"
        description="Create simple, non-medical profiles for elderly people you support. These records can now be selected in basic booking requests, while payment and helper assignment flows are not implemented yet."
      />

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
          <p className="mt-4 text-lg leading-8">You need to log in as a client/caregiver before managing elderly profiles.</p>
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
                  Elderly profile management is for client/caregiver accounts. Your current role is {formatRole(profile.role)}.
                </p>
                {profile.role === "admin" ? (
                  <p className="mt-2 text-sm leading-6">
                    Admin users may view this placeholder message only. Admin management for elderly profiles is not enabled here because this page only uses owner-scoped browser actions.
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
                    <h2 className="text-2xl font-bold text-forest">{editingProfile ? "Edit elderly profile" : "Create elderly profile"}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">Signed in as {user?.email}. These profiles are linked to your client/caregiver account.</p>
                  </div>
                  <span className="rounded-full bg-sage px-4 py-2 text-sm font-bold text-forest">{elderlyProfiles.length} saved</span>
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

                <div className="mt-6 grid gap-5">
                  <label className="block">
                    <span className="font-semibold text-forest">Full name</span>
                    <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest" />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-forest">City</span>
                    <input value={form.city} onChange={(event) => updateField("city", event.target.value)} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest" />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-forest">Notes for non-medical support</span>
                    <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={5} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest" />
                    <span className="mt-2 block text-sm leading-6 text-stone-600">
                      Keep notes practical and non-medical, such as preferred visit times, hobbies, communication preferences, or general errands. Do not enter sensitive medical details, diagnoses, medication instructions, card PINs, passwords, cash-handling requests, or access-to-valuables requests.
                    </span>
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => void handleSave()} disabled={isSaving} className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? "Saving…" : editingProfile ? "Update elderly profile" : "Create elderly profile"}
                  </button>
                  {editingProfile ? (
                    <button type="button" onClick={resetForm} disabled={isSaving} className="inline-flex min-h-12 items-center rounded-full border border-forest px-5 py-3 font-semibold text-forest transition hover:bg-sage disabled:cursor-not-allowed disabled:opacity-60">
                      Cancel editing
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] bg-sage p-6 text-stone-700">
              <h2 className="text-xl font-bold text-forest">Important boundaries</h2>
              <ul className="mt-4 space-y-3 leading-7">
                <li>• Elderly profiles are for non-medical support planning only.</li>
                <li>• Do not store diagnoses, medication instructions, passwords, PINs, or valuable-access instructions.</li>
                <li>• Helpers are independent marketplace participants, not Vnuk Pod Naem employees.</li>
                <li>• The platform does not guarantee absolute safety.</li>
              </ul>
            </div>
            <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-xl font-bold text-forest">Not implemented yet</h2>
              <ul className="mt-4 space-y-3 leading-7">
                <li>• Basic client booking requests are available at /dashboard/bookings.</li>
                <li>• Payment flow, Stripe, and live booking payments are not implemented.</li>
                <li>• There is no medical-service functionality.</li>
              </ul>
            </div>
          </aside>
        </div>
      ) : null}

      {isClient ? (
        <section className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-forest">Saved elderly profiles</h2>
              <p className="mt-2 text-sm text-stone-600">Only profiles owned by your signed-in account should appear here under current RLS policies.</p>
            </div>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-semibold text-forest transition hover:bg-sage">
              Back to dashboard
            </Link>
          </div>

          {elderlyProfiles.length === 0 ? (
            <p className="mt-6 rounded-3xl bg-cream p-5 text-sm font-semibold text-stone-700">No elderly profiles have been created yet.</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {elderlyProfiles.map((item) => (
                <article key={item.id} className="rounded-3xl border border-stone-200 p-5">
                  <h3 className="text-xl font-bold text-forest">{item.full_name}</h3>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="font-bold text-forest">City</dt>
                      <dd className="mt-1">{item.city}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-forest">Non-medical notes</dt>
                      <dd className="mt-1 whitespace-pre-wrap leading-6">{item.notes || "No notes saved."}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-forest">Last updated</dt>
                      <dd className="mt-1">{formatDate(item.updated_at)}</dd>
                    </div>
                  </dl>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button type="button" onClick={() => startEditing(item)} className="inline-flex min-h-11 items-center rounded-full bg-forest px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDelete(item)} disabled={deletingProfileId === item.id} className="inline-flex min-h-11 items-center rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                      {deletingProfileId === item.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
