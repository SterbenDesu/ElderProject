"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AuthStatus = "loading" | "signed-in" | "signed-out" | "unconfigured";

export function AuthNav({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      setStatus(data.session ? "signed-in" : "signed-out");
      setMessage(null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "signed-in" : "signed-out");
      setMessage(null);
      router.refresh();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    setIsSigningOut(true);
    setMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      setIsSigningOut(false);
      return;
    }

    setStatus("signed-out");
    setIsSigningOut(false);
    router.push("/");
    router.refresh();
  }

  if (status === "loading") {
    return <span className="px-4 py-2.5 text-sm font-semibold text-stone-500">Checking account…</span>;
  }

  if (status === "signed-in") {
    const wrapperClass = variant === "mobile" ? "grid grid-cols-2 gap-2" : "flex items-center gap-2";
    const dashboardClass =
      variant === "mobile"
        ? "rounded-full border border-stone-200 px-4 py-3 text-center text-sm font-semibold text-forest transition hover:bg-sage"
        : "rounded-full px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-sage hover:text-forest";
    const signOutClass =
      variant === "mobile"
        ? "rounded-full bg-forest px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70"
        : "rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-70";

    return (
      <div className={wrapperClass}>
        <Link href="/dashboard" className={dashboardClass}>
          Dashboard
        </Link>
        <button type="button" onClick={handleSignOut} disabled={isSigningOut} className={signOutClass}>
          {isSigningOut ? "Signing out…" : "Sign out"}
        </button>
        {message ? <p className="col-span-2 text-xs font-semibold text-clay">{message}</p> : null}
      </div>
    );
  }

  const wrapperClass = variant === "mobile" ? "grid grid-cols-2 gap-2" : "flex items-center gap-2";
  const loginClass =
    variant === "mobile"
      ? "rounded-full border border-stone-200 px-4 py-3 text-center text-sm font-semibold text-forest transition hover:bg-sage"
      : "rounded-full px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-sage hover:text-forest";
  const signupClass =
    variant === "mobile"
      ? "rounded-full bg-forest px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
      : "rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800";

  return (
    <div className={wrapperClass}>
      <Link href="/login" className={loginClass}>
        Login
      </Link>
      <Link href="/signup" className={signupClass}>
        Sign up
      </Link>
      {status === "unconfigured" && message ? <p className="col-span-2 text-xs font-semibold text-clay">{message}</p> : null}
    </div>
  );
}
