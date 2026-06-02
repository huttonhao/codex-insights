import type { SupportedLocale } from "../i18n/localeResolver.js";
import type { CommandEvidence } from "./command.js";
import type { DataQuality } from "./dataQuality.js";
import type { DeepTopicReport } from "./topic.js";
import type { ProjectProfile } from "./project.js";

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
}

export interface ScanSummary {
  mode: "session" | "repo" | "workspace";
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

export interface InsightReport {
  schemaVersion: "2.0";
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
}

export interface GenerateInsightsReportOptions {
  mode?: "session" | "repo" | "workspace";
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
}
