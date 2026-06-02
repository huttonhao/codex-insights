import type { InsightMetrics } from "../insights/reportModel.js";
import type { SupportedLocale } from "./localeResolver.js";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";

export interface MessageCatalog {
  title: string;
  sections: {
    summary: string;
    metrics: string;
    recommendations: string;
    trend: string;
  };
  metrics: Record<keyof InsightMetrics, string>;
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
