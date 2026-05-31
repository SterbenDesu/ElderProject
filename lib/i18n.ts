import { bg } from "@/lib/translations/bg";
import { en } from "@/lib/translations/en";

export const supportedLanguages = ["en", "bg"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageStorageKey = "vnukpodnaem-language";

export const translations = { en, bg } as const;

export function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value === "en" || value === "bg";
}
