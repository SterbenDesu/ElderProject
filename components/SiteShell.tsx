"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { AuthNav } from "@/components/AuthNav";
import { LanguageSelector } from "@/components/LanguageSelector";
import { I18nProvider, translations, useI18n } from "@/lib/i18n";

const navigationLinks = [
  { href: "/", labelKey: "home" },
  { href: "/services", labelKey: "services" },
  { href: "/helpers", labelKey: "caregivers" },
  { href: "/safety", labelKey: "safety" },
] as const;

const loggedOutOnlyLinks = [
  { href: "/helper/apply", label: "Become a caregiver" },
];

const footerLinks = [
  { href: "/services", labelKey: "services" },
  { href: "/helpers", labelKey: "caregivers" },
  { href: "/safety", labelKey: "safety" },
  { href: "/terms", labelKey: "terms" },
  { href: "/privacy", labelKey: "privacy" },
] as const;

type ShellLinkKey = keyof typeof translations.en.shell.links;

function NavLink({ href, labelKey }: { href: string; labelKey: ShellLinkKey }) {
  const { language } = useI18n();

  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2.5 text-sm font-semibold text-espresso transition hover:bg-linen hover:text-terracotta focus-visible:bg-linen md:px-3 md:py-2"
    >
      {translations[language].shell.links[labelKey]}
    </Link>
  );
}

/* Logo mark — the existing SVG re-used with warm gradient colours */
function LogoMark() {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-espresso via-terracotta to-terracotta-light text-white shadow-md shadow-espresso/25 ring-1 ring-white/60 transition group-hover:scale-[1.03]">
      <svg viewBox="0 0 48 48" role="img" aria-hidden="true" className="size-8">
        <path
          d="M24 9c6.2-6.1 16.5-1.8 16.5 7.3 0 8.7-9.8 14.7-16.5 21.2C17.3 31 7.5 25 7.5 16.3 7.5 7.2 17.8 2.9 24 9Z"
          fill="currentColor"
          opacity="0.96"
        />
        <path
          d="M15.5 25.2c4.6-2 8-1.1 11.3 1.1 2.2 1.5 4.1 1.9 6.8.7"
          fill="none"
          stroke="#F9F4EE"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.2"
        />
        <circle cx="18.5" cy="16.8" r="3.2" fill="#F9F4EE" />
        <circle cx="29.5" cy="16.8" r="3.2" fill="#F9F4EE" />
      </svg>
    </span>
  );
}

function SiteShellContent({ children }: { children: ReactNode }) {
  const { language } = useI18n();
  const shellText = translations[language].shell;

  // Scroll-aware nav: transparent → solid ivory with shadow
  const [scrolled, setScrolled] = useState(false);
  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initialise on mount
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile drawer on route changes (links clicked inside it)
  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="min-h-screen bg-linen text-espresso">

      {/* ── NAVIGATION ───────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-ivory shadow-md shadow-espresso/8 backdrop-blur-sm"
            : "bg-ivory/70 backdrop-blur-sm"
        }`}
      >
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8"
          aria-label={shellText.mainNavigationLabel}
        >

          {/* Logo */}
          <Link
            href="/"
            onClick={closeMobile}
            className="group flex min-h-12 items-center gap-3 rounded-full pr-3 transition"
            aria-label={shellText.homeLabel}
          >
            <LogoMark />
            <span className="font-display text-xl font-extrabold tracking-[-0.03em] text-espresso">
              Vnuk Pod Naem
            </span>
          </Link>

          {/* Desktop centre links */}
          <div className="hidden items-center gap-1 md:flex">
            {navigationLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
            <AuthNav variant="links" loggedOutLinks={loggedOutOnlyLinks} />
          </div>

          {/* Desktop right — language + auth */}
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSelector />
            <AuthNav />
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-sand bg-white text-espresso shadow-sm transition hover:border-terracotta/30 hover:bg-linen md:hidden"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? shellText.closeMenu : shellText.menu}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              <X className="size-5" strokeWidth={2} aria-hidden="true" />
            ) : (
              <Menu className="size-5" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Mobile drawer — slide down with CSS grid trick, no JS library */}
        <div
          className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out md:hidden ${
            mobileOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
          aria-hidden={!mobileOpen}
        >
          <div className="overflow-hidden border-t border-sand/60 bg-ivory px-4 pb-4 pt-1">
            <div className="grid gap-0.5" onClick={closeMobile}>
              {navigationLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
              <AuthNav variant="links" loggedOutLinks={loggedOutOnlyLinks} />
            </div>
            <div className="mt-3 grid gap-3 border-t border-sand/60 pt-3">
              <LanguageSelector compact />
              <AuthNav variant="mobile" />
            </div>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ─────────────────────────────────────────────── */}
      <main>{children}</main>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="bg-espresso">
        {/* Main footer grid */}
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.8fr_1fr_1fr_auto] lg:px-8">

          {/* Brand column */}
          <div>
            <Link
              href="/"
              className="group inline-flex items-center gap-3 transition"
              aria-label={shellText.homeLabel}
            >
              <LogoMark />
              <span className="font-display text-xl font-extrabold text-ivory">
                Vnuk Pod Naem
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-warmgrey">
              {shellText.footerDescription}
            </p>
          </div>

          {/* Navigation links */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-ivory/50">
              {shellText.navigationHeading}
            </h2>
            <div className="mt-4 grid gap-2.5">
              {footerLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-warmgrey transition hover:text-ivory"
                >
                  {shellText.links[link.labelKey]}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal links */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-ivory/50">
              {shellText.legalHeading}
            </h2>
            <div className="mt-4 grid gap-2.5">
              {footerLinks.slice(3).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-warmgrey transition hover:text-ivory"
                >
                  {shellText.links[link.labelKey]}
                </Link>
              ))}
            </div>
          </div>

          {/* Social icons — Facebook & Instagram.
              Lucide deprecated brand icons; we use minimal hand-crafted SVGs
              that match Lucide's stroke style. */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-ivory/50">
              {shellText.followUs}
            </h2>
            <div className="mt-4 flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-warmgrey transition hover:border-terracotta/50 hover:bg-terracotta/20 hover:text-ivory"
              >
                {/* Facebook "f" — clean stroke approach */}
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-warmgrey transition hover:border-terracotta/50 hover:bg-terracotta/20 hover:text-ivory"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar — slightly lighter than footer bg */}
        <div className="border-t border-white/8 bg-espresso-light">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <p className="text-xs text-warmgrey">
              © {new Date().getFullYear()} Vnuk Pod Naem. All rights reserved.
            </p>
            <p className="text-xs text-warmgrey/60">
              {shellText.marketplaceDisclaimer}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <SiteShellContent>{children}</SiteShellContent>
    </I18nProvider>
  );
}
