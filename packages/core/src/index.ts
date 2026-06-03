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
export type { AgentRuleSuggestion } from "./model/agentRuleSuggestion.js";
export type { SessionFacet } from "./model/sessionFacet.js";
export type { UsageAnalytics } from "./model/usageAnalytics.js";
export type {
  ProjectQualitySummary,
  WorkspaceQualitySummary
} from "./model/workspaceQuality.js";
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
export { collectCodexSessionHistory } from "./collectors/codexSessionHistoryCollector.js";
export type {
  CodexHistorySummary,
  CollectCodexSessionHistoryOptions,
  CollectCodexSessionHistoryResult
} from "./collectors/codexSessionHistoryCollector.js";
export type {
  CodexCommand,
  CodexFileEdit,
  CodexSession,
  CodexSessionCollectionResult,
  CodexToolCall,
  CollectCodexSessionOptions
} from "./collectors/codexSessionCollector.js";
export {
  parseCodexJsonlSessionFile,
  type ParsedCodexJsonlSession,
  type ParseCodexJsonlSessionOptions,
  type ParseCodexJsonlSessionResult
} from "./collectors/codexJsonlSessionParser.js";
export {
  defaultCodexSessionsDir,
  scanCodexJsonlSessionFiles,
  type CodexJsonlSessionScanResult,
  type ScanCodexJsonlSessionsOptions
} from "./collectors/codexJsonlSessionScanner.js";
export {
  extractSessionFacets,
  facetCacheKey,
  type ExtractSessionFacetsOptions,
  type ExtractSessionFacetsResult
} from "./collectors/sessionFacetExtractor.js";
export {
  buildAgentRuleSuggestions,
  buildInsightSections,
  buildUsageAnalytics,
  type InsightSections
} from "./collectors/sessionHistoryAggregator.js";
export { redactSensitiveText } from "./collectors/redaction.js";
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
export { analyzeGenericTopicProjects } from "./insights/genericTopicAnalyzer.js";
export {
  buildRagPlatformizationRecommendation,
  buildGenericPlatformizationRecommendation,
  type GenericPlatformizationInput,
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
