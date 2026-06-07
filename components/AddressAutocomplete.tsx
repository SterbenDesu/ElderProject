"use client";

// Google Maps Places Autocomplete field for the home search widget.
//
// - Suggestions are restricted to Bulgaria (componentRestrictions country 'bg').
// - When the user picks an address we silently reverse-geocode it to a Sofia
//   district from the `regions` table (see lib/maps/districtMatch).
// - If the address is outside Sofia (or no district matches), we surface a
//   friendly, translated inline message and clear the selection.
//
// The Maps JS API is loaded through @googlemaps/js-api-loader (lib/maps/loader),
// never via a raw <script> tag. The key is the domain-restricted publishable
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.

import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadRegions } from "@/lib/supabase/caregiverDashboard";
import {
  matchSofiaDistrict,
  type MatchableRegion,
} from "@/lib/maps/districtMatch";
import { loadGoogleMaps } from "@/lib/maps/loader";

export type AddressSelection = {
  /** Full formatted address, for display. */
  address: string;
  lat: number;
  lng: number;
  /** Matched regions.id (the district filter the marketplace will use). */
  regionId: string;
  regionName: string;
  regionSlug: string;
};

type MatchState = "none" | "matching" | "matched" | "outside";

export function AddressAutocomplete({
  value,
  onSelect,
}: {
  value: AddressSelection | null;
  onSelect: (selection: AddressSelection | null) => void;
}) {
  const { t } = useI18n();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Refs keep the latest data available inside the Maps event listener, which
  // is attached once and would otherwise close over stale state.
  const regionsRef = useRef<MatchableRegion[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState>(
    value ? "matched" : "none",
  );

  useEffect(() => {
    let isMounted = true;

    async function setup() {
      // Load the Sofia districts (public, RLS-readable) for matching.
      const { supabase, envError } = getSupabaseBrowserClient();
      if (!envError && supabase) {
        const regionsResult = await loadRegions(supabase);
        if (isMounted && !regionsResult.errorMessage) {
          regionsRef.current = regionsResult.data;
        }
      }

      // Load Google Maps (places + geocoding).
      try {
        await loadGoogleMaps();
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : t("Address search is unavailable right now."),
          );
          setStatus("error");
        }
        return;
      }

      if (!isMounted || !inputRef.current) {
        return;
      }

      geocoderRef.current = new google.maps.Geocoder();

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "bg" },
        fields: ["formatted_address", "geometry", "address_components", "name"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const location = place.geometry?.location;

        if (!location) {
          // User pressed Enter without choosing a suggestion.
          setMatchState("none");
          onSelect(null);
          return;
        }

        const coords = { lat: location.lat(), lng: location.lng() };
        const address =
          place.formatted_address ?? place.name ?? inputRef.current?.value ?? "";

        setMatchState("matching");

        void matchSofiaDistrict(
          coords,
          regionsRef.current,
          geocoderRef.current ?? undefined,
        ).then((match) => {
          if (!match) {
            setMatchState("outside");
            onSelect(null);
            return;
          }

          setMatchState("matched");
          onSelect({
            address,
            lat: coords.lat,
            lng: coords.lng,
            regionId: match.region.id,
            regionName: match.region.name,
            regionSlug: match.region.slug,
          });
        });
      });

      setStatus("ready");
    }

    void setup();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-bold text-espresso">
        {t("Your address")}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-terracotta">
          {matchState === "matching" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <MapPin className="size-5" aria-hidden="true" />
          )}
        </span>
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          defaultValue={value?.address ?? ""}
          placeholder={t("Start typing your address in Sofia")}
          onChange={() => {
            // Editing the text invalidates any previously matched district.
            if (matchState !== "none") {
              setMatchState("none");
            }
            onSelect(null);
          }}
          disabled={status === "error"}
          aria-describedby={`${inputId}-help`}
          className="min-h-[3.25rem] w-full rounded-2xl border border-sand bg-white px-4 py-3 pl-12 text-base font-normal text-espresso shadow-inner shadow-linen transition focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/25 disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      <p id={`${inputId}-help`} className="sr-only">
        {t("Suggestions are limited to addresses in Bulgaria.")}
      </p>

      {status === "loading" ? (
        <p className="flex items-center gap-2 text-sm text-warmgrey" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("Loading address search…")}
        </p>
      ) : null}

      {status === "error" && loadError ? (
        <p
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      {matchState === "outside" ? (
        <p
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
          role="alert"
        >
          {t("We currently serve Sofia — please enter a Sofia address")}
        </p>
      ) : null}

      {matchState === "matched" && value ? (
        <p
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800"
          role="status"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          {t("District")}: {value.regionName}
        </p>
      ) : null}
    </div>
  );
}
