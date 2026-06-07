// Centralised Google Maps JavaScript API loader.
//
// We load Maps through the official @googlemaps/js-api-loader package (never a
// raw <script> tag in the HTML). The browser key lives in
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — it is a *publishable* key that Google
// restricts to our domain on their side, so it is safe to expose with the
// NEXT_PUBLIC_ prefix. No server-side / unrestricted key is used anywhere.
//
// Libraries:
//   - "places"    → Places Autocomplete on the home search widget.
//   - "geocoding" → reverse geocoding for district matching (lib/maps/districtMatch).

export const googleMapsMissingKeyMessage =
  "Address search is not configured yet. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local for local development and to the Vercel environment variables for deployment.";

export function getGoogleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

// Cache the in-flight/finished load so the API is only ever loaded once per page.
let configured = false;
let loadPromise: Promise<void> | null = null;

/**
 * Ensure the Google Maps JS API (places + geocoding) is loaded.
 * Resolves once `google.maps.places` and `google.maps.Geocoder` are usable.
 * Rejects with a friendly message when the key is missing.
 */
export async function loadGoogleMaps(): Promise<void> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error(googleMapsMissingKeyMessage);
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      // Imported dynamically (browser-only): the package touches `window` at
      // module-eval time, which would break server prerendering if imported
      // statically. loadGoogleMaps() is only ever called from the browser.
      const { importLibrary, setOptions } = await import(
        "@googlemaps/js-api-loader"
      );

      // Configure the bootstrap once, before any library import.
      if (!configured) {
        setOptions({ key: apiKey, v: "weekly" });
        configured = true;
      }

      await Promise.all([importLibrary("places"), importLibrary("geocoding")]);
    })().catch((error) => {
      // Let the next attempt retry instead of caching a rejected promise.
      loadPromise = null;
      throw error;
    });
  }

  return loadPromise;
}
