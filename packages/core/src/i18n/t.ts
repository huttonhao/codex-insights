import { enUSMessages } from "./locales/en-US/index.js";
import { zhCNMessages } from "./locales/zh-CN/index.js";
import type { I18nContext, SupportedLocale } from "./locale.js";

export type MessageKey = keyof typeof enUSMessages;

type MessageCatalog = Record<MessageKey, string>;

const catalogs: Record<SupportedLocale, MessageCatalog> = {
  "en-US": enUSMessages,
  "zh-CN": zhCNMessages as MessageCatalog
};

export function t(
  ctx: I18nContext,
  key: MessageKey,
  params: Record<string, string | number | boolean | undefined> = {}
): string {
  const catalog = catalogs[ctx.locale] ?? catalogs[ctx.fallbackLocale];
  const template = catalog[key] ?? catalogs[ctx.fallbackLocale][key] ?? key;
  return interpolate(template, params);
}

export function tx(
  locale: SupportedLocale,
  key: MessageKey,
  params: Record<string, string | number | boolean | undefined> = {}
): string {
  return t({ locale, fallbackLocale: "en-US" }, key, params);
}

export function listMissingTranslations(locale: SupportedLocale): string[] {
  const baseKeys = Object.keys(enUSMessages).sort();
  const localeCatalog = catalogs[locale] as Record<string, string>;
  return baseKeys.filter((key) => !Object.hasOwn(localeCatalog, key));
}

export function assertCompleteCatalog(locale: SupportedLocale): void {
  const missing = listMissingTranslations(locale);
  if (missing.length) {
    throw new Error(`Missing ${locale} translations: ${missing.join(", ")}`);
  }
  const baseKeys = Object.keys(enUSMessages).sort();
  const localeKeys = Object.keys(catalogs[locale]).sort();
  const extra = localeKeys.filter((key) => !baseKeys.includes(key));
  if (extra.length) {
    throw new Error(`Extra ${locale} translations: ${extra.join(", ")}`);
  }
}

function interpolate(
  template: string,
  params: Record<string, string | number | boolean | undefined>
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}
