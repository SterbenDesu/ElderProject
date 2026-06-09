"use client";

// A rich marketplace caregiver card (left-hand results list), modelled on the
// buddyguard.bg results cards: photo, name, badges, matched-service tags, star
// rating + review count, district, "from X лв.", and a short truncated bio.
//
// Privacy: shows only a privacy-safe public name (first name + last initial)
// and a district — never a phone number, email, or full last name. The whole
// card is a link to the caregiver's public profile.
//
// Card ↔ pin linking: the card reports hover via onHover, lifts/highlights when
// the matching map pin is hovered or selected (highlighted), and exposes its DOM
// node through a ref so a pin click can scroll it into view.

import Link from "next/link";
import { forwardRef } from "react";
import { BadgeCheck, CalendarClock, Heart, MapPin, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatLevaAmount } from "@/lib/supabase/caregiverDashboard";
import type { MarketplaceCaregiver } from "@/lib/supabase/marketplace";
import { toPublicDisplayName } from "@/lib/marketplace/publicName";

function CaregiverPhoto() {
  // Warm green gradient placeholder (never a flat grey box). No real photo is
  // stored for caregivers in this phase.
  return (
    <div className="grid size-full place-items-center bg-gradient-to-br from-sage via-cream to-white">
      <div className="grid size-12 place-items-center rounded-full bg-white text-forest shadow-sm ring-1 ring-moss/20">
        <svg
          viewBox="0 0 48 48"
          className="size-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="24" cy="18" r="8" />
          <path d="M10 40c2.6-8 8-12 14-12s11.4 4 14 12" />
        </svg>
      </div>
    </div>
  );
}

export type CaregiverCardProps = {
  caregiver: MarketplaceCaregiver;
  detailHref: string;
  /** True when the matching map pin is hovered or selected. */
  highlighted: boolean;
  /** Soft "limited availability" hint for the searched dates. */
  limitedAvailability: boolean;
  onHover: (id: string | null) => void;
};

export const CaregiverCard = forwardRef<HTMLAnchorElement, CaregiverCardProps>(
  function CaregiverCard(
    { caregiver, detailHref, highlighted, limitedAvailability, onHover },
    ref,
  ) {
    const { t } = useI18n();

    const isVolunteer = caregiver.badge === "volunteer";
    const locationLabel = caregiver.covers_whole_city
      ? t("Whole city")
      : caregiver.regionNames.length > 0
        ? caregiver.regionNames.join(", ")
        : t("Location not set");

    const reviewLabel =
      caregiver.rating_count > 0
        ? `${caregiver.rating_count} ${t(caregiver.rating_count === 1 ? "review" : "reviews")}`
        : t("No reviews yet");

    return (
      <Link
        ref={ref}
        href={detailHref}
        onMouseEnter={() => onHover(caregiver.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(caregiver.id)}
        onBlur={() => onHover(null)}
        data-caregiver-id={caregiver.id}
        className={`group flex gap-4 rounded-[1.5rem] border bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${
          highlighted
            ? "border-forest ring-2 ring-forest/40 shadow-lg"
            : "border-moss/20 shadow-stone-200/70 hover:border-moss/50"
        }`}
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-[1.1rem] ring-1 ring-moss/15 sm:size-28">
          <CaregiverPhoto />
          <span
            className={`absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] shadow-sm ${
              isVolunteer ? "bg-clay/15 text-clay" : "bg-forest text-white"
            }`}
          >
            {isVolunteer ? (
              <Heart className="size-3" aria-hidden="true" />
            ) : (
              <BadgeCheck className="size-3" aria-hidden="true" />
            )}
            {isVolunteer ? t("Volunteer") : t("Verified")}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-lg font-bold text-forest">
              {toPublicDisplayName(caregiver.display_name)}
            </h3>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-forest">
              <Star
                className={`size-4 ${caregiver.rating_avg != null ? "fill-clay text-clay" : "text-stone-300"}`}
                aria-hidden="true"
              />
              {caregiver.rating_avg != null ? caregiver.rating_avg.toFixed(1) : "—"}
              <span className="ml-1 text-xs font-semibold text-stone-500">
                ({reviewLabel})
              </span>
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
            <MapPin className="size-4 shrink-0 text-moss" aria-hidden="true" />
            <span className="truncate">{locationLabel}</span>
          </p>

          {caregiver.matchedServices.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {caregiver.matchedServices.slice(0, 3).map((service) => (
                <li
                  key={service.id}
                  className="rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold text-forest"
                >
                  {t(service.name)}
                </li>
              ))}
              {caregiver.matchedServices.length > 3 ? (
                <li className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-stone-600">
                  +{caregiver.matchedServices.length - 3}
                </li>
              ) : null}
            </ul>
          ) : null}

          {caregiver.bio ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
              {caregiver.bio}
            </p>
          ) : null}

          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <p className="text-sm font-semibold text-stone-700">
              {caregiver.lowestPriceMinor != null ? (
                <>
                  <span className="text-stone-500">{t("from")} </span>
                  <span className="text-lg font-bold text-forest">
                    {formatLevaAmount(caregiver.lowestPriceMinor)} {t("лв.")}
                  </span>
                </>
              ) : (
                <span className="text-stone-500">{t("Price on request")}</span>
              )}
            </p>
            <span className="inline-flex min-h-9 items-center justify-center rounded-full bg-forest px-4 py-1.5 text-sm font-bold text-white shadow-sm transition group-hover:bg-stone-800">
              {t("View profile")}
            </span>
          </div>

          {limitedAvailability ? (
            <p className="mt-2 inline-flex items-center gap-1.5 self-start rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
              <CalendarClock className="size-3.5" aria-hidden="true" />
              {t("Limited availability for your dates")}
            </p>
          ) : null}
        </div>
      </Link>
    );
  },
);
