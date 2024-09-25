import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {ru, en, ILang} from './lang';


type Locale = 'en' | 'ru';

interface TranslationContextProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: ILang;
}

const TranslationContext = createContext<TranslationContextProps | undefined>(undefined);

const translationsMap: Record<Locale, ILang> = {
  en,
  ru,
};

export const TranslationContextProvider: React.FC<{ children: ReactNode, initialLocale: Locale }> = ({ children, initialLocale }) => {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [translations, setTranslations] = useState<ILang>(translationsMap[initialLocale]);

  useEffect(() => {
    setTranslations(translationsMap[locale]);
  }, [locale]);

  return (
    <TranslationContext.Provider value={{ locale, setLocale, translations: translations }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationContextProvider');
  }
  return context;
};

