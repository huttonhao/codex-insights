export const supportedLocales = ["en-US", "zh-CN"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export interface I18nContext {
  locale: SupportedLocale;
  fallbackLocale: "en-US";
}

export function createI18n(locale?: string): I18nContext {
  return {
    locale: normalizeSupportedLocale(locale),
    fallbackLocale: "en-US"
  };
}

export function normalizeSupportedLocale(locale?: string): SupportedLocale {
  if (!locale) return "en-US";
  const normalized = normalizeLocale(locale);
  return supportedLocales.includes(normalized as SupportedLocale)
    ? (normalized as SupportedLocale)
    : "en-US";
}

export function normalizeLocale(locale: string): string {
  const withoutEncoding = locale.split(".")[0];
  const [language, region] = withoutEncoding.replace("_", "-").split("-");
  if (!language) return "en-US";
  return region
    ? `${language.toLowerCase()}-${region.toUpperCase()}`
    : language.toLowerCase();
}

export function isLocale(locale: SupportedLocale, target: SupportedLocale): boolean {
  return locale === target;
}
