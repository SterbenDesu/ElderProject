"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { createSignupDatabaseRecords, currentPrivacyVersion, currentTermsVersion, type SignupAccountType } from "@/lib/supabase/profiles";

type AccountType = SignupAccountType;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("client_caregiver");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!acceptedTerms) {
      setErrorMessage("You must accept the Terms and Privacy Policy before creating an account.");
      setSuccessMessage(null);
      return;
    }

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setErrorMessage(envError);
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: accountType,
          terms_accepted: true,
          terms_version: currentTermsVersion,
          privacy_version: currentPrivacyVersion,
        },
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    if (!data.user?.id || !data.user.email) {
      setErrorMessage(
        "Signup may have succeeded, but Supabase did not return the user details needed to create the database profile. Please log in and use the dashboard retry path, or contact support.",
      );
      setPassword("");
      setIsSubmitting(false);
      return;
    }

    const databaseResult = await createSignupDatabaseRecords(supabase, {
      userId: data.user.id,
      email: data.user.email,
      accountType,
    });

    if (databaseResult.errorMessage) {
      setErrorMessage(`${databaseResult.errorMessage}. Please log in after confirming your email, then open the dashboard to retry profile setup.`);
      setPassword("");
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Signup complete. Your auth account, profile, and Terms/Privacy acceptance were saved. Check your email if Supabase email confirmation is enabled, then log in.");
    setPassword("");
    setIsSubmitting(false);
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Account access</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Signup</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Create an email account</h2>
          <p className="mt-4 text-lg leading-8">
            Choose whether you are joining as a client/caregiver or as a helper applicant. This creates your Supabase auth account and a matching database profile when the database schema is applied.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-stone-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-stone-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
              />
            </label>

            <fieldset className="grid gap-3 rounded-3xl border border-stone-200 p-4">
              <legend className="px-2 text-sm font-bold text-forest">Account type</legend>
              <label className="flex gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-stone-700">
                <input
                  type="radio"
                  name="accountType"
                  value="client_caregiver"
                  checked={accountType === "client_caregiver"}
                  onChange={() => setAccountType("client_caregiver")}
                  className="mt-1"
                />
                <span>
                  Client/caregiver
                  <span className="block font-normal leading-6">For elderly people or family caregivers looking for non-medical support.</span>
                </span>
              </label>
              <label className="flex gap-3 rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-stone-700">
                <input
                  type="radio"
                  name="accountType"
                  value="helper_applicant"
                  checked={accountType === "helper_applicant"}
                  onChange={() => setAccountType("helper_applicant")}
                  className="mt-1"
                />
                <span>
                  Helper applicant
                  <span className="block font-normal leading-6">For independent helpers applying to offer non-medical support later.</span>
                </span>
              </label>
            </fieldset>

            <label className="flex gap-3 rounded-3xl border border-stone-200 bg-cream p-4 text-sm font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                className="mt-1"
              />
              <span>
                I accept the <Link href="/terms" className="text-forest underline">Terms</Link> and <Link href="/privacy" className="text-forest underline">Privacy Policy</Link>.
                <span className="block font-normal leading-6">Signup is disabled until these are accepted.</span>
              </span>
            </label>

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
                {successMessage} <Link href="/login" className="underline">Go to login</Link>.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !acceptedTerms}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="mt-5 text-sm text-stone-600">
            Already have an account? <Link href="/login" className="font-semibold text-forest underline">Login</Link>.
          </p>
        </div>
        <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">Current signup scope</h2>
          <ul className="mt-4 space-y-3 leading-7">
            <li>• Account type and Terms/Privacy acceptance are saved to Supabase auth metadata and app database tables when allowed by RLS.</li>
            <li>• Basic client booking requests are implemented; payments, full role-based routing, and public helper visibility controls are not implemented yet.</li>
            <li>• No payments, medical services, or helper employment relationship are added.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
