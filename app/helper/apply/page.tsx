"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  canApplicantEditApplication,
  formatHelperApplicationStatus,
  loadOwnHelperApplication,
  saveOwnHelperApplication,
  type HelperApplication,
} from "@/lib/supabase/helperApplications";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadProfile, type Profile } from "@/lib/supabase/profiles";

type PageStatus = "loading" | "signed-out" | "ready" | "unconfigured" | "error";
type SaveAction = "draft" | "submitted";

type FormState = {
  fullName: string;
  city: string;
  motivation: string;
  experienceSummary: string;
  availabilitySummary: string;
};

const emptyForm: FormState = {
  fullName: "",
  city: "",
  motivation: "",
  experienceSummary: "",
  availabilitySummary: "",
};

const safetyGuidance = [
  "Non-medical support only.",
  "No medication management.",
  "No injections.",
  "No wound care.",
  "No clinical tasks.",
  "No cash handling.",
  "No card PINs or passwords.",
  "No access-to-valuables requests.",
  "Helpers are independent marketplace participants, not VnukPodNaem employees.",
];

function getDebuggableDatabaseMessage(context: string, errorMessage: string) {
  return `${context}: ${errorMessage}. If this looks like an RLS permission error, confirm the initial Supabase schema was applied and that you are signed in as the application owner.`;
}

