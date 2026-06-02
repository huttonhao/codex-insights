import type { SupportedLocale } from "../i18n/localeResolver.js";

export interface InsightReport {
  id: string;
  sessionId: string;
  repository: RepositoryInfo;
  generatedAt: string;
  locale: SupportedLocale;
  summary: InsightSummary;
  metrics: InsightMetrics;
  recommendations: string[];
  trend: TrendSummary;
}

export interface RepositoryInfo {
  root: string;
  name: string;
}

export interface InsightSummary {
  title: string;
  narrative: string;
}

export interface InsightMetrics {
  toolCalls: number;
  filesTouched: number;
  testsRun: number;
  warnings: number;
}

export interface TrendSummary {
  kind: "baseline" | "comparison";
  message: string;
  deltas: Partial<Record<keyof InsightMetrics, number>>;
}
