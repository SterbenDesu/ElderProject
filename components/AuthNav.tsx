"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadProfile, type ProfileRole } from "@/lib/supabase/profiles";

type AuthStatus = "loading" | "signed-in" | "signed-out" | "unconfigured";
type AuthNavVariant = "desktop" | "mobile" | "links";
type HeaderLink = { href: string; label: string };

type AccountSummary = {
  email: string | null;
  displayName: string | null;
  role: ProfileRole | null;
};

function getInitials(displayName: string | null, email: string | null) {
  const source = displayName?.trim() || email?.split("@")[0]?.trim() || "VP";
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function DropdownLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-2xl px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-sage hover:text-forest"
    >
      {children}
    </Link>
  );
}

export function AuthNav({
  variant = "desktop",
  loggedOutLinks = [],
}: {
  variant?: AuthNavVariant;
  loggedOutLinks?: HeaderLink[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [account, setAccount] = useState<AccountSummary>({
    email: null,
    displayName: null,
    role: null,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const initials = useMemo(
    () => getInitials(account.displayName, account.email),
    [account.displayName, account.email],
  );

  useEffect(() => {
    const { supabase, envError } = getSupabaseBrowserClient();

    if (envError || !supabase) {
      setStatus("unconfigured");
      setMessage(envError);
      return;
    }

    let isMounted = true;

    async function loadAccount(userId: string, email: string | null) {
      if (!supabase) {
        return;
      }

      const profileResult = await loadProfile(supabase, userId);

      if (!isMounted) {
        return;
      }

      setAccount({
        email,
        displayName: profileResult.profile?.display_name ?? null,
        role: profileResult.profile?.role ?? null,
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) {
        return;
      }

      if (data.session?.user) {
        setStatus("signed-in");
        setMessage(null);
        void loadAccount(data.session.user.id, data.session.user.email ?? null);
      } else {
        setStatus("signed-out");
        setAccount({ email: null, displayName: null, role: null });
        setMessage(null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setStatus("signed-in");
        setMessage(null);
        void loadAccount(session.user.id, session.user.email ?? null);
      } else {
        setStatus("signed-out");
        setAccount({ email: null, displayName: null, role: null });
        setMessage(null);
      }
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
    setAccount({ email: null, displayName: null, role: null });
    setIsSigningOut(false);
    router.push("/");
    router.refresh();
  }

  if (variant === "links") {
    if (status !== "signed-out" && status !== "unconfigured") {
      return null;
    }

    return (
      <>
        {loggedOutLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-sage hover:text-forest focus-visible:bg-sage md:px-3 md:py-2"
          >
            {link.label}
          </Link>
        ))}
      </>
    );
  }

  if (status === "loading") {
    return <span className="px-4 py-2.5 text-sm font-semibold text-stone-500">Checking account…</span>;
  }

  if (status === "signed-in") {
    const menuWidth = variant === "mobile" ? "w-full" : "w-64";

    return (
      <div className={variant === "mobile" ? "grid gap-2" : "relative"}>
        <details className="group relative">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-full border border-stone-200 bg-white px-2 py-2 text-sm font-semibold text-forest shadow-sm transition hover:border-moss/40 hover:bg-sage [&::-webkit-details-marker]:hidden">
            <span className="grid size-9 place-items-center rounded-full bg-forest text-sm font-bold text-white">
              {initials}
            </span>
            <span className="pr-2">Account</span>
          </summary>
          <div className={`absolute right-0 mt-3 ${menuWidth} rounded-3xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-300/40`}>
            <div className="border-b border-stone-100 px-3 pb-3">
              <p className="text-sm font-bold text-forest">
                {account.displayName || "My profile"}
              </p>
              {account.email ? (
                <p className="mt-1 break-words text-xs text-stone-500">{account.email}</p>
              ) : null}
            </div>
            <div className="mt-2 grid gap-1">
              <DropdownLink href="/dashboard">My profile</DropdownLink>
              <DropdownLink href="/helpers">Browse caregivers</DropdownLink>
              <DropdownLink href="/helper/apply">Become a caregiver</DropdownLink>
              {account.role === "admin" ? <DropdownLink href="/admin">Admin</DropdownLink> : null}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-2xl px-4 py-3 text-left text-sm font-semibold text-clay transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
            {message ? <p className="mt-2 px-3 text-xs font-semibold text-clay">{message}</p> : null}
          </div>
        </details>
      </div>
    );
  }

  const wrapperClass = variant === "mobile" ? "grid gap-2" : "flex items-center gap-2";
  const loginClass =
    variant === "mobile"
      ? "rounded-full bg-forest px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
      : "rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800";

  return (
    <div className={wrapperClass}>
      <Link href="/login" className={loginClass}>
        Sign in
      </Link>
      {status === "unconfigured" && message ? <p className="text-xs font-semibold text-clay">{message}</p> : null}
    </div>
  );
}
