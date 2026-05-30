"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadVisibleVerifiedHelperProfiles, type PublicHelperProfile } from "@/lib/supabase/helperProfiles";

type HelpersStatus = "loading" | "loaded" | "unconfigured" | "error";

export default function HelpersPage() {
  const [status, setStatus] = useState<HelpersStatus>("loading");
  const [helperProfiles, setHelperProfiles] = useState<PublicHelperProfile[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    loadVisibleVerifiedHelperProfiles(supabase).then((result) => {
      if (result.errorMessage) {
        setStatus("error");
        setMessage(`Could not load public helper profiles: ${result.errorMessage}. Confirm the helper_profiles RLS policy is applied and only visible verified helpers are public.`);
        return;
      }

      setHelperProfiles(result.helperProfiles);
      setStatus("loaded");
      setMessage(null);
    });
  }, []);

  const hasVisibleVerifiedHelpers = helperProfiles.length > 0;

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-clay">Helpers</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-forest sm:text-5xl">Public helper marketplace</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        This page only reads visible, verified helper profiles from the public helper profile table. Submitted applications and unverified applicants are never shown here.
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
        <div className="rounded-[2rem] bg-white p-6 text-stone-700 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-2xl font-bold text-forest">Marketplace listing status</h2>

          {status === "loading" ? <p className="mt-4 leading-7" role="status">Checking for visible verified helper profiles…</p> : null}

          {status === "unconfigured" ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="alert">
              {message}
            </div>
          ) : null}

          {status === "error" ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
              {message}
            </div>
          ) : null}

          {status === "loaded" && !hasVisibleVerifiedHelpers ? (
            <>
              <p className="mt-4 text-lg leading-8">
                Public helper marketplace listings are not active yet because there are no visible verified helper profiles to show.
              </p>
              <p className="mt-4 leading-7">
                Helper applications are private review records. They do not create public helper profiles, do not approve helpers, and do not make unverified applicants available for bookings.
              </p>
            </>
          ) : null}

          {status === "loaded" && hasVisibleVerifiedHelpers ? (
            <div className="mt-5 grid gap-4">
              {helperProfiles.map((helperProfile) => (
                <article key={helperProfile.id} className="rounded-3xl border border-stone-200 p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay">{helperProfile.verification_status === "trusted" ? "Trusted verified helper" : "Verified helper"}</p>
                  <h3 className="mt-2 text-xl font-bold text-forest">Helper in {helperProfile.city}</h3>
                  <p className="mt-2 leading-7 text-stone-600">{helperProfile.bio}</p>
                  <p className="mt-3 text-sm font-semibold text-stone-600">
                    Service radius: {helperProfile.service_radius_km === null ? "Not listed" : `${helperProfile.service_radius_km} km`}
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          <Link href="/prohibited-services" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-forest px-5 py-3 font-semibold text-white transition hover:bg-stone-800">
            See prohibited services
          </Link>
        </div>
        <aside className="rounded-[2rem] bg-sage p-6 text-stone-700">
          <h2 className="text-xl font-bold text-forest">Listing safety rules</h2>
          <ul className="mt-4 space-y-3 leading-7">
            <li>• Unverified helper applicants are not shown publicly.</li>
            <li>• Submitted applications are private and are not marketplace profiles.</li>
            <li>• Public visibility requires a visible helper profile with verified status.</li>
            <li>• No booking payments, Stripe, applicant records, or guaranteed safety claims are shown here.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
