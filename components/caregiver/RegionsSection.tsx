"use client";

// Section 3 of the caregiver dashboard: which Sofia districts you serve, or a
// single "Whole city" toggle. Districts are stored in caregiver_regions
// (owner-scoped by RLS). "Whole city" is the covers_whole_city flag on
// caregiver_profiles, changed through the approved-caregiver-only RPC.

import { Building2, CircleCheck, Loader2, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { RegionMiniMap } from "@/components/caregiver/RegionMiniMap";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  loadCaregiverRegionIds,
  loadRegions,
  saveCaregiverRegions,
  setCoversWholeCity,
  type CaregiverDashboardProfile,
  type RegionRow,
} from "@/lib/supabase/caregiverDashboard";

const cardClass =
  "rounded-[2rem] border border-sand bg-white p-6 shadow-sm sm:p-8";
const primaryButtonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3 text-base font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60";

export function RegionsSection({
  profile,
  onProfileChange,
}: {
  profile: CaregiverDashboardProfile;
  onProfileChange: (coversWholeCity: boolean) => void;
}) {
  const { t } = useI18n();
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [wholeCity, setWholeCity] = useState(profile.covers_whole_city);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setLoadError(envError);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const [regionsResult, selectedResult] = await Promise.all([
      loadRegions(supabase),
      loadCaregiverRegionIds(supabase, profile.id),
    ]);

    const firstError =
      regionsResult.errorMessage || selectedResult.errorMessage;
    if (firstError) {
      setLoadError(firstError);
      setIsLoading(false);
      return;
    }

    setRegions(regionsResult.data);
    setSelected(new Set(selectedResult.data));
    setExistingIds(selectedResult.data);
    setIsLoading(false);
  }, [profile.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleRegion(regionId: string) {
    setSuccess(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  }

  function toggleWholeCity() {
    setSuccess(null);
    setWholeCity((current) => !current);
  }

  async function handleSave() {
    setError(null);
    setSuccess(null);

    const { supabase, envError } = getSupabaseBrowserClient();
    if (envError || !supabase) {
      setError(envError);
      return;
    }

    setSaving(true);

    // Persist the whole-city flag if it changed.
    if (wholeCity !== profile.covers_whole_city) {
      const { errorMessage } = await setCoversWholeCity(
        supabase,
        profile,
        wholeCity,
      );
      if (errorMessage) {
        setSaving(false);
        setError(`${t("Could not update the whole-city setting")}: ${errorMessage}`);
        return;
      }
      onProfileChange(wholeCity);
    }

    // Persist district choices (kept even when whole-city is on, so toggling
    // it off later restores the explicit list).
    const { errorMessage } = await saveCaregiverRegions(
      supabase,
      profile.id,
      Array.from(selected),
      existingIds,
    );
    if (errorMessage) {
      setSaving(false);
      setError(`${t("Could not save your districts")}: ${errorMessage}`);
      return;
    }

    setSaving(false);
    setSuccess(t("Your operating regions were saved."));
    await load();
  }

  return (
    <div className={cardClass}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-linen text-terracotta">
          <MapPin className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-extrabold text-espresso">
            {t("My operating regions")}
          </h2>
          <p className="mt-1 text-base leading-7 text-espresso-light">
            {t(
              "Choose the Sofia districts you serve, or turn on Whole city to cover all of them.",
            )}
          </p>
        </div>
      </div>

      {/* Whole-city is the headline choice — kept large, full-width, and
          visually distinct from the district checklist below. */}
      <button
        type="button"
        onClick={toggleWholeCity}
        aria-pressed={wholeCity}
        className={`mt-6 flex w-full items-center justify-between gap-4 rounded-3xl border-2 p-5 text-left shadow-sm transition hover:-translate-y-0.5 ${
          wholeCity
            ? "border-terracotta bg-terracotta text-white shadow-terracotta/30"
            : "border-sand bg-ivory text-espresso hover:bg-linen"
        }`}
      >
        <span className="flex items-center gap-3">
          <Building2 className="size-7 shrink-0" aria-hidden="true" />
          <span>
            <span className="block text-xl font-extrabold">{t("Whole city")}</span>
            <span
              className={`block text-sm ${wholeCity ? "text-white/80" : "text-espresso-light"}`}
            >
              {wholeCity
                ? t("Active — you cover every Sofia district.")
                : t("Serve every Sofia district.")}
            </span>
          </span>
        </span>
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-full border-2 ${
            wholeCity ? "border-white bg-white/20" : "border-sand bg-white"
          }`}
        >
          {wholeCity ? <CircleCheck className="size-6" aria-hidden="true" /> : null}
        </span>
      </button>

      {isLoading ? (
        <p
          className="mt-6 flex items-center gap-2 text-espresso-light"
          role="status"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          {t("Loading districts…")}
        </p>
      ) : loadError ? (
        <p
          className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
          role="alert"
        >
          {loadError}
        </p>
      ) : (
        <fieldset
          className={`mt-6 transition ${wholeCity ? "opacity-50" : ""}`}
          disabled={wholeCity}
        >
          <legend className="text-sm font-bold uppercase tracking-wide text-espresso-light">
            {t("Districts")}
          </legend>
          <p className="mt-1 text-sm text-espresso-light">
            {t("The dot shows roughly where each district sits in Sofia.")}
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((region) => {
              const checked = selected.has(region.id);
              return (
                <li key={region.id}>
                  <label
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked
                        ? "border-terracotta/50 bg-linen"
                        : "border-sand bg-ivory hover:bg-linen"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRegion(region.id)}
                      className="size-5 accent-terracotta"
                    />
                    <RegionMiniMap
                      slug={region.slug}
                      className="size-9 shrink-0"
                    />
                    <span className="text-base font-semibold text-espresso">
                      {region.name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {error ? (
        <p
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"
          role="status"
        >
          <CircleCheck className="size-4" aria-hidden="true" />
          {success}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || isLoading}
        className={`mt-6 ${primaryButtonClass}`}
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {saving ? t("Saving…") : t("Save regions")}
      </button>
    </div>
  );
}
