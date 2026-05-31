"use client";

import { translations, type SupportedLanguage, useI18n } from "@/lib/i18n";

const languageOptions: Record<
  SupportedLanguage,
  { next: SupportedLanguage; label: string; compactLabel: string }
> = {
  en: { next: "bg", label: "EN", compactLabel: "English" },
  bg: { next: "en", label: "BG", compactLabel: "Български" },
};

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useI18n();
  const activeOption = languageOptions[language];
  const nextLanguage = activeOption.next;

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      className={
        compact
          ? "flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-bold text-forest shadow-sm transition hover:border-moss/50 hover:bg-sage"
          : "flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm font-extrabold text-forest shadow-sm transition hover:border-moss/50 hover:bg-sage hover:shadow-md"
      }
      aria-label={translations[language].header.languageLabel}
      title={translations[language].header.switchTo}
    >
      <span className="grid size-6 place-items-center rounded-full bg-sage text-[0.68rem] font-black text-forest">
        {activeOption.label}
      </span>
      <span>{compact ? activeOption.compactLabel : activeOption.label}</span>
    </button>
  );
}
