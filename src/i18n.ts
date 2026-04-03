import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Bundle translations directly — HTTP backend fails in Capacitor APK (file:// context)
import en from "../public/locales/en/translation.json";
import es from "../public/locales/es/translation.json";
import fr from "../public/locales/fr/translation.json";
import pt from "../public/locales/pt/translation.json";
import de from "../public/locales/de/translation.json";
import zh from "../public/locales/zh/translation.json";
import ja from "../public/locales/ja/translation.json";
import ko from "../public/locales/ko/translation.json";
import ar from "../public/locales/ar/translation.json";
import hi from "../public/locales/hi/translation.json";
import sw from "../public/locales/sw/translation.json";
import tl from "../public/locales/tl/translation.json";
import ru from "../public/locales/ru/translation.json";

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  pt: { translation: pt },
  de: { translation: de },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  ar: { translation: ar },
  hi: { translation: hi },
  sw: { translation: sw },
  tl: { translation: tl },
  ru: { translation: ru },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;

export const RTL_LANGUAGES = ["ar"];

export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "tl", name: "Filipino", flag: "🇵🇭" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
];
