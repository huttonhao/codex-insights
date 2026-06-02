import type { SupportedLocale } from "./localeResolver.js";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";

export type MetricMessageKey =
  | "projectsScanned"
  | "filesScanned"
  | "testsRun"
  | "warnings";

export interface MessageCatalog {
  title: string;
  sections: {
    summary: string;
    metrics: string;
    recommendations: string;
    trend: string;
  };
  metrics: Record<MetricMessageKey, string>;
  trend: {
    baseline: string;
    comparison: string;
  };
  emptyRecommendations: string;
}

export function getMessageCatalog(locale: SupportedLocale): MessageCatalog {
  if (locale === "zh-CN") {
    return zhCN;
  }

  return enUS;
}
