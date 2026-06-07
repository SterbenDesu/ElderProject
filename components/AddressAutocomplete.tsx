"use client";

// Address picker for the home search widget — one cohesive component that
// combines a Google Places autocomplete field with an interactive map.
//
// There are TWO ways to set the address, and both feed the exact same state:
//
//   Way 1 — type & select: the user types, picks a suggestion, and the map
//           smoothly pans + zooms (level 15) to that spot with a draggable pin.
//   Way 2 — click & drag:  the user clicks anywhere on the map to drop the pin,
//           or drags the existing pin. On drop/drag-end we reverse-geocode the
//           point to a formatted address and fill the input.
//
// Either way we then run the shared district-matching utility
// (lib/maps/districtMatch) to resolve the Sofia district and store
// { address, lat, lng, regionId } via onSelect. Outside Sofia → a friendly,
// translated inline message and a cleared selection.
//
// The Maps JS API (maps + places + geocoding) is loaded ONCE through
// @googlemaps/js-api-loader (lib/maps/loader) — never a raw <script>, never
// per render. The autocomplete and map are initialised exactly once behind a
// ref guard, so typing never re-initialises them. The key is the
// domain-restricted publishable NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
//
// Way 1 uses the modern google.maps.places.PlaceAutocompleteElement custom
// element (the "gmp-place-autocomplete" web component) — the replacement for
// the deprecated google.maps.places.Autocomplete class, which Google stopped
// offering to new API customers on 1 March 2025. See the migration guide:
// https://developers.google.com/maps/documentation/javascript/places-migration-overview

import { CheckCircle2, ChevronDown, Loader2, MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadRegions } from "@/lib/supabase/caregiverDashboard";
import {
  matchSofiaDistrict,
  type MatchableRegion,
} from "@/lib/maps/districtMatch";
import { loadGoogleMaps } from "@/lib/maps/loader";
import type { LatLng } from "@/lib/maps/sofiaDistricts";

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

// Sofia city centre — the map's default view (zoom 12) before any pin is placed.
const SOFIA_CENTER: LatLng = { lat: 42.6977, lng: 23.3219 };
const DEFAULT_ZOOM = 12;
const SELECTED_ZOOM = 15;

// Custom warm-green map pin (#2D6A4F, the site's primary green). A small inline
// SVG keeps it dependency-free and avoids needing a Cloud-side mapId (which an
// AdvancedMarkerElement would require).
function buildPinIcon(): google.maps.Icon {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
    <path d="M18 0C8.059 0 0 8.059 0 18c0 12.6 16.2 28.65 16.889 29.31a1.6 1.6 0 0 0 2.222 0C19.8 46.65 36 30.6 36 18 36 8.059 27.941 0 18 0Z" fill="#2D6A4F"/>
    <circle cx="18" cy="18" r="6.5" fill="#FFFFFF"/>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(36, 48),
    anchor: new google.maps.Point(18, 48),
  };
}

