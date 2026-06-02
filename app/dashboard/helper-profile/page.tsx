"use client";

import { PageIntro } from "@/components/PageIntro";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  formatHelperVerificationStatus,
  loadOwnHelperProfile,
  updateOwnHelperProfile,
  type HelperProfileFormInput,
  type OwnHelperProfile,
} from "@/lib/supabase/helperProfiles";
import { loadProfile, type Profile } from "@/lib/supabase/profiles";

type PageStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";
type ProfileStatus = "idle" | "loading" | "loaded" | "missing" | "error";

type FormState = {
  bio: string;
  city: string;
  serviceRadiusKm: string;
};

const emptyForm: FormState = {
  bio: "",
  city: "",
  serviceRadiusKm: "",
};

const safetyGuidance = [
  "Services are non-medical everyday support only.",
  "No medication management, medication reminders with clinical judgment, injections, wound care, or clinical tasks.",
  "No cash handling, card PINs, passwords, or access-to-valuables requests.",
  "Helpers are independent marketplace participants, not employees of Vnuk Pod Naem.",
  "Public visibility is controlled by admins only; editing this form cannot publish your profile.",
];

function helperProfileToForm(helperProfile: OwnHelperProfile): FormState {
  return {
    bio: helperProfile.bio ?? "",
    city: helperProfile.city ?? "",
    serviceRadiusKm:
      helperProfile.service_radius_km === null
        ? ""
        : String(helperProfile.service_radius_km),
  };
}

function parseServiceRadiusKm(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return Number(trimmed);
}

function validateForm(form: FormState): {
  input: HelperProfileFormInput | null;
  errorMessage: string | null;
} {
  const bio = form.bio.trim();
  const city = form.city.trim();
  const serviceRadiusKm = parseServiceRadiusKm(form.serviceRadiusKm);

  if (bio.length < 20) {
    return {
      input: null,
      errorMessage: "Please enter a bio of at least 20 characters.",
    };
  }

  if (city.length < 2) {
    return {
      input: null,
      errorMessage:
        "Please enter the city where you can provide non-medical support.",
    };
  }

  if (
    serviceRadiusKm !== null &&
    (!Number.isInteger(serviceRadiusKm) ||
      serviceRadiusKm < 0 ||
      serviceRadiusKm > 100)
  ) {
    return {
      input: null,
      errorMessage:
        "Service radius must be a whole number from 0 to 100 km, or left blank.",
    };
  }

  return { input: { bio, city, serviceRadiusKm }, errorMessage: null };
}

