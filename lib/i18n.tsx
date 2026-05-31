"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { bg, phraseTranslations } from "@/lib/translations/bg";
import { en } from "@/lib/translations/en";

export const supportedLanguages = ["en", "bg"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageStorageKey = "vnukpodnaem-language";
export const languageCookieKey = "vnukpodnaem_language";

export const translations = { en, bg } as const;

export function isSupportedLanguage(
  value: string | null,
): value is SupportedLanguage {
  return value === "en" || value === "bg";
}

type I18nContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (text: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "en";
  }

  const storedLanguage = window.localStorage.getItem(languageStorageKey);

  if (isSupportedLanguage(storedLanguage)) {
    return storedLanguage;
  }

  const cookieLanguage = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${languageCookieKey}=`))
    ?.split("=")[1];

  if (isSupportedLanguage(cookieLanguage ?? null)) {
    return cookieLanguage as SupportedLanguage;
  }

  return "en";
}

function persistLanguage(language: SupportedLanguage) {
  window.localStorage.setItem(languageStorageKey, language);
  document.cookie = `${languageCookieKey}=${language}; path=/; max-age=31536000; SameSite=Lax`;
  document.documentElement.lang = language;
}

function restoreEnglishText(text: string) {
  const englishMatch = Object.entries(phraseTranslations).find(
    ([, translatedText]) => translatedText === text,
  );

  return englishMatch?.[0] ?? text;
}

export function translateText(text: string, language: SupportedLanguage) {
  if (language === "en") {
    return restoreEnglishText(text);
  }

  const englishText = restoreEnglishText(text);

  return phraseTranslations[englishText] ?? text;
}

function readOriginalAttribute(element: HTMLElement, attributeName: string) {
  const dataAttribute = `data-i18n-original-${attributeName}`;
  const storedValue = element.getAttribute(dataAttribute);

  if (storedValue) {
    return storedValue;
  }

  const currentValue = element.getAttribute(attributeName);

  if (currentValue) {
    element.setAttribute(dataAttribute, currentValue);
  }

  return currentValue;
}

function translateElementAttributes(root: ParentNode, language: SupportedLanguage) {
  if (!(root instanceof Element || root instanceof Document)) {
    return;
  }

  const elements = root.querySelectorAll<HTMLElement>(
    "input[placeholder], textarea[placeholder], [aria-label], [title]",
  );

  elements.forEach((element) => {
    const placeholder = readOriginalAttribute(element, "placeholder");
    if (placeholder) {
      element.setAttribute("placeholder", translateText(placeholder, language));
    }

    const ariaLabel = readOriginalAttribute(element, "aria-label");
    if (ariaLabel) {
      element.setAttribute("aria-label", translateText(ariaLabel, language));
    }

    const title = readOriginalAttribute(element, "title");
    if (title) {
      element.setAttribute("title", translateText(title, language));
    }
  });
}

function translateTextNodes(root: ParentNode, language: SupportedLanguage) {
  if (typeof document === "undefined") {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;

      if (!parent) {
        return NodeFilter.FILTER_REJECT;
      }

      if (
        parent.closest(
          "script, style, code, pre, svg, [data-no-translate], [data-i18n-ignore]",
        )
      ) {
        return NodeFilter.FILTER_REJECT;
      }

      const value = node.nodeValue?.trim();

      if (!value) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let currentNode = walker.nextNode();

  while (currentNode) {
    nodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }

  nodes.forEach((node) => {
    const original = node.nodeValue ?? "";
    const leading = original.match(/^\s*/)?.[0] ?? "";
    const trailing = original.match(/\s*$/)?.[0] ?? "";
    const trimmed = original.trim();
    const parent = node.parentElement;

    if (!parent) {
      return;
    }

    const sourceText = trimmed;
    const translated = translateText(sourceText, language);

    if (translated !== trimmed) {
      node.nodeValue = `${leading}${translated}${trailing}`;
    }
  });
}

function applyPageTranslations(language: SupportedLanguage) {
  document.documentElement.lang = language;
  translateTextNodes(document.body, language);
  translateElementAttributes(document.body, language);
}

function I18nDomSync({ language }: { language: SupportedLanguage }) {
  useEffect(() => {
    applyPageTranslations(language);

    const observer = new MutationObserver(() => {
      applyPageTranslations(language);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [language]);

  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  useEffect(() => {
    const storedLanguage = readStoredLanguage();
    setLanguageState(storedLanguage);
    persistLanguage(storedLanguage);
  }, []);

  const setLanguage = useCallback((nextLanguage: SupportedLanguage) => {
    setLanguageState(nextLanguage);
    persistLanguage(nextLanguage);
    window.dispatchEvent(
      new CustomEvent("vnukpodnaem:language-change", {
        detail: { language: nextLanguage },
      }),
    );
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (text: string) => translateText(text, language),
    }),
    [language, setLanguage],
  );

  return (
    <I18nContext.Provider value={value}>
      <I18nDomSync language={language} />
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}
