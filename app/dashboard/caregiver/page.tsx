"use client";

// Caregiver dashboard — the extra panel an APPROVED caregiver uses to configure
// the data that populates the marketplace: services + prices, schedule, regions.
//
// ACCESS CONTROL (two layers):
//   1. UI: useCurrentUser() (the Phase 2 single source of truth) gates the page
//      on `isCaregiver` — caregiver capability = an approved caregiver_profiles
//      row, NOT a profiles.role, so the universal account model is preserved.
//   2. RLS: every read/write here is owner-scoped in the database, so even a
//      direct API call from a non-caregiver (or another caregiver) is rejected.
// An elder never sees these controls and could not write the data if they tried.

import { PageIntro } from "@/components/PageIntro";
import Link from "next/link";
import { CalendarDays, Coins, Eye, EyeOff, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useCurrentUser } from "@/lib/auth/useCurrentUser";
import {
  loadCaregiverDashboardProfile,
  type CaregiverDashboardProfile,
} from "@/lib/supabase/caregiverDashboard";
import { ServicesPricingSection } from "@/components/caregiver/ServicesPricingSection";
import { ScheduleSection } from "@/components/caregiver/ScheduleSection";
import { RegionsSection } from "@/components/caregiver/RegionsSection";

type TabKey = "services" | "schedule" | "regions";

const TABS: { key: TabKey; label: string; icon: typeof Coins }[] = [
  { key: "services", label: "Services & prices", icon: Coins },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "regions", label: "Regions", icon: MapPin },
];

function NoticeCard({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-sand bg-white text-espresso";
  return (
    <div className={`mt-8 rounded-[2rem] border p-6 shadow-sm ${toneClass}`}>
      <h2 className="font-display text-2xl font-extrabold">{title}</h2>
      <div className="mt-3 text-base leading-7">{children}</div>
    </div>
  );
}

export default function CaregiverDashboardPage() {
  const { status, user, isCaregiver, envError } = useCurrentUser();

  const [activeTab, setActiveTab] = useState<TabKey>("services");
  const [caregiverProfile, setCaregiverProfile] =
    useState<CaregiverDashboardProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { supabase, envError: configError } = getSupabaseBrowserClient();
    if (configError || !supabase) {
      setProfileError(configError);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    const { profile, errorMessage } = await loadCaregiverDashboardProfile(
      supabase,
      userId,
    );

    if (errorMessage) {
      setProfileError(errorMessage);
      setProfileLoading(false);
      return;
    }

    setCaregiverProfile(profile);
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (status === "signed-in" && isCaregiver && user) {
      void loadProfile(user.id);
    }
  }, [status, isCaregiver, user, loadProfile]);

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 lg:px-8 lg:py-16">
      <PageIntro
        eyebrow="Caregiver dashboard"
        title="Caregiver dashboard"
        description="Set up the services, prices, schedule, and regions that appear on your public profile and the marketplace. Each section saves on its own."
      />

      {status === "loading" ? (
        <div
          className="mt-8 rounded-[2rem] border border-sand bg-white p-6 text-espresso shadow-sm"
          role="status"
        >
          Checking your account…
        </div>
      ) : null}

      {status === "unconfigured" ? (
        <NoticeCard title="Setup needed" tone="warning">
          <p>{envError}</p>
        </NoticeCard>
      ) : null}

      {status === "signed-out" ? (
        <NoticeCard title="Please sign in">
          <p>You need to sign in to reach the caregiver dashboard.</p>
          <Link
            href="/login"
            className="mt-5 inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
          >
            Sign in
          </Link>
        </NoticeCard>
      ) : null}

      {status === "signed-in" && !isCaregiver ? (
        <NoticeCard title="Approved caregivers only">
          <p>
            This dashboard is available once an admin approves your caregiver
            application. Standard accounts manage their details from My profile.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/helper/apply"
              className="inline-flex min-h-12 items-center rounded-full bg-terracotta px-6 py-3 font-bold text-white transition hover:bg-terracotta-dark"
            >
              Become a caregiver
            </Link>
            <Link
              href="/account"
              className="inline-flex min-h-12 items-center rounded-full border border-sand bg-white px-6 py-3 font-bold text-terracotta transition hover:bg-linen"
            >
              My profile
            </Link>
          </div>
        </NoticeCard>
      ) : null}

      {status === "signed-in" && isCaregiver ? (
        <div className="mt-8">
          {profileLoading ? (
            <div
              className="rounded-[2rem] border border-sand bg-white p-6 text-espresso shadow-sm"
              role="status"
            >
              Loading your caregiver profile…
            </div>
          ) : profileError ? (
            <NoticeCard title="Could not load your caregiver profile" tone="warning">
              <p>{profileError}</p>
            </NoticeCard>
          ) : !caregiverProfile ? (
            <NoticeCard title="Caregiver profile missing" tone="warning">
              <p>
                Your account is approved as a caregiver, but no caregiver profile
                row was found. Please ask an admin to repair your approved
                caregiver profile.
              </p>
            </NoticeCard>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 rounded-[2rem] border border-sand bg-ivory p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-terracotta text-lg font-bold text-white">
                  {caregiverProfile.display_name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-espresso">
                    {caregiverProfile.display_name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-espresso-light">
                    {caregiverProfile.is_visible ? (
                      <>
                        <Eye className="size-4 text-terracotta" aria-hidden="true" />
                        Visible on the marketplace
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-4" aria-hidden="true" />
                        Hidden until an admin makes you visible
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div
                className="mt-6 flex flex-wrap gap-2"
                role="tablist"
                aria-label="Caregiver dashboard sections"
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.key)}
                      className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition ${
                        active
                          ? "bg-terracotta text-white shadow-sm"
                          : "border border-sand bg-white text-terracotta hover:bg-linen"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                {activeTab === "services" ? (
                  <ServicesPricingSection
                    caregiverProfileId={caregiverProfile.id}
                  />
                ) : null}
                {activeTab === "schedule" ? (
                  <ScheduleSection caregiverProfileId={caregiverProfile.id} />
                ) : null}
                {activeTab === "regions" ? (
                  <RegionsSection
                    profile={caregiverProfile}
                    onProfileChange={(coversWholeCity) =>
                      setCaregiverProfile((current) =>
                        current
                          ? { ...current, covers_whole_city: coversWholeCity }
                          : current,
                      )
                    }
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
