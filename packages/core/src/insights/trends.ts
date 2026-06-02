import type { InsightMetrics, InsightReport, TrendSummary } from "./reportModel.js";

const metricKeys: Array<keyof InsightMetrics> = [
  "toolCalls",
  "filesTouched",
  "testsRun",
  "warnings"
];

export function createBaselineTrend(): TrendSummary {
  return {
    kind: "baseline",
    message: "This is the first saved report for this repository.",
    deltas: {}
  };
}

export function compareReportTrends(
  previous: InsightReport,
  current: InsightReport
): TrendSummary {
  const deltas: TrendSummary["deltas"] = {};

  for (const key of metricKeys) {
    deltas[key] = current.metrics[key] - previous.metrics[key];
  }

  return {
    kind: "comparison",
    message: "Compared with the previous saved report.",
    deltas
  };
}
