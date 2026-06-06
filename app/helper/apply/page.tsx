"use client";

import { PageIntro } from "@/components/PageIntro";
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
import { useI18n } from "@/lib/i18n";
import { loadProfile, type Profile } from "@/lib/supabase/profiles";
import { ensureElderProfile } from "@/lib/auth/account";

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
  "Helpers are independent marketplace participants, not Vnuk Pod Naem employees.",
];

function getDebuggableDatabaseMessage(context: string, errorMessage: string) {
  return `${context}: ${errorMessage}. If this looks like an RLS permission error, confirm the initial Supabase schema was applied and that you are signed in as the application owner.`;
}

export default function ApplyPage() {
  const { t } = useI18n();
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

    let profileResult = await loadProfile(supabase, userData.user.id);

    if (profileResult.errorMessage) {
      setPageStatus("error");
      setMessage(getDebuggableDatabaseMessage("Could not load your profile", profileResult.errorMessage));
      return;
    }

    // Self-heal: if the profile row is missing (e.g. email-confirmation deferred
    // it past signup), create it from the signed-in user's metadata and reload,
    // so the page never dead-ends on a missing profile.
    if (!profileResult.profile) {
      const ensured = await ensureElderProfile(supabase, userData.user);
      if (ensured.errorMessage) {
        setPageStatus("error");
        setMessage(getDebuggableDatabaseMessage("Could not set up your profile", ensured.errorMessage));
        return;
      }
      profileResult = await loadProfile(supabase, userData.user.id);
    }

    if (!profileResult.profile) {
      setPageStatus("error");
      setMessage("Your login works, but your profile is still being set up. Open My profile to finish setup, then return here.");
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
      <PageIntro
        eyebrow="Caregiver application"
        title="Apply to become a caregiver"
        description="Submit a caregiver application for admin review. If approved, your caregiver profile can appear on the certified caregivers list."
      />
      <div className="mt-8 rounded-[2rem] border border-moss/20 bg-sage/70 p-5 text-stone-700 shadow-sm">
        <h2 className="text-xl font-bold text-forest">Before you submit</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <h3 className="font-bold text-forest">Application review</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
              <li>You keep a normal account while applying.</li>
              <li>Admins review submitted caregiver applications.</li>
              <li>Approval is required before a caregiver profile can appear publicly.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-forest">Safety and service boundaries</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
              {safetyGuidance.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

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
          <h2 className="text-2xl font-bold text-forest">Sign in to submit an application</h2>
          <p className="mt-4 text-lg leading-8">
            Caregiver applications are connected to your normal account. Please sign in or create an account before saving a draft or submitting an application.
          </p>
          {message ? <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Session message: {message}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex min-h-12 items-center rounded-full border border-forest px-5 py-3 font-semibold text-forest transition hover:bg-sage">
              Create account
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
        <div className="mt-8 flex justify-center">
          <form className="w-full max-w-3xl rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-forest">Application details</h2>
                <p className="mt-2 text-sm text-stone-600">{t("Signed in as")} {user.email}. {t("Your account remains a normal account during review.")}</p>
              </div>
              <span className="rounded-full bg-sage px-4 py-2 text-sm font-bold text-forest">
                Status: {application ? formatHelperApplicationStatus(application.status) : "Not started"}
              </span>
            </div>

            {isReadOnly ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="alert">
                This application is {application ? formatHelperApplicationStatus(application.status).toLowerCase() : "not editable"}. It is read-only here because admin review happens separately.
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
            <p className="mt-6 text-center text-sm font-semibold text-stone-600">
              {t("Already have an account?")} <Link href="/login" className="text-forest underline">{t("Sign in.")}</Link>
            </p>
          </form>
        </div>
      ) : null}
    </section>
  );
}
