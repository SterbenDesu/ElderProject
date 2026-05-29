import Link from "next/link";
import type { ReactNode } from "react";

const navigationLinks = [
  { href: "/services", label: "Services" },
  { href: "/safety", label: "Safety" },
  { href: "/allowed-services", label: "Allowed" },
  { href: "/prohibited-services", label: "Boundaries" },
  { href: "/helpers", label: "Helpers" },
];

const footerLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/admin", label: "Admin" },
];

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-sage hover:text-forest focus-visible:bg-sage md:px-3 md:py-2"
    >
      {label}
    </Link>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-hidden bg-cream text-stone-900">
      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-cream/90 shadow-sm shadow-stone-200/40 backdrop-blur">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8"
          aria-label="Main navigation"
        >
          <Link href="/" className="group flex min-h-12 items-center gap-3 rounded-full pr-3 text-forest">
            <span className="grid size-10 place-items-center rounded-full bg-forest text-base font-bold text-white shadow-sm transition group-hover:bg-stone-800">
              VP
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight">VnukPodNaem</span>
              <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-moss sm:block">Non-medical support</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navigationLinks.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/login" className="rounded-full px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-sage hover:text-forest">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800"
            >
              Sign up
            </Link>
          </div>

          <details className="group relative md:hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-forest shadow-sm transition hover:border-moss/40 hover:bg-sage [&::-webkit-details-marker]:hidden">
              Menu
              <span aria-hidden="true" className="text-lg leading-none transition group-open:rotate-45">+</span>
            </summary>
            <div className="absolute right-0 mt-3 w-[min(88vw,22rem)] rounded-3xl border border-stone-200 bg-white p-3 shadow-xl shadow-stone-300/40">
              <div className="grid gap-1">
                {navigationLinks.map((link) => (
                  <NavLink key={link.href} {...link} />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3">
                <Link href="/login" className="rounded-full border border-stone-200 px-4 py-3 text-center text-sm font-semibold text-forest transition hover:bg-sage">
                  Login
                </Link>
                <Link href="/signup" className="rounded-full bg-forest px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800">
                  Sign up
                </Link>
              </div>
            </div>
          </details>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="border-t border-stone-200 bg-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm text-stone-600 sm:grid-cols-[1.3fr_0.7fr] lg:px-8">
          <div>
            <p className="text-lg font-bold text-forest">VnukPodNaem</p>
            <p className="mt-3 max-w-2xl leading-7">
              A planned marketplace for non-medical everyday support. Helpers are independent marketplace participants, not employees of the platform. No live booking, payment, authentication, database, or admin functionality is active yet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full px-3 py-2 font-semibold text-stone-700 transition hover:bg-sage hover:text-forest">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
