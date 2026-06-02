export {
  resolveLocale,
  supportedLocales,
  type ResolvedLocale,
  type ResolveLocaleInput,
  type SupportedLocale
} from "./i18n/localeResolver.js";
export {
  renderInsightsHtml,
  renderInsightsMarkdown,
  renderInsightsReport
} from "./i18n/outputRenderer.js";
export {
  createReportFileBase,
  defaultReportsDir,
  loadLatestComparableReport,
  saveReportSnapshot,
  type SaveReportSnapshotInput,
  type SavedReportSnapshot
} from "./history/reportHistory.js";
export {
  analyzeSession,
  generateInsightsReport,
  type SessionInsightInput
} from "./insights/analyzer.js";
export type { GenerateInsightsReportOptions } from "./model/report.js";
export { compareReportTrends, createBaselineTrend } from "./insights/trends.js";
export {
  createDataQualityRecord,
  hasUnavailableData,
  mergeDataQuality,
  type DataQuality,
  type DataQualityStatus
} from "./model/dataQuality.js";
export type { Evidence, EvidenceConfidence } from "./model/evidence.js";
export type {
  CommandEvidence,
  CommandEvidenceSummary
} from "./model/command.js";
export type {
  DeepTopicReport,
  ProjectTopicMaturity,
  TopicMention,
  TopicMaturity
} from "./model/topic.js";
export type {
  ProjectProfile,
  ScannedFile,
  WorkspaceScanResult,
  WorkspaceScanSummary
} from "./model/project.js";
export { collectCodexSession } from "./collectors/codexSessionCollector.js";
export type {
  CodexCommand,
  CodexFileEdit,
  CodexSession,
  CodexSessionCollectionResult,
  CodexToolCall,
  CollectCodexSessionOptions
} from "./collectors/codexSessionCollector.js";
export {
  classifyCommand,
  collectCommandEvidence
} from "./collectors/commandEvidenceCollector.js";
export type { CollectCommandEvidenceOptions } from "./collectors/commandEvidenceCollector.js";
export { collectGitContext } from "./collectors/gitCollector.js";
export type { GitContext } from "./collectors/gitCollector.js";
export { scanWorkspace } from "./collectors/workspaceScanner.js";
export type { ScanWorkspaceOptions } from "./collectors/workspaceScanner.js";
export { analyzeProjectTopics, defaultTopics } from "./insights/topicAnalyzer.js";
export { analyzeRagProjects } from "./insights/ragAnalyzer.js";
export {
  buildRagPlatformizationRecommendation,
  type RagPlatformizationInput,
  type RagPlatformizationRecommendation
} from "./insights/recommendationEngine.js";
export { runDoctor, type DoctorCheck, type DoctorOptions, type DoctorResult } from "./doctor.js";
export type {
  GenerateInsightsReportOptions as InsightGenerateOptions,
  InsightMetrics,
  InsightReport,
  InsightSummary,
  RepositoryInfo,
  ScanSummary,
  TrendSummary
} from "./insights/reportModel.js";
