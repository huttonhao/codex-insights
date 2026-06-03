import type { SupportedLocale } from "../i18n/localeResolver.js";
import type { AgentRuleSuggestion } from "./agentRuleSuggestion.js";
import type { CommandEvidence } from "./command.js";
import type { DataQuality } from "./dataQuality.js";
import type { SessionFacet } from "./sessionFacet.js";
import type { DeepTopicReport } from "./topic.js";
import type { ProjectProfile } from "./project.js";
import type { UsageAnalytics } from "./usageAnalytics.js";
import type { WorkspaceQualitySummary } from "./workspaceQuality.js";

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
  warnings: number;
  testsRunKnown: boolean;
  testsRunCount?: number;
  testCommands: CommandEvidence[];
  buildCommands: CommandEvidence[];
  workspaceQuality?: WorkspaceQualitySummary;
}

export interface ScanSummary {
  mode: "session" | "repo" | "workspace" | "codex-history";
  repoPath?: string;
  workspacePath?: string;
  projectsScanned: number;
  filesScanned: number;
  bytesScanned: number;
  skippedFiles: number;
  startedAt: string;
  completedAt: string;
}

export interface TrendSummary {
  kind: "baseline" | "comparison";
  message: string;
  deltas: {
    projectsScanned?: number;
    filesScanned?: number;
    bytesScanned?: number;
    skippedFiles?: number;
    topicMentions?: Record<string, number>;
    ragMaturityDistribution?: Partial<Record<string, number>>;
    newTopics?: string[];
    disappearedTopics?: string[];
    newRisks?: string[];
    resolvedRisks?: string[];
    repeatedRecommendedActions?: string[];
  };
}

export interface CodexHistoryReportSummary {
  sessionsDir?: string;
  scannedFiles: number;
  parsedSessions: number;
  qualifyingSessions: number;
  skippedSessions: number;
  dryRun: boolean;
}

export interface ProductInsightSections {
  atAGlance: string[];
  whatYouWorkOn: string[];
  howYouUseCodex: string[];
  impressiveThings: string[];
  whereThingsGoWrong: string[];
  featuresToTry: string[];
  suggestedAgentsAdditions: string[];
  newWaysToUseCodex: string[];
  onTheHorizon: string[];
}

export interface InsightReport {
  schemaVersion: "3.0";
  id: string;
  sessionId?: string;
  repository: RepositoryInfo;
  generatedAt: string;
  locale: SupportedLocale;
  summary: InsightSummary;
  metrics: InsightMetrics;
  recommendations: string[];
  trend: TrendSummary;
  dataQuality: DataQuality[];
  scanSummary: ScanSummary;
  projects: ProjectProfile[];
  deepTopics: DeepTopicReport[];
  usageAnalytics?: UsageAnalytics;
  sessionFacets?: SessionFacet[];
  agentRuleSuggestions?: AgentRuleSuggestion[];
  workspaceQuality?: WorkspaceQualitySummary;
  codexHistory?: CodexHistoryReportSummary;
  productInsights?: ProductInsightSections;
}

export interface GenerateInsightsReportOptions {
  mode?: "session" | "repo" | "workspace" | "codex-history";
  locale: SupportedLocale;
  repoPath?: string;
  workspacePath?: string;
  sessionFile?: string;
  sessionJson?: string;
  deep?: boolean;
  topics?: string[];
  save?: boolean;
  now?: string;
  maxProjects?: number;
  maxFilesPerProject?: number;
  maxFileBytes?: number;
  include?: string[];
  exclude?: string[];
  reportsDir?: string;
  codexHistory?: boolean;
  sessionsDir?: string;
  limit?: number;
  minUserMessages?: number;
  minDurationMinutes?: number;
  dryRun?: boolean;
  noLlm?: boolean;
  llmFacets?: boolean;
  redact?: boolean;
  includeTranscriptSnippets?: boolean;
}
