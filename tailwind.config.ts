import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Existing tokens — kept so other pages keep rendering correctly.
        cream: "#fbf7ef",
        sage: "#edf4ee",
        forest: "#28433a",
        moss: "#647a58",
        clay: "#b87453",

        // Warm redesign palette (buddyguard.bg level of warmth).
        // Reference: #F5EFE6, #C4752A, #2C1A0E, #F9F4EE
        linen: "#F5EFE6", // warm cream — primary background
        ivory: "#F9F4EE", // lightest cream — card surfaces
        sand: "#EAD9C2", // soft warm border / divider
        terracotta: {
          DEFAULT: "#C4752A", // warm amber/terracotta — primary
          dark: "#A8631F", // hover/pressed
          light: "#E0A05A", // soft accent
        },
        espresso: {
          DEFAULT: "#2C1A0E", // deep warm brown — text & footer
          light: "#4A3525", // muted warm brown
        },
        warmgrey: "#8C7B6B", // warm muted grey for secondary text
      },
      fontFamily: {
        // Body — humanist, highly legible (Cyrillic-capable for Bulgarian).
        sans: [
          "var(--font-source-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        // Display headings — Fraunces, with a Cyrillic-capable fallback so
        // translated Bulgarian headings degrade gracefully.
        display: [
          "var(--font-fraunces)",
          "var(--font-source-sans)",
          "Georgia",
          "Cambria",
          "serif",
        ],
      },
      keyframes: {
        // Slow ambient shimmer for the hero gradient.
        shimmer: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        shimmer: "shimmer 16s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
