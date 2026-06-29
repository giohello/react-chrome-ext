import { useState, useEffect, useCallback } from "react";
import { translations } from "./translations";
import type { LanguageCode } from "./translations";
import { LANGUAGES, DEFAULT_LANGUAGE_CODE } from "../languages";
import { STORAGE_KEYS } from "../constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const chromeApi = (window as any).chrome;

export function useTranslation() {
  const [uiLanguage, setUiLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE_CODE);

  // Load saved UI language on mount
  useEffect(() => {
    if (!chromeApi?.storage?.local?.get) {
      return;
    }

    chromeApi.storage.local.get([STORAGE_KEYS.uiLanguage], (result: Record<string, unknown>) => {
      const savedLang = result.uiLanguage as string | undefined;
      if (savedLang && savedLang in translations) {
        setUiLanguage(savedLang as LanguageCode);
      } else {
        // Try to auto-detect browser language
        const browserLang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage;
        if (browserLang) {
          // Try exact match first (e.g., "en-US")
          const exactMatch = browserLang as LanguageCode;
          if (exactMatch in translations) {
            setUiLanguage(exactMatch);
            return;
          }
          // Try language prefix match (e.g., "en" from "en-US")
          const langPrefix = browserLang.split("-")[0];
          const prefixMatch = LANGUAGES.find(
            (lang) => lang.code.startsWith(langPrefix)
          );
          if (prefixMatch && prefixMatch.code in translations) {
            setUiLanguage(prefixMatch.code as LanguageCode);
          }
        }
      }
    });
  }, []);

  const changeLanguage = useCallback(async (langCode: LanguageCode) => {
    setUiLanguage(langCode);
    
    if (!chromeApi?.storage?.local?.set) {
      return;
    }

    await new Promise<void>((resolve) => {
      chromeApi.storage.local.set({ [STORAGE_KEYS.uiLanguage]: langCode }, () => {
        resolve();
      });
    });
  }, []);

  const t = useCallback(
    (key: keyof typeof translations["en-US"], ...args: unknown[]): string => {
      const translation = translations[uiLanguage]?.[key] || translations["en-US"][key];
      
      // Handle function translations (for dynamic content)
      if (typeof translation === "function") {
        return String((translation as (...fnArgs: unknown[]) => unknown)(...args));
      }
      
      return String(translation);
    },
    [uiLanguage]
  );

  return {
    uiLanguage,
    changeLanguage,
    t,
    availableLanguages: LANGUAGES,
  };
}