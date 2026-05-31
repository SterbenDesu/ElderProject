"use client";

import { translations, type SupportedLanguage, useI18n } from "@/lib/i18n";

const languageOptions: Array<{ value: SupportedLanguage; label: string }> = [
  { value: "en", label: "EN" },
  { value: "bg", label: "BG" },
];

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n();

  return (
    <div
      className={
        compact
          ? "grid grid-cols-2 gap-2"
          : "inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm"
      }
      role="group"
      aria-label={translations[language].header.languageLabel}
    >
      {languageOptions.map((option) => {
        const isActive = option.value === language;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            aria-pressed={isActive}
            className={
              compact
                ? `min-h-11 rounded-full border px-4 py-2 text-sm font-extrabold transition ${
                    isActive
                      ? "border-forest bg-forest text-white shadow-sm"
                      : "border-stone-200 bg-white text-forest hover:border-moss/50 hover:bg-sage"
                  }`
                : `min-h-9 min-w-10 rounded-full px-3 py-1.5 text-xs font-extrabold tracking-[0.08em] transition ${
                    isActive
                      ? "bg-forest text-white shadow-sm"
                      : "text-stone-600 hover:bg-sage hover:text-forest"
                  }`
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
