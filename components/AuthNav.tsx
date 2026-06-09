"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getAccountInitials } from "@/lib/auth/account";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";

type AuthNavVariant = "desktop" | "mobile" | "links";
type HeaderLink = { href: string; label: string };

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
  const { t } = useI18n();
  // Single source of truth for identity + role.
  const { status, user, profile, isAdmin, isCaregiver, envError, signOut } =
    useCurrentUser();
  const [message, setMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const initials = useMemo(
    () =>
      getAccountInitials(
        profile?.first_name ?? null,
        profile?.last_name ?? null,
        user?.email ?? null,
      ),
    [profile?.first_name, profile?.last_name, user?.email],
  );

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;

  async function handleSignOut() {
    setIsSigningOut(true);
    setMessage(null);

    const { errorMessage } = await signOut();

    if (errorMessage) {
      setMessage(errorMessage);
      setIsSigningOut(false);
      return;
    }

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
            {t(link.label)}
          </Link>
        ))}
      </>
    );
  }

  if (status === "loading") {
    return (
      <span
        className="flex min-h-12 items-center px-3 py-2.5"
        role="status"
        aria-label={t("Checking account…")}
      >
        <span
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-2 border-stone-300 border-t-forest"
        />
      </span>
    );
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
            <span className="pr-2">{t("Account")}</span>
          </summary>
          <div className={`absolute right-0 mt-3 ${menuWidth} rounded-3xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-300/40`}>
            <div className="border-b border-stone-100 px-3 pb-3">
              <p className="text-sm font-bold text-forest">
                {displayName || t("My profile")}
              </p>
              {user?.email ? (
                <p className="mt-1 break-words text-xs text-stone-500">{user.email}</p>
              ) : null}
            </div>
            <div className="mt-2 grid gap-1">
              <DropdownLink href="/account">{t("My profile")}</DropdownLink>
              <DropdownLink href="/messages">{t("Messages")}</DropdownLink>
              <DropdownLink href="/helpers">{t("Browse caregivers")}</DropdownLink>
              <DropdownLink href="/dashboard/reservations">{t("My bookings")}</DropdownLink>
              {isCaregiver ? (
                <>
                  <DropdownLink href="/dashboard/requests">
                    {t("Requests")}
                  </DropdownLink>
                  <DropdownLink href="/dashboard/caregiver">
                    {t("Caregiver dashboard")}
                  </DropdownLink>
                </>
              ) : (
                <DropdownLink href="/helper/apply">{t("Become a caregiver")}</DropdownLink>
              )}
              {isAdmin ? <DropdownLink href="/admin">{t("Admin")}</DropdownLink> : null}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="rounded-2xl px-4 py-3 text-left text-sm font-semibold text-clay transition hover:bg-cream disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? t("Signing out…") : t("Sign out")}
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
        {t("Sign in")}
      </Link>
      {status === "unconfigured" && envError ? (
        <p className="text-xs font-semibold text-clay">{envError}</p>
      ) : null}
    </div>
  );
}
