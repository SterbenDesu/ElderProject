"use client";

// Elder signup — intentionally easy for a non-technical, often older audience.
// Typography follows the project standard: Fraunces for the display heading
// (via PageIntro / global h1) paired with Source Sans 3 for body. Warm green
// palette tokens (linen / ivory / terracotta=green / espresso / sand).

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { Suspense, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createElderProfile,
  currentPrivacyVersion,
  currentTermsVersion,
  recordTermsAcceptance,
  uploadAvatar,
} from "@/lib/auth/account";
import { readReturnTo, withReturnTo } from "@/lib/auth/returnTo";

const inputClass =
  "min-h-14 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-lg font-normal text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25";
const labelClass = "grid gap-2 text-base font-bold text-espresso";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = readReturnTo(searchParams);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return null;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedAge = Number(age);
    if (!Number.isInteger(parsedAge) || parsedAge < 16 || parsedAge > 120) {
      setErrorMessage("Please enter an age between 16 and 120.");
      setSuccessMessage(null);
      return;
    }

    if (!acceptedTerms) {
      setErrorMessage(
        "Please accept the Terms and Privacy Policy to create your account.",
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

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedPhone = phone.trim();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Mirrored into user_metadata so the profile row can be created on the
        // first authenticated load even if email confirmation defers signup.
        data: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          phone: trimmedPhone,
          age: parsedAge,
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

    // If email confirmation is required, there is no session yet — the profile
    // (and optional photo) will be set up on first sign-in. Guide the user.
    if (!data.session || !data.user?.id || !data.user.email) {
      setSuccessMessage(
        "Your account was created. Please check your email to confirm it, then sign in. You can add a profile photo later from your profile.",
      );
      setPassword("");
      setIsSubmitting(false);
      return;
    }

    // Active session: finish profile setup now, then continue where they were.
    let avatarUrl: string | null = null;
    if (photoFile) {
      const uploadResult = await uploadAvatar(supabase, data.user.id, photoFile);
      if (uploadResult.errorMessage) {
        // A failed optional photo must never block account creation.
        avatarUrl = null;
      } else {
        avatarUrl = uploadResult.url;
      }
    }

    const profileResult = await createElderProfile(supabase, {
      userId: data.user.id,
      email: data.user.email,
      firstName: trimmedFirst,
      lastName: trimmedLast,
      phone: trimmedPhone,
      age: parsedAge,
      avatarUrl,
    });

    if (profileResult.errorMessage) {
      setErrorMessage(
        `Your account was created, but profile setup did not finish: ${profileResult.errorMessage}. Sign in and open your profile to finish setup.`,
      );
      setPassword("");
      setIsSubmitting(false);
      return;
    }

    await recordTermsAcceptance(supabase, data.user.id);

    setPassword("");
    setIsSubmitting(false);
    router.push(returnTo ?? "/account");
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Create your account"
        title="Join Vnuk Pod Naem"
        description="Creating an account takes a minute. It lets you save the caregivers you like and continue your request when you are ready."
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <div className="rounded-[2rem] border border-sand bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className={labelClass}>
                First name
                <input
                  type="text"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                  autoComplete="given-name"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Last name
                <input
                  type="text"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                  autoComplete="family-name"
                  className={inputClass}
                />
              </label>
            </div>

            <label className={labelClass}>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className={inputClass}
              />
              <span className="text-sm font-normal leading-6 text-warmgrey">
                You will use your email to sign in.
              </span>
            </label>

            <label className={labelClass}>
              Phone number
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                autoComplete="tel"
                className={inputClass}
              />
              <span className="flex items-start gap-2 rounded-2xl bg-linen px-4 py-3 text-sm font-normal leading-6 text-espresso-light">
                <ShieldCheck
                  className="mt-0.5 size-5 shrink-0 text-terracotta"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Your phone number stays private. It is never shown to caregivers
                or other people — we use it only for your account.
              </span>
            </label>

            <label className={`${labelClass} sm:max-w-[12rem]`}>
              Age
              <input
                type="number"
                inputMode="numeric"
                min={16}
                max={120}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                required
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Password
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className={`${inputClass} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl text-warmgrey transition hover:bg-linen hover:text-terracotta"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Eye className="size-5" strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              </span>
              <span className="flex items-center gap-2 text-sm font-normal leading-6 text-warmgrey">
                <Lock className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                Use at least 8 characters.
              </span>
            </label>

            <div className="grid gap-2">
              <span className="text-base font-bold text-espresso">
                Profile photo
                <span className="ml-2 rounded-full bg-linen px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-terracotta">
                  Optional
                </span>
              </span>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-sand bg-ivory p-4">
                <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-linen to-sand text-warmgrey ring-1 ring-sand">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoPreview}
                      alt="Your selected profile photo"
                      className="size-full object-cover"
                    />
                  ) : (
                    <Camera className="size-8" strokeWidth={1.75} aria-hidden="true" />
                  )}
                </span>
                <div className="grid gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="block max-w-full text-sm text-espresso file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-terracotta file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-terracotta-dark"
                  />
                  {photoFile ? (
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="w-fit text-sm font-bold text-warmgrey underline transition hover:text-terracotta"
                    >
                      Remove photo
                    </button>
                  ) : (
                    <span className="text-sm font-normal leading-6 text-warmgrey">
                      You can skip this and add a photo later.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-sand bg-ivory p-4 text-base leading-7 text-espresso">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
                className="mt-1.5 size-5 shrink-0 accent-terracotta"
              />
              <span>
                I accept the{" "}
                <Link href="/terms" className="font-bold text-terracotta underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-bold text-terracotta underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            {errorMessage ? (
              <div
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-base font-semibold text-emerald-800"
                role="status"
              >
                {successMessage}{" "}
                <Link href={withReturnTo("/login", returnTo)} className="underline">
                  Sign in
                </Link>
                .
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-terracotta px-6 py-3 text-lg font-bold text-white shadow-lg shadow-terracotta/30 transition hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Creating account…" : "Create my account"}
            </button>
          </form>

          <p className="mt-6 text-base text-espresso-light">
            Already have an account?{" "}
            <Link
              href={withReturnTo("/login", returnTo)}
              className="font-bold text-terracotta underline"
            >
              Sign in
            </Link>
            .
          </p>
        </div>

        <aside className="h-fit rounded-[2rem] bg-ivory p-6 ring-1 ring-sand sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-espresso">
            Warm, private, simple
          </h2>
          <ul className="mt-5 grid gap-4 text-base leading-7 text-espresso-light">
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-terracotta" strokeWidth={2} aria-hidden="true" />
              Your phone number is private and never shown to others.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-terracotta" strokeWidth={2} aria-hidden="true" />
              No role to choose — everyone starts with one simple account.
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-terracotta" strokeWidth={2} aria-hidden="true" />
              You can offer help as a caregiver later, from your profile.
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-lg font-semibold text-espresso">Loading…</p>
        </section>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
