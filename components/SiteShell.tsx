import Link from "next/link";
import type { ReactNode } from "react";
import { AuthNav } from "@/components/AuthNav";
import { LanguageSelector } from "@/components/LanguageSelector";
import { I18nProvider } from "@/lib/i18n";

const navigationLinks = [
  { href: "/services", label: "Services" },
  { href: "/helpers", label: "Caregivers" },
  { href: "/safety", label: "Safety" },
];

const loggedOutOnlyLinks = [
  { href: "/helper/apply", label: "Become a caregiver" },
];

const footerLinks = [
  { href: "/services", label: "Services" },
  { href: "/helpers", label: "Caregivers" },
  { href: "/safety", label: "Safety" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-white hover:text-forest hover:shadow-sm focus-visible:bg-white md:px-3 md:py-2"
    >
      {label}
    </Link>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
    <div className="min-h-screen overflow-hidden bg-cream text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-cream/90 shadow-sm shadow-stone-200/40 backdrop-blur">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8"
          aria-label="Main navigation"
        >
          <Link
            href="/"
            className="group flex min-h-12 items-center gap-3 rounded-full pr-3 text-forest transition hover:text-stone-800"
            aria-label="Vnuk Pod Naem home"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-forest via-moss to-clay text-white shadow-md shadow-stone-300/50 ring-1 ring-white/80 transition group-hover:scale-[1.02]">
              <svg
                viewBox="0 0 48 48"
                role="img"
                aria-hidden="true"
                className="size-8"
              >
                <path
                  d="M24 9c6.2-6.1 16.5-1.8 16.5 7.3 0 8.7-9.8 14.7-16.5 21.2C17.3 31 7.5 25 7.5 16.3 7.5 7.2 17.8 2.9 24 9Z"
                  fill="currentColor"
                  opacity="0.96"
                />
                <path
                  d="M15.5 25.2c4.6-2 8-1.1 11.3 1.1 2.2 1.5 4.1 1.9 6.8.7"
                  fill="none"
                  stroke="#fbf7ef"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3.2"
                />
                <circle cx="18.5" cy="16.8" r="3.2" fill="#fbf7ef" />
                <circle cx="29.5" cy="16.8" r="3.2" fill="#fbf7ef" />
              </svg>
            </span>
            <span className="block text-xl font-extrabold tracking-[-0.03em] text-forest">
              Vnuk Pod Naem
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navigationLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
            <AuthNav variant="links" loggedOutLinks={loggedOutOnlyLinks} />
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSelector />
            <AuthNav />
          </div>

          <details className="group relative md:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-forest shadow-sm transition hover:border-moss/40 hover:bg-sage [&::-webkit-details-marker]:hidden">
              Menu
              <span
                aria-hidden="true"
                className="text-lg leading-none transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="absolute right-0 mt-3 w-[min(88vw,22rem)] rounded-3xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-300/40">
              <div className="grid gap-1">
                {navigationLinks.map((link) => (
                  <NavLink key={link.href} {...link} />
                ))}
                <AuthNav variant="links" loggedOutLinks={loggedOutOnlyLinks} />
              </div>
              <div className="mt-3 grid gap-3 border-t border-stone-100 pt-3">
                <LanguageSelector compact />
                <AuthNav variant="mobile" />
              </div>
            </div>
          </details>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="border-t border-stone-200 bg-white/85">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm text-stone-600 md:grid-cols-[1.5fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <p className="text-lg font-bold text-forest">Vnuk Pod Naem</p>
            <p className="mt-3 max-w-xl leading-7">
              A marketplace for trusted everyday support: visits, errands,
              shopping, companionship, home tasks, and accompaniment. Everyone
              starts with a normal account, and caregivers appear publicly only
              after admin review.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-forest">Navigation</h2>
            <div className="mt-3 grid gap-2">
              {footerLinks.slice(0, 3).map((link) => (
                <Link key={link.href} href={link.href} className="font-semibold text-stone-700 transition hover:text-forest">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-forest">Legal</h2>
            <div className="mt-3 grid gap-2">
              {footerLinks.slice(3).map((link) => (
                <Link key={link.href} href={link.href} className="font-semibold text-stone-700 transition hover:text-forest">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
    </I18nProvider>
  );
}