export default function HelperProfilePage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [helperProfile, setHelperProfile] = useState<OwnHelperProfile | null>(
    null,
  );
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadSignedInProfile = useCallback(async (currentUser: User) => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    setProfileStatus("loading");
    setMessage(null);
    setSuccessMessage(null);
    setHelperProfile(null);

    const profileResult = await loadProfile(supabase, currentUser.id);

    if (profileResult.errorMessage) {
      setProfile(null);
      setProfileStatus("error");
      setMessage(
        `Could not load your profile from the profiles table: ${profileResult.errorMessage}. Confirm the profiles RLS policies are applied.`,
      );
      return;
    }

    if (!profileResult.profile) {
      setProfile(null);
      setProfileStatus("missing");
      setMessage(
        "Your auth account is signed in, but the profiles table row is missing. Please complete or repair profile setup before managing a helper profile.",
      );
      return;
    }

    setProfile(profileResult.profile);
    setProfileStatus("loaded");

    if (profileResult.profile.role !== "verified_helper") {
      setForm(emptyForm);
      return;
    }

    const helperProfileResult = await loadOwnHelperProfile(
      supabase,
      profileResult.profile.id,
    );

    if (helperProfileResult.errorMessage) {
      setMessage(
        `Could not load your helper profile: ${helperProfileResult.errorMessage}. Confirm helper_profiles RLS policies and the approval migration are applied.`,
      );
      setHelperProfile(null);
      return;
    }

    if (!helperProfileResult.helperProfile) {
      setMessage(
        "Your account is marked as a verified helper, but no helper_profiles row was found. Ask an admin to repair your approved helper profile.",
      );
      setHelperProfile(null);
      return;
    }

    setHelperProfile(helperProfileResult.helperProfile);
    setForm(helperProfileToForm(helperProfileResult.helperProfile));
  }, []);

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
        return;
      }

      if (!data.user) {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setProfileStatus("idle");
        return;
      }

      setStatus("signed-in");
      setUser(data.user);
      void loadSignedInProfile(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setStatus("signed-out");
        setUser(null);
        setProfile(null);
        setProfileStatus("idle");
        setHelperProfile(null);
        setForm(emptyForm);
        return;
      }

      setStatus("signed-in");
      setUser(session.user);
      void loadSignedInProfile(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadSignedInProfile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    if (!user || !profile || profile.role !== "verified_helper") {
      setMessage(
        "Only signed-in verified helpers can edit helper profile fields.",
      );
      return;
    }

    const validation = validateForm(form);

    if (validation.errorMessage || !validation.input) {
      setMessage(validation.errorMessage);
      setSuccessMessage(null);
      return;
    }

    setIsSaving(true);
    setMessage(null);
    setSuccessMessage(null);

    const result = await updateOwnHelperProfile(supabase, validation.input);

    if (result.errorMessage || !result.helperProfile) {
      setMessage(
        result.errorMessage ??
          "Could not update helper profile for an unknown reason.",
      );
      setIsSaving(false);
      return;
    }

    setHelperProfile(result.helperProfile);
    setForm(helperProfileToForm(result.helperProfile));
    setSuccessMessage(
      "Helper profile saved. Public visibility is still controlled only by admins.",
    );
    setIsSaving(false);
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Dashboard"
        title="Helper profile management"
        description="Approved helpers can edit safe public profile fields here. Helpers cannot change verification status, public visibility, account role, or admin-only fields."
      />

      {status === "loading" || profileStatus === "loading" ? (
        <div
          className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200"
          role="status"
        >
          Checking your session and helper profile…
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
            You need to log in before managing an approved helper profile.
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

      {status === "signed-in" && profileStatus === "missing" ? (
        <div
          className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900"
          role="alert"
        >
          <h2 className="text-2xl font-bold">Profile setup needed</h2>
          <p className="mt-4 leading-7">{message}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            Return to dashboard
          </Link>
        </div>
      ) : null}

      {status === "signed-in" && profileStatus === "error" ? (
        <div
          className="mt-8 rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-800"
          role="alert"
        >
          <h2 className="text-2xl font-bold">Could not load profile</h2>
          <p className="mt-4 leading-7">{message}</p>
        </div>
      ) : null}

      {status === "signed-in" &&
      profileStatus === "loaded" &&
      profile?.role === "helper_applicant" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">
            Application still in progress
          </h2>
          <p className="mt-4 leading-7">
            Helper profile management is available only after admin approval
            changes your role to verified helper. You can check or update your
            application while it remains editable.
          </p>
          <Link
            href="/helper/apply"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            Open helper application
          </Link>
        </div>
      ) : null}

      {status === "signed-in" &&
      profileStatus === "loaded" &&
      profile?.role === "client" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">
            Approved helpers only
          </h2>
          <p className="mt-4 leading-7">
            Helper profile management is only for approved helpers.
            Client/caregiver accounts can continue managing elderly profiles and
            booking requests from the dashboard.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            Return to dashboard
          </Link>
        </div>
      ) : null}

      {status === "signed-in" &&
      profileStatus === "loaded" &&
      profile?.role === "admin" ? (
        <div className="mt-8 rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">
            Admin visibility controls
          </h2>
          <p className="mt-4 leading-7">
            Admins manage public helper visibility from the admin dashboard.
            Helper self-editing is intended for verified helper accounts.
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800"
          >
            Open admin dashboard
          </Link>
        </div>
      ) : null}

      {status === "signed-in" &&
      profileStatus === "loaded" &&
      profile?.role === "verified_helper" ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200"
          >
            <h2 className="text-2xl font-bold text-forest">
              Edit safe public fields
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              These fields may appear on `/helpers` only if an admin makes your
              approved helper profile visible. You cannot make yourself public
              from this form.
            </p>

            {message ? (
              <p
                className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900"
                role="alert"
              >
                {message}
              </p>
            ) : null}
            {successMessage ? (
              <p
                className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800"
                role="status"
              >
                {successMessage}
              </p>
            ) : null}

            {helperProfile ? (
              <dl className="mt-5 grid gap-3 rounded-3xl bg-cream p-4 text-sm">
                <div>
                  <dt className="font-bold text-forest">Verification status</dt>
                  <dd className="mt-1">
                    {formatHelperVerificationStatus(
                      helperProfile.verification_status,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-forest">Public visibility</dt>
                  <dd className="mt-1">
                    {helperProfile.is_visible
                      ? "Visible on /helpers"
                      : "Hidden until an admin makes it visible"}
                  </dd>
                </div>
              </dl>
            ) : null}

            <div className="mt-5 space-y-5">
              <label className="block">
                <span className="text-sm font-bold text-forest">Bio</span>
                <textarea
                  value={form.bio}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      bio: event.target.value,
                    }))
                  }
                  rows={7}
                  className="mt-2 w-full rounded-3xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-clay focus:ring-4 focus:ring-clay/20"
                  placeholder="Describe your non-medical companionship, errands, technology help, or check-in support experience."
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-forest">City</span>
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-clay focus:ring-4 focus:ring-clay/20"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-forest">
                  Service radius in km
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.serviceRadiusKm}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      serviceRadiusKm: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-full border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition focus:border-clay focus:ring-4 focus:ring-clay/20"
                  placeholder="Optional"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving || !helperProfile}
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving…" : "Save helper profile"}
            </button>
          </form>

          <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
            <h2 className="text-xl font-bold text-forest">
              Required safety guidance
            </h2>
            <ul className="mt-4 space-y-3 leading-7">
              {safetyGuidance.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <Link
              href="/prohibited-services"
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-white px-5 py-3 font-semibold text-forest transition hover:bg-cream"
            >
              Review prohibited services
            </Link>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
