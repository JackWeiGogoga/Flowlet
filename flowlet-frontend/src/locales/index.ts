import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// 中文语言包
import zhCNCommon from "./zh-CN/common.json";
import zhCNMenu from "./zh-CN/menu.json";
import zhCNFlow from "./zh-CN/flow.json";
import zhCNExecution from "./zh-CN/execution.json";
import zhCNSettings from "./zh-CN/settings.json";
import zhCNNodes from "./zh-CN/nodes.json";
import zhCNDictionary from "./zh-CN/dictionary.json";

// 英文语言包
import enUSCommon from "./en-US/common.json";
import enUSMenu from "./en-US/menu.json";
import enUSFlow from "./en-US/flow.json";
import enUSExecution from "./en-US/execution.json";
import enUSSettings from "./en-US/settings.json";
import enUSNodes from "./en-US/nodes.json";
import enUSDictionary from "./en-US/dictionary.json";

export const LANGUAGE_STORAGE_KEY = "flowlet-language";
export const DEFAULT_LANGUAGE = "en-US";

export const languages = [
  { key: "zh-CN", label: "简体中文", shortLabel: "中", flag: "🇨🇳" },
  { key: "en-US", label: "English", shortLabel: "EN", flag: "🇺🇸" },
] as const;

export type LanguageKey = (typeof languages)[number]["key"];

const resources = {
  "zh-CN": {
    common: zhCNCommon,
    menu: zhCNMenu,
    flow: zhCNFlow,
    execution: zhCNExecution,
    settings: zhCNSettings,
    nodes: zhCNNodes,
    dictionary: zhCNDictionary,
  },
  "en-US": {
    common: enUSCommon,
    menu: enUSMenu,
    flow: enUSFlow,
    execution: enUSExecution,
    settings: enUSSettings,
    nodes: enUSNodes,
    dictionary: enUSDictionary,
  },
};

// 从 localStorage 获取保存的语言偏好
const getSavedLanguage = (): LanguageKey => {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && languages.some((lang) => lang.key === saved)) {
    return saved as LanguageKey;
  }
  return DEFAULT_LANGUAGE;
};

i18n.use(initReactI18next).init({
  resources,
  lng: getSavedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: "common",
  ns: ["common", "menu", "flow", "execution", "settings", "nodes", "dictionary"],
  interpolation: {
    escapeValue: false,
  },
});

// 语言切换函数（同时保存到 localStorage）
export const changeLanguage = (lang: LanguageKey) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  i18n.changeLanguage(lang);
};

export default i18n;
