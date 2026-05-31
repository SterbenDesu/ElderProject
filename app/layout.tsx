import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";


export const metadata: Metadata = {
  title: "VnukPodNaem | Everyday family support marketplace",
  description: "Book trusted everyday support for visits, errands, shopping, companionship, home tasks, and accompaniment.",
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
