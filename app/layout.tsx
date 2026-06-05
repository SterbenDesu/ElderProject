import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";

// Display serif for editorial headings. Latin subset — Bulgarian headings
// fall back through the font-display stack (Source Sans 3) which covers
// Cyrillic.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

// Body sans — humanist, highly legible, Cyrillic-capable for Bulgarian.
const sourceSans = Source_Sans_3({
  subsets: ["latin", "cyrillic"],
  variable: "--font-source-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Vnuk Pod Naem | Everyday family support marketplace",
  description:
    "Book trusted everyday support for visits, errands, shopping, companionship, home tasks, and accompaniment.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body className="font-sans antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
