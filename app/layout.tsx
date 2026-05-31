import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--font-nunito-sans",
  display: "swap",
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
    <html lang="en" className={nunitoSans.variable}>
      <body className="font-sans antialiased">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
