"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Locale, TranslationKey } from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en"); // Default to English

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale;
    if (savedLocale === "en" || savedLocale === "zh") {
      setLocaleState(savedLocale);
    } else {
      // Auto detect browser language, default to English if not Chinese
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.includes("zh")) {
        setLocaleState("zh");
      } else {
        setLocaleState("en");
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || translations["en"][key] || String(key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
