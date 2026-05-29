import Link from "next/link";
import type { ReactNode } from "react";

const navigationLinks = [
  { href: "/services", label: "Services" },
  { href: "/safety", label: "Safety" },
  { href: "/allowed-services", label: "Allowed" },
  { href: "/prohibited-services", label: "Prohibited" },
  { href: "/helpers", label: "Helpers" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-stone-900">
      <header className="border-b border-stone-200 bg-cream/95">
        <nav className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8" aria-label="Main navigation">
          <Link href="/" className="text-xl font-bold tracking-tight text-forest">
            VnukPodNaem
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm font-medium text-stone-700">
            {navigationLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-forest">
                {link.label}
              </Link>
            ))}
            <Link href="/login" className="hover:text-forest">
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-forest px-4 py-2 text-white shadow-sm transition hover:bg-stone-800"
            >
              Sign up
            </Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="border-t border-stone-200 bg-white/70">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 text-sm text-stone-600 sm:grid-cols-2 lg:px-8">
          <div>
            <p className="font-semibold text-forest">VnukPodNaem</p>
            <p className="mt-2 max-w-xl">
              A planned marketplace for non-medical everyday support. Helpers are independent marketplace participants, not employees of the platform.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">
            <Link href="/terms" className="hover:text-forest">Terms</Link>
            <Link href="/privacy" className="hover:text-forest">Privacy</Link>
            <Link href="/admin" className="hover:text-forest">Admin</Link>
            <Link href="/dashboard" className="hover:text-forest">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