export function AddressAutocomplete({
  value,
  onSelect,
}: {
  value: AddressSelection | null;
  onSelect: (selection: AddressSelection | null) => void;
}) {
  const { t, language } = useI18n();
  const inputId = useId();

  // The PlaceAutocompleteElement is a Google custom element
  // (google.maps.places.PlaceAutocompleteElement). We mount it into this
  // container instead of binding a class to a plain <input>, which is how the
  // old, now-deprecated google.maps.places.Autocomplete API worked.
  const autocompleteContainerRef = useRef<HTMLDivElement | null>(null);
  const placeAutocompleteRef =
    useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Live Maps objects. Kept in refs so the once-attached event listeners never
  // close over stale state.
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const regionsRef = useRef<MatchableRegion[]>([]);
  // True while we are programmatically committing a location (a map click, a
  // pin drag, or a chosen suggestion) so the element's own "input" events do
  // not wrongly clear the selection we are in the middle of setting.
  const committingRef = useRef(false);

  // The latest onSelect / language, so listeners attached once always call the
  // current versions.
  const onSelectRef = useRef(onSelect);
  const languageRef = useRef(language);
  useEffect(() => {
    onSelectRef.current = onSelect;
    languageRef.current = language;
  });

  // Ref-based init guard: the setup effect runs once, and even if React invokes
  // the effect twice (StrictMode in dev) we never build a second map/autocomplete.
  const didInitRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [matchState, setMatchState] = useState<MatchState>(
    value ? "matched" : "none",
  );
  // Mobile-only collapse. Desktop visibility is handled purely with CSS (md:),
  // so this state only drives the < 768px toggle.
  const [mapOpenMobile, setMapOpenMobile] = useState(false);

  useEffect(() => {
    if (didInitRef.current) {
      return;
    }
    didInitRef.current = true;

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

      // Load Google Maps (maps + places + geocoding) — once, app-wide.
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

      if (
        !isMounted ||
        !autocompleteContainerRef.current ||
        !mapContainerRef.current
      ) {
        return;
      }

      geocoderRef.current = new google.maps.Geocoder();

      // --- The interactive map ---------------------------------------------
      const startCenter = value ? { lat: value.lat, lng: value.lng } : SOFIA_CENTER;
      const map = new google.maps.Map(mapContainerRef.current, {
        center: startCenter,
        zoom: value ? SELECTED_ZOOM : DEFAULT_ZOOM,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: "greedy",
      });
      mapRef.current = map;

      if (value) {
        ensureMarker({ lat: value.lat, lng: value.lng });
      }

      // Way 2a — click anywhere on the map to drop / move the pin.
      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        const location = event.latLng;
        if (location) {
          void commitLocation(
            { lat: location.lat(), lng: location.lng() },
            { animate: false },
          );
        }
      });

      // --- Places autocomplete (Way 1) -------------------------------------
      // The new PlaceAutocompleteElement replaces the deprecated
      // google.maps.places.Autocomplete class (unavailable to new API customers
      // as of 1 March 2025). It is an HTML custom element we append to the DOM,
      // restricted to Bulgaria via `includedRegionCodes` — the new equivalent of
      // the old `componentRestrictions: { country: "bg" }`.
      const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
        includedRegionCodes: ["bg"],
        requestedLanguage: languageRef.current,
        value: value?.address ?? "",
      });
      placeAutocomplete.id = inputId;
      placeAutocomplete.placeholder = t("Start typing your address in Sofia");
      // Sets the element's internal aria-describedby (replaces the old sr-only
      // help text that used to be wired to the <input>).
      placeAutocomplete.description = t(
        "Suggestions are limited to addresses in Bulgaria.",
      );
      // We render our own MapPin / spinner icon over the field, so hide the
      // element's built-in search icon to avoid showing two icons.
      placeAutocomplete.noInputIcon = true;
      autocompleteContainerRef.current.appendChild(placeAutocomplete);
      placeAutocompleteRef.current = placeAutocomplete;

      // Way 1 — the user picks a suggestion. The new event is "gmp-select" (the
      // GA replacement for the old "place_changed"); the selection arrives as
      // event.placePrediction, which we turn into a Place and hydrate with
      // fetchFields (the GA replacement for the old autocomplete.getPlace()).
      placeAutocomplete.addEventListener("gmp-select", async (event) => {
        committingRef.current = true;

        const place = event.placePrediction.toPlace();
        try {
          await place.fetchFields({
            fields: [
              "location",
              "formattedAddress",
              "addressComponents",
              "displayName",
            ],
          });
        } catch {
          // Ignore — handled by the missing-location guard below.
        }

        const location = place.location;
        if (!location) {
          // No geometry (e.g. an incomplete selection).
          committingRef.current = false;
          setMatchState("none");
          onSelectRef.current(null);
          return;
        }

        const coords = { lat: location.lat(), lng: location.lng() };
        const address =
          place.formattedAddress ??
          place.displayName ??
          event.placePrediction.text?.text ??
          "";

        void commitLocation(coords, { animate: true, addressOverride: address });
      });

      // Editing the text by hand invalidates any previously matched district
      // (mirrors the old <input> onChange). Guarded so our own programmatic
      // value updates during a commit don't clear the fresh selection.
      placeAutocomplete.addEventListener("input", () => {
        if (committingRef.current) {
          return;
        }
        setMatchState("none");
        onSelectRef.current(null);
      });

      setStatus("ready");
    }

    // Create the pin once (draggable), or move it if it already exists.
    function ensureMarker(coords: LatLng) {
      if (!mapRef.current) {
        return;
      }
      if (markerRef.current) {
        markerRef.current.setPosition(coords);
        return;
      }

      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: coords,
        draggable: true,
        icon: buildPinIcon(),
        title: t("Drag to adjust the location"),
      });

      // Way 2b — drag the existing pin to fine-tune.
      marker.addListener("dragend", () => {
        const position = marker.getPosition();
        if (position) {
          void commitLocation(
            { lat: position.lat(), lng: position.lng() },
            { animate: false },
          );
        }
      });

      markerRef.current = marker;
    }

    // Reverse geocode a point to a human formatted address. Never throws.
    async function reverseGeocodeAddress(coords: LatLng): Promise<string | null> {
      if (!geocoderRef.current) {
        return null;
      }
      try {
        const response = await geocoderRef.current.geocode({
          location: coords,
          language: languageRef.current,
        });
        return response.results[0]?.formatted_address ?? null;
      } catch {
        return null;
      }
    }

    // The single place both input methods funnel through: move the pin, resolve
    // an address, match the district, and update the shared selection state.
    async function commitLocation(
      coords: LatLng,
      options: { animate: boolean; addressOverride?: string },
    ) {
      committingRef.current = true;
      try {
        setMatchState("matching");
        ensureMarker(coords);

        if (mapRef.current) {
          mapRef.current.panTo(coords);
          if (options.animate) {
            mapRef.current.setZoom(SELECTED_ZOOM);
          }
        }

        const address =
          options.addressOverride ??
          (await reverseGeocodeAddress(coords)) ??
          `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

        // Reflect the resolved address in the autocomplete field. The new
        // element exposes a `value` setter, so map clicks and pin drags can
        // update the visible text exactly like the old <input> did.
        if (placeAutocompleteRef.current) {
          placeAutocompleteRef.current.value = address;
        }

        const match = await matchSofiaDistrict(
          coords,
          regionsRef.current,
          geocoderRef.current ?? undefined,
        );

        if (!match) {
          // Pin stays put so the user can drag it back into Sofia.
          setMatchState("outside");
          onSelectRef.current(null);
          return;
        }

        setMatchState("matched");
        onSelectRef.current({
          address,
          lat: coords.lat,
          lng: coords.lng,
          regionId: match.region.id,
          regionName: match.region.name,
          regionSlug: match.region.slug,
        });
      } finally {
        committingRef.current = false;
      }
    }

    void setup();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the mobile map expands, Google needs a resize nudge (it was laid out at
  // height 0) and a recentre on the current pin / Sofia.
  useEffect(() => {
    if (!mapOpenMobile || !mapRef.current) {
      return;
    }
    google.maps.event.trigger(mapRef.current, "resize");
    const position = markerRef.current?.getPosition();
    mapRef.current.setCenter(
      position ? { lat: position.lat(), lng: position.lng() } : SOFIA_CENTER,
    );
  }, [mapOpenMobile]);

  // Keep the autocomplete element localized when the language changes. Its
  // placeholder/description live inside the element's shadow DOM, so the global
  // i18n DOM sync can't reach them — we update them imperatively instead.
  useEffect(() => {
    const element = placeAutocompleteRef.current;
    if (!element) {
      return;
    }
    element.placeholder = t("Start typing your address in Sofia");
    element.description = t("Suggestions are limited to addresses in Bulgaria.");
    element.requestedLanguage = language;
  }, [language, t]);

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-bold text-espresso">
        {t("Your address")}
      </label>

      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-4 z-10 grid place-items-center text-terracotta">
          {matchState === "matching" ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <MapPin className="size-5" aria-hidden="true" />
          )}
        </span>
        {/* The Google PlaceAutocompleteElement custom element is appended here
            in the setup effect. We never render a plain <input>: the element
            owns its own input, styled to match the widget via ::part(input)
            below (warm green, rounded, matching the field design). */}
        <div
          ref={autocompleteContainerRef}
          className="vnuk-place-autocomplete min-h-[3.25rem] w-full"
        />
        <style>{`
          .vnuk-place-autocomplete gmp-place-autocomplete {
            display: block;
            width: 100%;
            border-radius: 1rem;
            border: 1px solid #C8DDD8; /* sand */
            background-color: #ffffff;
            box-shadow: inset 0 2px 4px 0 rgba(27, 42, 35, 0.06);
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .vnuk-place-autocomplete gmp-place-autocomplete:focus-within {
            border-color: #2D6A4F; /* warm green */
            box-shadow: 0 0 0 3px rgba(45, 106, 79, 0.25);
          }
          .vnuk-place-autocomplete gmp-place-autocomplete::part(input) {
            box-sizing: border-box;
            width: 100%;
            min-height: 3.25rem;
            border: none;
            border-radius: 1rem;
            background: transparent;
            padding: 0.75rem 1rem 0.75rem 3rem;
            font-family: inherit;
            font-size: 1rem;
            color: #1B2A23; /* espresso */
          }
          .vnuk-place-autocomplete gmp-place-autocomplete::part(input):focus {
            outline: none;
          }
        `}</style>
      </div>

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

      {status !== "error" ? (
        <div className="grid gap-2">
          {/* Mobile-only toggle. On desktop the map is always visible (md:hidden). */}
          <button
            type="button"
            onClick={() => setMapOpenMobile((open) => !open)}
            aria-expanded={mapOpenMobile}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-sand bg-white px-4 py-2.5 text-sm font-bold text-espresso shadow-sm transition hover:-translate-y-0.5 hover:border-terracotta/50 hover:bg-ivory hover:shadow-md active:translate-y-0 md:hidden"
          >
            <MapPin className="size-4 text-terracotta" aria-hidden="true" />
            {mapOpenMobile ? t("Hide map") : t("Show map")}
            <ChevronDown
              className={`size-4 transition-transform ${mapOpenMobile ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {/* Map wrapper: collapsed on mobile until toggled; always open on desktop. */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out md:max-h-[260px] md:opacity-100 ${
              mapOpenMobile ? "max-h-[260px] opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="relative">
              <div
                ref={mapContainerRef}
                role="application"
                aria-label={t("Map of Sofia for choosing your address")}
                className="h-[180px] w-full rounded-xl border border-sand bg-linen shadow-inner md:h-[220px]"
              />
              {status === "loading" ? (
                <div
                  className="absolute inset-0 grid place-items-center rounded-xl bg-linen/70 text-sm text-warmgrey"
                  role="status"
                >
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("Loading map…")}
                  </span>
                </div>
              ) : null}
            </div>

            <p className="mt-2 text-xs leading-5 text-warmgrey">
              {t(
                "Or tap the map to drop a pin, then drag it to fine-tune your address.",
              )}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
