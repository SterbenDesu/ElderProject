"use client";

// Active-filter chips + an in-place edit panel for the marketplace (/helpers).
//
// The elder can change services, district, and dates here WITHOUT going back to
// the home page. Every change rebuilds the URL query (via buildCriteriaQuery)
// and navigates, so the marketplace re-reads the params, re-runs the search, and
// the new state is shareable + survives a refresh and the auth round-trip.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Heart, MapPin, SlidersHorizontal, Tag, X } from "lucide-react";
import {
  formatServiceLabel,
  serviceOptions,
  ServiceIcon,
} from "@/components/HomeSearchCard";
import { useI18n } from "@/lib/i18n";
import {
  buildCriteriaQuery,
  emptyCriteria,
  hasAnyCriteria,
  type MarketplaceCriteria,
} from "@/lib/marketplace/criteria";
import type { RegionRow } from "@/lib/supabase/caregiverDashboard";

function formatDateForDisplay(value: string, locale = "en") {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function MarketplaceFilters({
  criteria,
  regions,
}: {
  criteria: MarketplaceCriteria;
  regions: RegionRow[];
}) {
  const router = useRouter();
  const { t, language } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<MarketplaceCriteria>(criteria);

  // Keep the edit panel in sync if the URL changes underneath it (e.g. a chip
  // was removed, or the back button was used).
  useEffect(() => {
    setDraft(criteria);
  }, [criteria]);

  function applyCriteria(next: MarketplaceCriteria) {
    const query = buildCriteriaQuery(next);
    router.push(query ? `/helpers?${query}` : "/helpers");
  }

  function removeService(slug: string) {
    applyCriteria({
      ...criteria,
      services: criteria.services.filter((value) => value !== slug),
    });
  }

  function removeDistrict() {
    // Clearing the district also drops the address/coordinates it came from, so
    // the chips never show a stale precise address for a different district.
    applyCriteria({
      ...criteria,
      district: "",
      districtName: "",
      regionSlug: "",
      address: "",
      lat: "",
      lng: "",
    });
  }

  function removeDates() {
    applyCriteria({ ...criteria, startDate: "", endDate: "" });
  }

  function removePriceMax() {
    applyCriteria({ ...criteria, priceMax: "" });
  }

  function removeVerifiedOnly() {
    applyCriteria({ ...criteria, verifiedOnly: false });
  }

  function removeVolunteerOnly() {
    applyCriteria({ ...criteria, volunteerOnly: false });
  }

  function toggleDraftService(slug: string) {
    setDraft((current) => ({
      ...current,
      services: current.services.includes(slug)
        ? current.services.filter((value) => value !== slug)
        : [...current.services, slug],
    }));
  }

  function changeDraftDistrict(regionId: string) {
    const region = regions.find((item) => item.id === regionId);
    setDraft((current) => ({
      ...current,
      district: region ? region.id : "",
      districtName: region ? region.name : "",
      regionSlug: region ? region.slug : "",
      // A district chosen from the dropdown is not tied to a precise address.
      address: region ? "" : current.address,
      lat: region ? "" : current.lat,
      lng: region ? "" : current.lng,
    }));
  }

  function changeDraftEndDate(value: string) {
    setDraft((current) => ({
      ...current,
      endDate: current.startDate && value && value < current.startDate ? current.startDate : value,
    }));
  }

  const dateChipLabel = (() => {
    if (criteria.startDate && criteria.endDate && criteria.endDate !== criteria.startDate) {
      return `${formatDateForDisplay(criteria.startDate, language)} – ${formatDateForDisplay(criteria.endDate, language)}`;
    }
    return formatDateForDisplay(criteria.startDate || criteria.endDate, language);
  })();

  const showChips = hasAnyCriteria(criteria);

  return (
    <div className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-clay">
            {t("Your search")}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-forest">
            {showChips ? t("Active filters") : t("All caregivers")}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((open) => !open)}
          aria-expanded={isEditing}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sage px-4 py-2 text-sm font-semibold text-forest transition hover:bg-cream"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {isEditing ? t("Hide filters") : t("Edit filters")}
        </button>
      </div>

      {showChips ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {criteria.services.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                onClick={() => removeService(slug)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-moss/30 bg-sage px-3 py-1.5 text-sm font-semibold text-forest transition hover:bg-cream"
              >
                {formatServiceLabel(slug, t)}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Remove filter")}</span>
              </button>
            </li>
          ))}
          {criteria.districtName ? (
            <li>
              <button
                type="button"
                onClick={removeDistrict}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-moss/30 bg-sage px-3 py-1.5 text-sm font-semibold text-forest transition hover:bg-cream"
              >
                <MapPin className="size-3.5" aria-hidden="true" />
                {criteria.districtName}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Remove filter")}</span>
              </button>
            </li>
          ) : null}
          {dateChipLabel ? (
            <li>
              <button
                type="button"
                onClick={removeDates}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-moss/30 bg-sage px-3 py-1.5 text-sm font-semibold text-forest transition hover:bg-cream"
              >
                {dateChipLabel}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Remove filter")}</span>
              </button>
            </li>
          ) : null}
          {criteria.priceMax ? (
            <li>
              <button
                type="button"
                onClick={removePriceMax}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-moss/30 bg-sage px-3 py-1.5 text-sm font-semibold text-forest transition hover:bg-cream"
              >
                <Tag className="size-3.5" aria-hidden="true" />
                {t("up to")} {criteria.priceMax} {t("лв.")}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Remove filter")}</span>
              </button>
            </li>
          ) : null}
          {criteria.verifiedOnly ? (
            <li>
              <button
                type="button"
                onClick={removeVerifiedOnly}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-moss/30 bg-sage px-3 py-1.5 text-sm font-semibold text-forest transition hover:bg-cream"
              >
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                {t("Verified only")}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Remove filter")}</span>
              </button>
            </li>
          ) : null}
          {criteria.volunteerOnly ? (
            <li>
              <button
                type="button"
                onClick={removeVolunteerOnly}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-moss/30 bg-sage px-3 py-1.5 text-sm font-semibold text-forest transition hover:bg-cream"
              >
                <Heart className="size-3.5" aria-hidden="true" />
                {t("Volunteers only")}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Remove filter")}</span>
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              onClick={() => applyCriteria(emptyCriteria)}
              className="inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-sm font-semibold text-clay underline transition hover:text-forest"
            >
              {t("Clear all")}
            </button>
          </li>
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-6 text-stone-600">
          {t("Showing every approved caregiver. Add services or a district to narrow the list.")}
        </p>
      )}

      {isEditing ? (
        <form
          className="mt-6 grid gap-5 border-t border-stone-200 pt-6"
          onSubmit={(event) => {
            event.preventDefault();
            applyCriteria(draft);
            setIsEditing(false);
          }}
        >
          <fieldset>
            <legend className="text-sm font-bold text-forest">{t("Service types")}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {serviceOptions.map((service) => {
                const isSelected = draft.services.includes(service.value);
                return (
                  <label key={service.value} className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDraftService(service.value)}
                      className="peer sr-only"
                    />
                    <span className="flex min-h-12 items-center gap-2.5 rounded-2xl border border-sand bg-white px-3 py-2.5 text-sm font-semibold text-forest shadow-sm transition peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest hover:bg-sage">
                      <ServiceIcon name={service.icon} className="size-4 shrink-0" />
                      {t(service.label)}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-forest">
              {t("District")}
              <select
                value={draft.district}
                onChange={(event) => changeDraftDistrict(event.target.value)}
                className="min-h-[3rem] rounded-2xl border border-sand bg-white px-3 py-2.5 text-base font-normal text-forest transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              >
                <option value="">{t("Any district")}</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-forest">
              {t("Start date")}
              <input
                type="date"
                value={draft.startDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, startDate: event.target.value }))
                }
                className="min-h-[3rem] rounded-2xl border border-sand bg-white px-3 py-2.5 text-base font-normal text-forest transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-forest">
              {t("End date")}
              <input
                type="date"
                value={draft.endDate}
                min={draft.startDate || undefined}
                onChange={(event) => changeDraftEndDate(event.target.value)}
                className="min-h-[3rem] rounded-2xl border border-sand bg-white px-3 py-2.5 text-base font-normal text-forest transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <label className="grid gap-2 text-sm font-bold text-forest">
              {t("Maximum price (лв.)")}
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder={t("Any price")}
                value={draft.priceMax}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priceMax: event.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                className="min-h-[3rem] rounded-2xl border border-sand bg-white px-3 py-2.5 text-base font-normal text-forest transition focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20"
              />
            </label>

            <label className="flex min-h-[3rem] cursor-pointer items-center gap-2.5 rounded-2xl border border-sand bg-white px-3 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage">
              <input
                type="checkbox"
                checked={draft.verifiedOnly}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, verifiedOnly: event.target.checked }))
                }
                className="size-4 accent-forest"
              />
              <BadgeCheck className="size-4 text-forest" aria-hidden="true" />
              {t("Verified only")}
            </label>

            <label className="flex min-h-[3rem] cursor-pointer items-center gap-2.5 rounded-2xl border border-sand bg-white px-3 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage">
              <input
                type="checkbox"
                checked={draft.volunteerOnly}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, volunteerOnly: event.target.checked }))
                }
                className="size-4 accent-clay"
              />
              <Heart className="size-4 text-clay" aria-hidden="true" />
              {t("Volunteers only")}
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800"
            >
              {t("Apply filters")}
            </button>
            <button
              type="button"
              onClick={() => setDraft(emptyCriteria)}
              className="inline-flex min-h-12 items-center rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-forest transition hover:bg-sage"
            >
              {t("Clear filters")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
