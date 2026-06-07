// Make the global `google.maps` namespace from @types/google.maps available
// across the whole TypeScript program. `tsc` auto-discovers it from
// node_modules/@types, but the Next.js build worker does not always include
// ambient global type packages, so we reference it explicitly here.
/// <reference types="google.maps" />