export default function ApplyPage() {
  const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<HelperApplication | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<SaveAction | null>(null);

  const loadPageData = useCallback(async () => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setPageStatus("unconfigured");
      setMessage(envError);
      return;
    }

    setPageStatus("loading");
    setMessage(null);
    setSuccessMessage(null);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      setPageStatus("signed-out");
      setMessage(userError.message);
      setUser(null);
      setProfile(null);
      setApplication(null);
      return;
    }

    if (!userData.user) {
      setPageStatus("signed-out");
      setUser(null);
      setProfile(null);
      setApplication(null);
      return;
    }

    setUser(userData.user);

    const profileResult = await loadProfile(supabase, userData.user.id);

    if (profileResult.errorMessage) {
      setPageStatus("error");
      setMessage(getDebuggableDatabaseMessage("Could not load your profile", profileResult.errorMessage));
      return;
    }

    if (!profileResult.profile) {
      setPageStatus("error");
      setMessage("Your login works, but your profile row is missing. Open Dashboard and use the profile setup retry after confirming the Supabase schema and RLS policies are applied.");
      return;
    }

    setProfile(profileResult.profile);

    const applicationResult = await loadOwnHelperApplication(supabase, profileResult.profile.id);

    if (applicationResult.errorMessage) {
      setPageStatus("error");
      setMessage(getDebuggableDatabaseMessage("Could not load your helper application", applicationResult.errorMessage));
      return;
    }

    setApplication(applicationResult.application);

    if (applicationResult.application) {
      setForm({
        fullName: applicationResult.application.full_name,
        city: applicationResult.application.city,
        motivation: applicationResult.application.motivation,
        experienceSummary: applicationResult.application.experience_summary ?? "",
        availabilitySummary: applicationResult.application.availability_summary ?? "",
      });
    } else {
      setForm({
        ...emptyForm,
        fullName: profileResult.profile.display_name ?? "",
      });
    }

    setPageStatus("ready");
  }, []);

  useEffect(() => {
    void loadPageData();
  }, [loadPageData]);

  function updateField(field: keyof FormState, value: string) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  async function handleSave(action: SaveAction) {
    if (!profile) {
      setMessage("Cannot save because your profile row is missing. Open Dashboard and retry profile setup first.");
      return;
    }

    if (application && !canApplicantEditApplication(application.status)) {
      setMessage("This application is no longer editable from the applicant page. Admin review happens separately, and applicants cannot approve themselves.");
      return;
    }

    if (!form.fullName.trim() || !form.city.trim() || !form.motivation.trim()) {
      setMessage("Full name, city, and motivation are required before saving or submitting.");
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setPageStatus("unconfigured");
      setMessage(envError);
      return;
    }

    setSavingAction(action);
    setMessage(null);
    setSuccessMessage(null);

    const result = await saveOwnHelperApplication(supabase, {
      applicationId: application?.id,
      profileId: profile.id,
      status: action,
      fullName: form.fullName,
      city: form.city,
      motivation: form.motivation,
      experienceSummary: form.experienceSummary,
      availabilitySummary: form.availabilitySummary,
    });

    setSavingAction(null);

    if (result.errorMessage) {
      setMessage(getDebuggableDatabaseMessage("Could not save your helper application", result.errorMessage));
      return;
    }

    setApplication(result.application);
    setSuccessMessage(action === "draft" ? "Draft saved." : "Application submitted for future admin review. Approval is not guaranteed.");
  }

  const isReadOnly = application ? !canApplicantEditApplication(application.status) : false;

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Helper application</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Apply as a helper</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        Save a draft or submit your caregiver application. This page does not approve caregivers, create public marketplace listings, or create employment relationships.
      </p>

      {pageStatus === "loading" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200" role="status">
          Checking your session and helper application…
        </div>
      ) : null}

      {pageStatus === "unconfigured" ? (
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900" role="alert">
          <h2 className="text-2xl font-bold">Supabase configuration needed</h2>
          <p className="mt-4 leading-7">{message}</p>
        </div>
      ) : null}

      {pageStatus === "signed-out" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Log in or sign up first</h2>
          <p className="mt-4 text-lg leading-8">
            Caregiver applications are connected to your account profile. Please sign in or create a normal account before saving a draft or submitting an application.
          </p>
          {message ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Session message: {message}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex min-h-12 items-center rounded-full border border-forest px-5 py-3 font-semibold text-forest transition hover:bg-sage">
              Sign up
            </Link>
          </div>
        </div>
      ) : null}

      {pageStatus === "error" ? (
        <div className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-800" role="alert">
          <h2 className="text-2xl font-bold">Application cannot load yet</h2>
          <p className="mt-4 leading-7">{message}</p>
          <button type="button" onClick={() => void loadPageData()} className="mt-5 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
            Retry
          </button>
        </div>
      ) : null}

      {pageStatus === "ready" && user && profile ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <form className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-forest">Application details</h2>
                <p className="mt-2 text-sm text-stone-600">Signed in as {user.email}. Account status: {profile.role}.</p>
              </div>
              <span className="rounded-full bg-sage px-4 py-2 text-sm font-bold text-forest">
                Status: {application ? formatHelperApplicationStatus(application.status) : "Not started"}
              </span>
            </div>

            {isReadOnly ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="alert">
                This application is {application ? formatHelperApplicationStatus(application.status).toLowerCase() : "not editable"}. It is read-only here, applicants cannot approve themselves, and admin review tools are only available to admin users.
              </div>
            ) : null}

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
                <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} disabled={isReadOnly} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest disabled:bg-stone-100" />
              </label>
              <label className="block">
                <span className="font-semibold text-forest">City</span>
                <input value={form.city} onChange={(event) => updateField("city", event.target.value)} disabled={isReadOnly} required className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest disabled:bg-stone-100" />
              </label>
              <label className="block">
                <span className="font-semibold text-forest">Motivation</span>
                <textarea value={form.motivation} onChange={(event) => updateField("motivation", event.target.value)} disabled={isReadOnly} required rows={5} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest disabled:bg-stone-100" />
              </label>
              <label className="block">
                <span className="font-semibold text-forest">Experience summary</span>
                <textarea value={form.experienceSummary} onChange={(event) => updateField("experienceSummary", event.target.value)} disabled={isReadOnly} rows={4} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest disabled:bg-stone-100" />
              </label>
              <label className="block">
                <span className="font-semibold text-forest">Availability summary</span>
                <textarea value={form.availabilitySummary} onChange={(event) => updateField("availabilitySummary", event.target.value)} disabled={isReadOnly} rows={4} className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-stone-900 outline-none transition focus:border-forest disabled:bg-stone-100" />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleSave("draft")} disabled={isReadOnly || savingAction !== null} className="inline-flex min-h-12 items-center rounded-full border border-forest px-5 py-3 font-semibold text-forest transition hover:bg-sage disabled:cursor-not-allowed disabled:opacity-60">
                {savingAction === "draft" ? "Saving draft…" : "Save draft"}
              </button>
              <button type="button" onClick={() => void handleSave("submitted")} disabled={isReadOnly || savingAction !== null} className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
                {savingAction === "submitted" ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <div className="rounded-[2rem] bg-sage p-6 text-stone-700">
              <h2 className="text-xl font-bold text-forest">Safety and service boundaries</h2>
              <ul className="mt-4 space-y-3 leading-7">
                {safetyGuidance.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
              <h2 className="text-xl font-bold text-forest">What this page does not do</h2>
              <ul className="mt-4 space-y-3 leading-7">
                <li>• It does not approve helpers or guarantee approval.</li>
                <li>• It does not publish public helper marketplace profiles.</li>
                <li>• It does not add booking payments, Stripe, or live payment processing.</li>
              </ul>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
