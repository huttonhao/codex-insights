import type { InsightMetrics, InsightReport } from "../insights/reportModel.js";
import type { SupportedLocale } from "./localeResolver.js";
import { getMessageCatalog } from "./messageCatalog.js";

const metricOrder: Array<keyof InsightMetrics> = [
  "toolCalls",
  "filesTouched",
  "testsRun",
  "warnings"
];

export function renderInsightsReport(
  report: InsightReport,
  locale: SupportedLocale = report.locale
): string {
  const catalog = getMessageCatalog(locale);
  const recommendations =
    report.recommendations.length > 0
      ? report.recommendations.map((item) => `- ${item}`).join("\n")
      : `- ${catalog.emptyRecommendations}`;

  return [
    `# ${catalog.title}`,
    "",
    `## ${catalog.sections.summary}`,
    "",
    report.summary.narrative,
    "",
    `## ${catalog.sections.metrics}`,
    "",
    renderMetrics(report.metrics, catalog),
    "",
    `## ${catalog.sections.recommendations}`,
    "",
    recommendations,
    "",
    `## ${catalog.sections.trend}`,
    "",
    renderTrend(report, catalog)
  ].join("\n");
}

function renderMetrics(
  metrics: InsightMetrics,
  catalog: ReturnType<typeof getMessageCatalog>
): string {
  const rows = metricOrder.map((key) => `| ${catalog.metrics[key]} | ${metrics[key]} |`);
  return ["| Metric | Value |", "| --- | ---: |", ...rows].join("\n");
}

function renderTrend(
  report: InsightReport,
  catalog: ReturnType<typeof getMessageCatalog>
): string {
  if (report.trend.kind === "baseline") {
    return catalog.trend.baseline;
  }

  const deltas = Object.entries(report.trend.deltas);
  if (deltas.length === 0) {
    return catalog.trend.comparison;
  }

  return [
    catalog.trend.comparison,
    ...deltas.map(([key, value]) => {
      const metricKey = key as keyof InsightMetrics;
      const signedValue = Number(value) >= 0 ? `+${value}` : `${value}`;
      return `- ${catalog.metrics[metricKey]}: ${signedValue}`;
    })
  ].join("\n");
}
