export const supportedLocales = ["en-US", "zh-CN"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export interface ResolveLocaleInput {
  requestedLocale?: string;
  userInput?: string;
  envLocale?: string;
}

export interface ResolvedLocale {
  locale: SupportedLocale;
  requestedLocale?: string;
  fallbackLocale: SupportedLocale;
  usedFallback: boolean;
}

const fallbackLocale: SupportedLocale = "en-US";

export function resolveLocale(input: ResolveLocaleInput = {}): ResolvedLocale {
  const requestedLocale = input.requestedLocale;

  if (requestedLocale && requestedLocale !== "auto") {
    const normalizedRequested = normalizeLocale(requestedLocale);

    if (isSupportedLocale(normalizedRequested)) {
      return {
        locale: normalizedRequested,
        requestedLocale,
        fallbackLocale,
        usedFallback: false
      };
    }

    return {
      locale: fallbackLocale,
      requestedLocale,
      fallbackLocale,
      usedFallback: true
    };
  }

  const inferredFromInput = inferLocaleFromText(input.userInput);
  if (inferredFromInput) {
    return {
      locale: inferredFromInput,
      requestedLocale,
      fallbackLocale,
      usedFallback: false
    };
  }

  const normalizedEnv = normalizeLocale(input.envLocale);
  if (isSupportedLocale(normalizedEnv)) {
    return {
      locale: normalizedEnv,
      requestedLocale,
      fallbackLocale,
      usedFallback: false
    };
  }

  return {
    locale: fallbackLocale,
    requestedLocale,
    fallbackLocale,
    usedFallback: false
  };
}

function normalizeLocale(locale?: string): string | undefined {
  if (!locale) {
    return undefined;
  }

  const withoutEncoding = locale.split(".")[0];
  const [language, region] = withoutEncoding.replace("_", "-").split("-");

  if (!language) {
    return undefined;
  }

  if (!region) {
    return language.toLowerCase();
  }

  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}

function isSupportedLocale(locale?: string): locale is SupportedLocale {
  return supportedLocales.includes(locale as SupportedLocale);
}

function inferLocaleFromText(text?: string): SupportedLocale | undefined {
  if (!text || text.trim().length === 0) {
    return undefined;
  }

  if (/\p{Script=Han}/u.test(text)) {
    return "zh-CN";
  }

  if (/[a-z]/i.test(text)) {
    return "en-US";
  }

  return undefined;
}
