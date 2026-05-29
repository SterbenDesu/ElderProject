import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";


export const metadata: Metadata = {
  title: "VnukPodNaem | Non-medical elderly support marketplace",
  description: "A small English-first app shell for non-medical companionship and everyday support services.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
