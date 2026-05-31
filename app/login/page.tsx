"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetContact, setResetContact] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setErrorMessage(envError);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setPassword("");
    setIsSubmitting(false);
    router.push("/");
    router.refresh();
  }

  function handleResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetMessage(
      "Password reset is not active yet. For testing, use your email/password account.",
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">
        Account access
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">
        Enter your profile
      </h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Sign in</h2>
          <p className="mt-4 text-lg leading-8">
            Use your email and password to open your profile, browse caregivers,
            and manage your account actions.
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
                autoComplete="current-password"
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
              />
            </label>

            {errorMessage ? (
              <div
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 grid gap-3 text-sm text-stone-600">
            <button
              type="button"
              onClick={() => {
                setShowResetForm((current) => !current);
                setResetMessage(null);
              }}
              className="w-fit font-semibold text-forest underline"
            >
              Forgot password?
            </button>

            {showResetForm ? (
              <form onSubmit={handleResetSubmit} className="grid gap-3 rounded-3xl bg-cream p-4">
                <label className="grid gap-2 font-semibold text-stone-700">
                  Email or phone
                  <input
                    type="text"
                    value={resetContact}
                    onChange={(event) => setResetContact(event.target.value)}
                    required
                    className="min-h-11 rounded-2xl border border-stone-200 bg-white px-4 py-2 text-base font-normal text-stone-900 shadow-sm focus:border-clay focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-fit items-center rounded-full border border-stone-200 bg-white px-5 py-2 font-semibold text-forest transition hover:bg-sage"
                >
                  Check reset options
                </button>
                {resetMessage ? (
                  <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-semibold text-amber-900" role="status">
                    {resetMessage}
                  </p>
                ) : null}
              </form>
            ) : null}

            <p>
              Need an account?{" "}
              <Link href="/signup" className="font-semibold text-forest underline">
                Sign up
              </Link>
              .
            </p>
          </div>
        </div>
        <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">After signing in</h2>
          <ul className="mt-4 space-y-3 leading-7">
            <li>• The header shows your avatar initials menu.</li>
            <li>• My profile is your account hub for family and caregiver actions.</li>
            <li>• Password reset is a placeholder and does not send emails yet.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
