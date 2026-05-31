"use client";

import { useEffect, useState } from "react";
import {
  isSupportedLanguage,
  languageStorageKey,
  translations,
  type SupportedLanguage,
} from "@/lib/i18n";

const languageOptions: Array<{
  value: SupportedLanguage;
  shortLabel: string;
  flag: string;
}> = [
  { value: "en", shortLabel: "EN", flag: "🇬🇧" },
  { value: "bg", shortLabel: "BG", flag: "🇧🇬" },
];

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const [language, setLanguage] = useState<SupportedLanguage>("en");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);

    if (isSupportedLanguage(storedLanguage)) {
      setLanguage(storedLanguage);
    }
  }, []);

  function handleLanguageChange(nextLanguage: SupportedLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(languageStorageKey, nextLanguage);
    window.dispatchEvent(
      new CustomEvent("vnukpodnaem:language-change", {
        detail: { language: nextLanguage },
      }),
    );
  }

  return (
    <div
      className={
        compact
          ? "grid gap-2"
          : "flex min-h-12 items-center gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm"
      }
      aria-label={translations[language].header.languageLabel}
    >
      {languageOptions.map((option) => {
        const isSelected = option.value === language;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleLanguageChange(option.value)}
            className={
              compact
                ? `flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${
                    isSelected
                      ? "bg-forest text-white"
                      : "bg-cream text-stone-700 hover:bg-sage hover:text-forest"
                  }`
                : `flex min-h-10 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition ${
                    isSelected
                      ? "bg-forest text-white shadow-sm"
                      : "text-stone-600 hover:bg-sage hover:text-forest"
                  }`
            }
            aria-pressed={isSelected}
            title={translations[option.value].languageName}
          >
            <span aria-hidden="true">{option.flag}</span>
            <span>{option.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
