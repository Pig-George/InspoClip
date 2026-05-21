import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type Locale, type TranslationKey, t } from '@/i18n/translations';

interface LanguageContextType {
  locale: Locale;
  toggle: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'zh',
  toggle: () => {},
  t: (key: TranslationKey) => t(key, 'zh'),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('aimood-locale');
      if (stored === 'en' || stored === 'zh') return stored;
      // Try browser language
      const nav = navigator.language?.toLowerCase();
      if (nav?.startsWith('zh')) return 'zh';
    }
    return 'zh';
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('aimood-locale', locale);
  }, [locale]);

  const toggle = useCallback(() => setLocale((l) => (l === 'zh' ? 'en' : 'zh')), []);
  const translate = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => t(key, locale, params),
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, toggle, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
