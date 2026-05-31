"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createSignupDatabaseRecords,
  currentPrivacyVersion,
  currentTermsVersion,
} from "@/lib/supabase/profiles";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== repeatPassword) {
      setErrorMessage("Password and repeat password must match.");
      setSuccessMessage(null);
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage(
        "You must accept the Terms and Privacy Policy before creating an account.",
      );
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

    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          display_name: displayName,
          phone: phone.trim(),
          gender,
          account_type: "client_caregiver",
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
        "Signup may have succeeded, but Supabase did not return the user details needed to create the database profile. Please log in and use the profile retry path, or contact support.",
      );
      setPassword("");
      setRepeatPassword("");
      setIsSubmitting(false);
      return;
    }

    const databaseResult = await createSignupDatabaseRecords(supabase, {
      userId: data.user.id,
      email: data.user.email,
      accountType: "client_caregiver",
      displayName,
      phone,
    });

    if (databaseResult.errorMessage) {
      setErrorMessage(
        `${databaseResult.errorMessage}. Please log in after confirming your email, then open My profile to retry profile setup.`,
      );
      setPassword("");
      setRepeatPassword("");
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage(
      "Signup complete. Your account and profile were saved. If email confirmation is enabled, check your email before signing in.",
    );
    setPassword("");
    setRepeatPassword("");
    setIsSubmitting(false);
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
        Create your account
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">
        Join VnukPodNaem
      </h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">
            One profile for families and caregivers
          </h2>
          <p className="mt-4 text-lg leading-8">
            Create a normal account first. If you want to offer support as a
            caregiver, you can apply later from your profile after signing in.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-stone-700">
                First name
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  autoComplete="given-name"
                  className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-stone-700">
                Last name
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  autoComplete="family-name"
                  className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-semibold text-stone-700">
              Phone number
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                autoComplete="tel"
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-stone-700">
              Gender
              <select
                value={gender}
                onChange={(event) => setGender(event.target.value)}
                required
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
              >
                <option value="" disabled>
                  Select gender
                </option>
                <option value="woman">Woman</option>
                <option value="man">Man</option>
                <option value="non_binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>

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

            <div className="grid gap-5 sm:grid-cols-2">
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

              <label className="grid gap-2 text-sm font-semibold text-stone-700">
                Repeat password
                <input
                  type="password"
                  value={repeatPassword}
                  onChange={(event) => setRepeatPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
                />
              </label>
            </div>

            <label className="flex gap-3 rounded-3xl border border-stone-200 bg-cream p-4 text-sm leading-6 text-stone-700">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
                className="mt-1"
              />
              <span>
                I accept the{" "}
                <Link href="/terms" className="font-semibold text-forest underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-forest underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {errorMessage ? (
              <div
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
                role="status"
              >
                {successMessage} <Link href="/login" className="underline">Sign in</Link>.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-stone-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-forest underline">
              Sign in
            </Link>
            .
          </p>
        </div>
        <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">Caregiver applications</h2>
          <ul className="mt-4 space-y-3 leading-7">
            <li>• Signup no longer asks you to choose a role.</li>
            <li>• New accounts are created as normal user profiles.</li>
            <li>
              • To become a caregiver, sign in and use the application flow from
              My profile or the avatar menu.
            </li>
            <li>
              • Gender is saved in Supabase auth metadata for now; the database
              profile table does not have a gender column.
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
