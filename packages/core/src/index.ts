export {
  resolveLocale,
  supportedLocales,
  type ResolvedLocale,
  type ResolveLocaleInput,
  type SupportedLocale
} from "./i18n/localeResolver.js";
export { renderInsightsReport } from "./i18n/outputRenderer.js";
export {
  createReportFileBase,
  defaultReportsDir,
  loadLatestComparableReport,
  saveReportSnapshot,
  type SaveReportSnapshotInput,
  type SavedReportSnapshot
} from "./history/reportHistory.js";
export { compareReportTrends, createBaselineTrend } from "./insights/trends.js";
export type {
  InsightMetrics,
  InsightReport,
  InsightSummary,
  RepositoryInfo,
  TrendSummary
} from "./insights/reportModel.js";
