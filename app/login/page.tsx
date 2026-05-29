"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setErrorMessage(envError);
      setSuccessMessage(null);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Login successful. You can now open your dashboard.");
    setPassword("");
    setIsSubmitting(false);
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Account access</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Login</h1>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Sign in with email</h2>
          <p className="mt-4 text-lg leading-8">
            Use your Supabase email and password account to access the early dashboard shell. Booking, payments, and database-backed profiles are not active yet.
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
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
                {successMessage} <Link href="/dashboard" className="underline">Go to dashboard</Link>.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in…" : "Login"}
            </button>
          </form>

          <p className="mt-5 text-sm text-stone-600">
            Need an account? <Link href="/signup" className="font-semibold text-forest underline">Sign up</Link>.
          </p>
        </div>
        <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">Current auth scope</h2>
          <ul className="mt-4 space-y-3 leading-7">
            <li>• Email/password authentication uses Supabase when configured.</li>
            <li>• Database profiles, helper approvals, bookings, and payments are still inactive.</li>
            <li>• Helpers remain independent marketplace participants, not employees.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
