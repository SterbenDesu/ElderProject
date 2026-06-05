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

        // Green palette — trustworthy, calm, warm.
        // Reference: #2D6A4F, #F0F7F4, #1B4332, #40916C, #F9F4EE, #1B2A23
        linen: "#F0F7F4", // light green background — primary background
        ivory: "#F9F4EE", // cream — card surfaces (unchanged)
        sand: "#C8DDD8", // light green border / divider
        terracotta: {
          DEFAULT: "#2D6A4F", // primary green — buttons, accents
          dark: "#1B4332", // dark green — hover/pressed
          light: "#40916C", // medium green — soft accent
        },
        espresso: {
          DEFAULT: "#1B2A23", // dark green-black — text & footer
          light: "#2D4A3E", // medium dark green
        },
        warmgrey: "#6B8277", // warm green-grey for secondary text
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
