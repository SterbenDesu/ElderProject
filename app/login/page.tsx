"use client";

// Login — visually and texturally consistent with signup. Errors are surfaced
// kindly and the user is returned to wherever they came from (returnTo),
// preserving any marketplace filter query carried in that URL.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import type { FormEvent } from "react";
import { Suspense, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { readReturnTo, withReturnTo } from "@/lib/auth/returnTo";

const inputClass =
  "min-h-14 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-lg font-normal text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25";
const labelClass = "grid gap-2 text-base font-bold text-espresso";

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "That email or password did not match. Please check them and try again.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email first — check your inbox for the confirmation link.";
  }
  return message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = readReturnTo(searchParams);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(friendlyAuthError(error.message));
      setIsSubmitting(false);
      return;
    }

    setPassword("");
    setIsSubmitting(false);
    router.push(returnTo ?? "/account");
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Welcome back"
        title="Sign in"
        description="Sign in with your email and password to continue where you left off."
      />

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <div className="rounded-[2rem] border border-sand bg-white p-6 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} className="grid gap-6">
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
            </label>

            <label className={labelClass}>
              Password
              <span className="relative block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
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
            </label>

            {errorMessage ? (
              <div
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700"
                role="alert"
              >
                {errorMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-14 items-center justify-center rounded-full bg-terracotta px-6 py-3 text-lg font-bold text-white shadow-lg shadow-terracotta/30 transition hover:-translate-y-0.5 hover:bg-terracotta-dark hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-base text-espresso-light">
            Need an account?{" "}
            <Link
              href={withReturnTo("/signup", returnTo)}
              className="font-bold text-terracotta underline"
            >
              Create one
            </Link>
            .
          </p>
        </div>

        <aside className="h-fit rounded-[2rem] bg-ivory p-6 ring-1 ring-sand sm:p-8">
          <h2 className="font-display text-2xl font-extrabold text-espresso">
            After signing in
          </h2>
          <ul className="mt-5 grid gap-4 text-base leading-7 text-espresso-light">
            <li>• You return exactly where you were, with your search kept.</li>
            <li>• Your profile is your simple account hub.</li>
            <li>• Your phone number always stays private.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
          <p className="text-lg font-semibold text-espresso">Loading…</p>
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
