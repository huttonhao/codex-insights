import {
  compareReportTrends,
  generateInsightsReport,
  loadLatestComparableReport,
  renderInsightsMarkdown,
  resolveLocale,
  runDoctor,
  saveReportSnapshot,
  supportedLocales,
  type DataQuality,
  type DoctorResult,
  type InsightReport,
  type SupportedLocale
} from "../../core/src/index.js";

export type McpInsightFormat = "json" | "markdown";

export interface BaseInsightsArgs {
  locale?: string;
  save?: boolean;
  cwd?: string;
  now?: string;
  deep?: boolean;
  topics?: string[];
  format?: McpInsightFormat;
}

export interface SessionInsightsArgs extends BaseInsightsArgs {
  sessionFile?: string;
  sessionJson?: string;
}

export interface RepoInsightsArgs extends BaseInsightsArgs {
  repoPath?: string;
}

export interface WorkspaceInsightsArgs extends BaseInsightsArgs {
  workspacePath?: string;
  maxProjects?: number;
  maxFilesPerProject?: number;
  maxFileBytes?: number;
}

export interface CodexHistoryInsightsArgs extends BaseInsightsArgs {
  sessionsDir?: string;
  limit?: number;
  minUserMessages?: number;
  minDurationMinutes?: number;
  llmFacets?: boolean;
  noLlm?: boolean;
  dryRun?: boolean;
  redact?: boolean;
  includeTranscriptSnippets?: boolean;
}

export interface InsightsToolResult {
  locale: SupportedLocale;
  format: McpInsightFormat;
  report: InsightReport;
  dataQuality: DataQuality[];
  warnings: string[];
  saved?: {
    jsonPath: string;
    markdownPath?: string;
  };
  markdownSummary?: string;
  dryRunSummary?: {
    scannedFiles: number;
    parsedSessions: number;
    qualifyingSessions: number;
  };
}

export function listSupportedLocales(): {
  locales: SupportedLocale[];
  fallbackLocale: SupportedLocale;
} {
  return {
    locales: [...supportedLocales],
    fallbackLocale: "en-US"
  };
}

export async function getSessionInsights(
  args: SessionInsightsArgs = {}
): Promise<InsightsToolResult> {
  const cwd = args.cwd ?? process.cwd();
  return buildResult({
    args,
    report: await generateInsightsReport({
      mode: "session",
      locale: resolve(args).locale,
      repoPath: cwd,
      sessionFile: args.sessionFile,
      sessionJson: args.sessionJson,
      deep: args.deep,
      topics: args.topics,
      now: args.now
    })
  });
}

export async function getRepoInsights(
  args: RepoInsightsArgs = {}
): Promise<InsightsToolResult> {
  const cwd = args.cwd ?? process.cwd();
  return buildResult({
    args,
    report: await generateInsightsReport({
      mode: "repo",
      locale: resolve(args).locale,
      repoPath: args.repoPath ?? cwd,
      deep: args.deep,
      topics: args.topics,
      now: args.now
    })
  });
}

export async function getWorkspaceInsights(
  args: WorkspaceInsightsArgs = {}
): Promise<InsightsToolResult> {
  const cwd = args.cwd ?? process.cwd();
  return buildResult({
    args,
    report: await generateInsightsReport({
      mode: "workspace",
      locale: resolve(args).locale,
      workspacePath: args.workspacePath ?? cwd,
      deep: args.deep,
      topics: args.topics,
      now: args.now,
      maxProjects: args.maxProjects,
      maxFilesPerProject: args.maxFilesPerProject,
      maxFileBytes: args.maxFileBytes
    })
  });
}

export async function getCodexHistoryInsights(
  args: CodexHistoryInsightsArgs = {}
): Promise<InsightsToolResult> {
  return buildResult({
    args,
    report: await generateInsightsReport({
      mode: "codex-history",
      codexHistory: true,
      locale: resolve(args).locale,
      sessionsDir: args.sessionsDir,
      limit: args.limit,
      minUserMessages: args.minUserMessages,
      minDurationMinutes: args.minDurationMinutes,
      llmFacets: args.llmFacets,
      noLlm: args.noLlm,
      dryRun: args.dryRun,
      redact: args.redact,
      includeTranscriptSnippets: args.includeTranscriptSnippets,
      now: args.now
    })
  });
}

export async function doctor(args: { cwd?: string } = {}): Promise<DoctorResult> {
  return runDoctor({ cwd: args.cwd ?? process.cwd() });
}

async function buildResult(input: {
  args: BaseInsightsArgs;
  report: InsightReport;
}): Promise<InsightsToolResult> {
  const format = input.args.format ?? "markdown";
  const previous = await loadLatestComparableReport(input.report);
  if (previous) {
    input.report.trend = compareReportTrends(previous, input.report);
  }
  const markdownSummary =
    format === "markdown"
      ? renderInsightsMarkdown(input.report, input.report.locale)
      : undefined;
  const saved =
    input.args.save === false
      ? undefined
      : await saveReportSnapshot({
          report: input.report,
          markdown: markdownSummary
        });

  return {
    locale: input.report.locale,
    format,
    report: input.report,
    dataQuality: input.report.dataQuality,
    warnings: input.report.dataQuality
      .filter((item) => item.status !== "ok")
      .map((item) => item.reason),
    saved: saved
      ? {
          jsonPath: saved.jsonPath,
          markdownPath: saved.markdownPath
        }
      : undefined,
    markdownSummary,
    dryRunSummary: input.report.codexHistory?.dryRun
      ? {
          scannedFiles: input.report.codexHistory.scannedFiles,
          parsedSessions: input.report.codexHistory.parsedSessions,
          qualifyingSessions: input.report.codexHistory.qualifyingSessions
        }
      : undefined
  };
}

function resolve(args: BaseInsightsArgs): { locale: SupportedLocale } {
  return resolveLocale({
    requestedLocale: args.locale ?? "auto",
    envLocale: process.env.LANG
  });
}
