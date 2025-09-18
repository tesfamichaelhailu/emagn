import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en/common.json";
import am from "./locales/am/common.json";
import ti from "./locales/ti/common.json";
import om from "./locales/om/common.json";
import fr from "./locales/fr/common.json";
import ar from "./locales/ar/common.json";

const resources = {
  en: { common: en },
  am: { common: am },
  ti: { common: ti },
  om: { common: om },
  fr: { common: fr },
  ar: { common: ar },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: ["en", "am", "ti", "om", "fr", "ar"],
    ns: ["common"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["querystring", "localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;
