// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import nb from './locales/nb.json';

i18n
  .use(LanguageDetector) 
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      nb: { translation: nb }
    },
    fallbackLng: 'en',
    
    detection: {
      order: ['navigator']
      // order: ['localStorage', 'navigator'], 
      // caches: ['localStorage'], // Save user's choice
    },
    
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;