"use client";

import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type DashboardStatus = "loading" | "signed-out" | "signed-in" | "unconfigured";

function formatAccountType(value: unknown) {
  if (value === "client_caregiver") {
    return "Client/caregiver";
  }

  if (value === "helper_applicant") {
    return "Helper applicant";
  }

  return "Not set yet";
}

export default function DashboardPage() {
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
        return;
      }

      if (!data.user) {
        setStatus("signed-out");
        setUser(null);
        return;
      }

      setStatus("signed-in");
      setUser(data.user);
      setMessage(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setStatus("signed-out");
        setUser(null);
        return;
      }

      setStatus("signed-in");
      setUser(session.user);
      setMessage(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Account dashboard</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Dashboard</h1>

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
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold text-forest">Please log in</h2>
            <p className="mt-4 text-lg leading-8">
              You need to log in before viewing the dashboard shell. Protected middleware and database-backed profiles are not implemented in this phase.
            </p>
            {message ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{message}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
                Login
              </Link>
              <Link href="/signup" className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-5 py-3 font-semibold text-forest transition hover:bg-sage">
                Sign up
              </Link>
            </div>
          </div>
          <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
            <h2 className="text-xl font-bold text-forest">Not active yet</h2>
            <ul className="mt-4 space-y-3 leading-7">
              <li>• No database profile records are created in this phase.</li>
              <li>• No bookings, payments, helper approvals, or admin workflows are active.</li>
              <li>• Route protection middleware is intentionally deferred.</li>
            </ul>
          </aside>
        </div>
      ) : null}

      {status === "signed-in" && user ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-2xl font-bold text-forest">Welcome</h2>
            <dl className="mt-5 grid gap-4 rounded-3xl bg-cream p-5 text-sm">
              <div>
                <dt className="font-bold text-forest">Email</dt>
                <dd className="mt-1 break-words">{user.email ?? "Not available"}</dd>
              </div>
              <div>
                <dt className="font-bold text-forest">Account type</dt>
                <dd className="mt-1">{formatAccountType(user.user_metadata?.account_type)}</dd>
              </div>
            </dl>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Elderly profiles", "Future area for client/caregiver profile management."],
                ["Bookings", "Future area for non-medical service requests and booking status."],
                ["Helper workflows", "Future area for helper applications and review status."],
                ["Admin workflows", "Future area for carefully protected moderation and support tools."],
              ].map(([title, description]) => (
                <section key={title} className="rounded-3xl border border-stone-200 p-4">
                  <h3 className="font-bold text-forest">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
                </section>
              ))}
            </div>
          </div>
          <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
            <h2 className="text-xl font-bold text-forest">Current dashboard scope</h2>
            <ul className="mt-4 space-y-3 leading-7">
              <li>• Auth session display is active when Supabase is configured.</li>
              <li>• Full role-based routing and database profile tables are not implemented yet.</li>
              <li>• No payment processing, booking payments, or Stripe logic has been added.</li>
            </ul>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
