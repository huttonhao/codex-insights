import { basename, dirname, resolve } from "node:path";
import { collectCodexSession } from "../collectors/codexSessionCollector.js";
import { collectCodexSessionHistory } from "../collectors/codexSessionHistoryCollector.js";
import { collectCommandEvidence } from "../collectors/commandEvidenceCollector.js";
import { collectGitContext } from "../collectors/gitCollector.js";
import { scanWorkspace } from "../collectors/workspaceScanner.js";
import type { CommandEvidenceSummary } from "../model/command.js";
import type { DataQuality } from "../model/dataQuality.js";
import { createDataQualityRecord, mergeDataQuality } from "../model/dataQuality.js";
import { tx } from "../i18n/index.js";
import type {
  GenerateInsightsReportOptions,
  InsightReport,
  RepositoryInfo,
  ScanSummary
} from "../model/report.js";
import type { DeepTopicReport } from "../model/topic.js";
import type { ProjectProfile } from "../model/project.js";
import { analyzeAgentProjects } from "./agentAnalyzer.js";
import { detectReportAnomalies } from "./anomalyDetector.js";
import { analyzeGenericTopicProjects } from "./genericTopicAnalyzer.js";
import { analyzeLlmGatewayProjects } from "./llmGatewayAnalyzer.js";
import { analyzeObservabilityProjects } from "./observabilityAnalyzer.js";
import { analyzeQualityProjects } from "./qualityAnalyzer.js";
import { analyzeRagProjects } from "./ragAnalyzer.js";
import { buildFullReportNarrative, fullTopicOrder } from "./reportNarrativeBuilder.js";
import { analyzeSecurityProjects } from "./securityAnalyzer.js";
import { createBaselineTrend } from "./trends.js";
import {
  summarizeProjectQuality,
  summarizeWorkspaceQuality
} from "./workspaceQuality.js";

export const defaultFullTopics = fullTopicOrder;

export interface SessionInsightInput {
  sessionId: string;
  repository: RepositoryInfo;
  generatedAt: string;
  locale: InsightReport["locale"];
  toolCalls: string[];
  filesTouched: string[];
  testsRun?: number;
  warnings: string[];
}

type ReportMode = "session" | "repo" | "workspace" | "codex-history" | "full";

/**
 * @deprecated Use generateInsightsReport() with session, repo, workspace, or codex-history mode.
 */
export function analyzeSession(input: SessionInsightInput): InsightReport {
  const now = input.generatedAt;
  const testsRunKnown = typeof input.testsRun === "number";
  return {
    schemaVersion: "3.0",
    id: `${input.sessionId}-${now}`,
    sessionId: input.sessionId,
    repository: input.repository,
    generatedAt: now,
    locale: input.locale,
    summary: {
      title: tx(input.locale, "report.summary.title.session"),
      narrative: testsRunKnown
        ? tx(input.locale, "report.summary.legacyKnown", {
            toolCalls: input.toolCalls.length,
            filesTouched: new Set(input.filesTouched).size,
            testsRun: input.testsRun ?? 0,
            warnings: input.warnings.length
          })
        : tx(input.locale, "report.summary.legacyUnknown", {
            toolCalls: input.toolCalls.length,
            filesTouched: new Set(input.filesTouched).size,
            warnings: input.warnings.length
          })
    },
    metrics: {
      toolCalls: input.toolCalls.length,
      filesTouched: new Set(input.filesTouched).size,
      warnings: input.warnings.length,
      testsRunKnown,
      testsRunCount: input.testsRun,
      testCommands: [],
      buildCommands: []
    },
    recommendations: testsRunKnown
      ? ["Keep saving reports to build a useful trend history."]
      : ["Capture session command evidence so future reports can distinguish unknown test execution from no test execution."],
    trend: createBaselineTrend(),
    dataQuality: testsRunKnown
      ? []
      : [
          {
            source: "test-evidence",
            status: "unavailable",
            reason: "The legacy analyzeSession input did not include command evidence.",
            attemptedSources: ["SessionInsightInput.testsRun"],
            warnings: Array.from<string>([])
          }
        ],
    scanSummary: {
      mode: "session",
      repoPath: input.repository.root,
      projectsScanned: 1,
      filesScanned: 0,
      bytesScanned: 0,
      skippedFiles: 0,
      startedAt: now,
      completedAt: now
    },
    projects: [],
    deepTopics: [],
    productInsights: createDefaultProductInsights({
      mode: "session",
      projects: [],
      deepTopics: [],
      locale: input.locale
    })
  };
}

export async function generateInsightsReport(
  options: GenerateInsightsReportOptions
): Promise<InsightReport> {
  const startedAt = options.now ?? new Date().toISOString();
  const mode = options.mode ?? inferMode(options);
  const repoPath = resolve(options.repoPath ?? process.cwd());
  const workspacePath = resolve(options.workspacePath ?? defaultWorkspacePath(repoPath));
  const requestedTopics = options.topics?.length
    ? options.topics
    : mode === "full"
      ? defaultFullTopics
      : undefined;
  const dataQuality: DataQuality[] = [];
  let projects: ProjectProfile[] = [];
  let scanNumbers = {
    projectsScanned: 0,
    filesScanned: 0,
    bytesScanned: 0,
    skippedFiles: 0
  };
  let sessionId: string | undefined;
  let toolCalls = 0;
  let filesTouched = 0;
  let warnings = 0;
  let commandEvidence: CommandEvidenceSummary;
  let usageAnalytics: InsightReport["usageAnalytics"];
  let sessionFacets: InsightReport["sessionFacets"];
  let agentRuleSuggestions: InsightReport["agentRuleSuggestions"];
  let codexHistory: InsightReport["codexHistory"];
  let productInsights: InsightReport["productInsights"];

  if (mode === "full") {
    const history = await collectCodexSessionHistory({
      sessionsDir: options.sessionsDir,
      limit: options.limit,
      minUserMessages: options.minUserMessages,
      minDurationMinutes: options.minDurationMinutes,
      dryRun: options.dryRun,
      noLlm: options.noLlm,
      llmFacets: options.llmFacets,
      redact: options.redact,
      includeTranscriptSnippets: options.includeTranscriptSnippets,
      locale: options.locale
    });
    dataQuality.push(...history.dataQuality);
    usageAnalytics = history.usageAnalytics;
    sessionFacets = history.sessionFacets;
    agentRuleSuggestions = history.agentRuleSuggestions;
    codexHistory = history.codexHistory;
    productInsights = history.insightSections;
    sessionId = history.qualifyingSessions[0]?.sessionId;
    toolCalls = history.usageAnalytics.toolCalls ?? 0;
    filesTouched = history.usageAnalytics.filesModified ?? 0;
    warnings = history.qualifyingSessions.reduce((count, session) => count + session.warnings.length, 0);

    const scan = await scanWorkspace({
      workspacePath,
      topics: requestedTopics,
      maxProjects: options.maxProjects,
      maxFilesPerProject: options.maxFilesPerProject,
      maxFileBytes: options.maxFileBytes,
      include: options.include,
      exclude: options.exclude
    });
    const projectCommandEvidence = await collectProjectCommandEvidence(scan.projects);
    projects = attachProjectQuality(scan.projects, projectCommandEvidence);
    scanNumbers = scan.summary;
    dataQuality.push(...scan.dataQuality);
    commandEvidence = aggregateWorkspaceCommandEvidence([
      ...projectCommandEvidence,
      summarizeHistoryCommandEvidence(history.qualifyingSessions)
    ]);
  } else if (mode === "workspace") {
    const scan = await scanWorkspace({
      workspacePath,
      topics: requestedTopics,
      maxProjects: options.maxProjects,
      maxFilesPerProject: options.maxFilesPerProject,
      maxFileBytes: options.maxFileBytes,
      include: options.include,
      exclude: options.exclude
    });
    const projectCommandEvidence = await collectProjectCommandEvidence(scan.projects);
    projects = attachProjectQuality(scan.projects, projectCommandEvidence);
    scanNumbers = scan.summary;
    dataQuality.push(...scan.dataQuality);
    commandEvidence = aggregateWorkspaceCommandEvidence(projectCommandEvidence);
  } else if (mode === "repo") {
    const git = await collectGitContext(repoPath);
    dataQuality.push(...git.dataQuality);
    const scan = await scanWorkspace({
      workspacePath: repoPath,
      topics: requestedTopics,
      maxProjects: 1,
      maxFilesPerProject: options.maxFilesPerProject,
      maxFileBytes: options.maxFileBytes,
      include: options.include,
      exclude: options.exclude
    });
    commandEvidence = await collectCommandEvidence({ repoPath });
    projects = scan.projects.map((project) => ({
      ...project,
      commandEvidence,
      qualitySummary: summarizeProjectQuality(commandEvidence)
    }));
    scanNumbers = scan.summary;
    dataQuality.push(...scan.dataQuality);
    filesTouched = new Set([
      ...git.changedFiles,
      ...git.stagedFiles,
      ...git.untrackedFiles
    ]).size;
  } else if (mode === "codex-history") {
    const history = await collectCodexSessionHistory({
      sessionsDir: options.sessionsDir,
      limit: options.limit,
      minUserMessages: options.minUserMessages,
      minDurationMinutes: options.minDurationMinutes,
      dryRun: options.dryRun,
      noLlm: options.noLlm,
      llmFacets: options.llmFacets,
      redact: options.redact,
      includeTranscriptSnippets: options.includeTranscriptSnippets,
      locale: options.locale
    });
    dataQuality.push(...history.dataQuality);
    usageAnalytics = history.usageAnalytics;
    sessionFacets = history.sessionFacets;
    agentRuleSuggestions = history.agentRuleSuggestions;
    codexHistory = history.codexHistory;
    productInsights = history.insightSections;
    scanNumbers = {
      projectsScanned: history.usageAnalytics.projectBreakdown?.length ?? 0,
      filesScanned: history.codexHistory.scannedFiles,
      bytesScanned: 0,
      skippedFiles: history.codexHistory.skippedSessions
    };
    sessionId = history.qualifyingSessions[0]?.sessionId;
    toolCalls = history.usageAnalytics.toolCalls ?? 0;
    filesTouched = history.usageAnalytics.filesModified ?? 0;
    warnings = history.qualifyingSessions.reduce((count, session) => count + session.warnings.length, 0);
    commandEvidence = summarizeHistoryCommandEvidence(history.qualifyingSessions);
  } else {
    const session = await collectCodexSession({
      sessionFile: options.sessionFile,
      sessionJson: options.sessionJson
    });
    dataQuality.push(...session.dataQuality);
    sessionId = session.session?.sessionId;
    toolCalls = session.session?.toolCalls.length ?? 0;
    filesTouched = new Set(session.session?.fileEdits.map((edit) => edit.path) ?? []).size;
    warnings = session.session?.warnings.length ?? 0;
    commandEvidence = await collectCommandEvidence({
      session: session.session,
      repoPath
    });
  }

  dataQuality.push(...commandEvidence.dataQuality);
  const completedAt = options.now ?? new Date().toISOString();
  const deepTopics = options.deep || mode === "full"
    ? createDeepTopicReports(projects, requestedTopics, options.locale)
    : [];
  const repository = createRepositoryInfo(mode, repoPath, workspacePath);
  const workspaceQuality = projects.length ? summarizeWorkspaceQuality(projects) : undefined;
  const scanSummary: ScanSummary = {
    mode,
    repoPath: mode === "workspace" ? undefined : repoPath,
    workspacePath: mode === "workspace" ? workspacePath : undefined,
    ...scanNumbers,
    startedAt,
    completedAt
  };

  const report: InsightReport = {
    schemaVersion: "3.0",
    id: createReportId(mode, repository, startedAt),
    sessionId,
    repository,
    generatedAt: completedAt,
    locale: options.locale,
    summary: {
      title: mode === "full"
        ? tx(options.locale, "report.summary.title.full")
        : mode === "workspace"
          ? tx(options.locale, "report.summary.title.workspace")
          : tx(options.locale, "report.summary.title.default"),
      narrative: createNarrative({
        mode,
        projects,
        deepTopics,
        testsRunKnown: commandEvidence.testsRunKnown,
        locale: options.locale
      })
    },
    metrics: {
      toolCalls,
      filesTouched,
      warnings,
      testsRunKnown: commandEvidence.testsRunKnown,
      testsRunCount: commandEvidence.testsRunCount,
      testCommands: commandEvidence.testCommands,
      buildCommands: commandEvidence.buildCommands,
      workspaceQuality
    },
    recommendations: createReportRecommendations(
      deepTopics,
      commandEvidence.unknownReason,
      options.locale
    ),
    trend: createBaselineTrend(),
    dataQuality: mergeDataQuality(dataQuality),
    scanSummary,
    projects,
    deepTopics,
    usageAnalytics,
    sessionFacets,
    agentRuleSuggestions,
    workspaceQuality,
    codexHistory,
    productInsights:
      productInsights ??
      createDefaultProductInsights({
        mode,
        projects,
        deepTopics,
        locale: options.locale,
        testsRunKnown: commandEvidence.testsRunKnown,
        workspaceQuality
      })
  };

  report.anomalies = detectReportAnomalies(report);
  report.fullNarrative = buildFullReportNarrative(report, report.anomalies);

  return report;
}

function inferMode(options: GenerateInsightsReportOptions): ReportMode {
  if (options.codexHistory) return "codex-history";
  if (options.workspacePath) return "workspace";
  if (options.repoPath) return "repo";
  if (options.sessionFile || options.sessionJson) return "session";
  return "full";
}

function createDeepTopicReports(
  projects: ProjectProfile[],
  topics?: string[],
  locale: InsightReport["locale"] = "en-US"
): DeepTopicReport[] {
  const requested = topics?.length ? topics : ["rag"];
  return requested.map((topic) => {
    if (topic === "rag") return analyzeRagProjects(projects, locale);
    if (topic === "agent") return analyzeAgentProjects(projects, locale);
    if (topic === "llm-gateway") return analyzeLlmGatewayProjects(projects, locale);
    if (topic === "quality" || topic === "testing") return analyzeQualityProjects(projects, locale);
    if (topic === "observability") return analyzeObservabilityProjects(projects, locale);
    if (topic === "security") return analyzeSecurityProjects(projects, locale);
    return analyzeGenericTopicProjects(projects, topic, locale);
  });
}

async function collectProjectCommandEvidence(
  projects: ProjectProfile[]
): Promise<CommandEvidenceSummary[]> {
  return Promise.all(
    projects.map((project) =>
      collectCommandEvidence({
        repoPath: project.path,
        suppressUnknownDataQuality: true
      })
    )
  );
}

function attachProjectQuality(
  projects: ProjectProfile[],
  summaries: CommandEvidenceSummary[]
): ProjectProfile[] {
  return projects.map((project, index) => ({
    ...project,
    commandEvidence: summaries[index],
    qualitySummary: summarizeProjectQuality(summaries[index] as CommandEvidenceSummary)
  }));
}

function aggregateWorkspaceCommandEvidence(
  summaries: CommandEvidenceSummary[]
): CommandEvidenceSummary {
  const testCommands = summaries.flatMap((summary) => summary.testCommands);
  const buildCommands = summaries.flatMap((summary) => summary.buildCommands);
  const lintCommands = summaries.flatMap((summary) => summary.lintCommands);
  const typecheckCommands = summaries.flatMap((summary) => summary.typecheckCommands);
  const dockerCommands = summaries.flatMap((summary) => summary.dockerCommands);
  const testsRunCount = summaries.reduce(
    (count, summary) => count + (summary.testsRunCount ?? 0),
    0
  );
  const testsRunKnown = summaries.some((summary) => summary.testsRunKnown);
  const unknownReason = testsRunKnown
    ? undefined
    : "No executed test command was found across scanned workspace projects.";

  return {
    testsRunKnown,
    testsRunCount: testsRunKnown ? testsRunCount : undefined,
    testCommands,
    buildCommands,
    lintCommands,
    typecheckCommands,
    dockerCommands,
    unknownReason,
    dataQuality: testsRunKnown
      ? []
      : [
          createDataQualityRecord({
            source: "test-evidence",
            status: "unavailable",
            reason: unknownReason ?? "No executed test command was found.",
            attemptedSources: [
              "workspace project package.json scripts",
              "workspace project CI files",
              "workspace project test files",
              "workspace project build config",
              "session.commands"
            ]
          })
        ]
  };
}

function createRepositoryInfo(
  mode: ReportMode,
  repoPath: string,
  workspacePath: string
): RepositoryInfo {
  const root = mode === "workspace" || mode === "full" ? workspacePath : repoPath;
  return {
    root,
    name: basename(root)
  };
}

function createReportId(
  mode: ReportMode,
  repository: RepositoryInfo,
  timestamp: string
): string {
  return `${mode}-${repository.name}-${timestamp}`;
}

function createNarrative(input: {
  mode: ReportMode;
  projects: ProjectProfile[];
  deepTopics: DeepTopicReport[];
  testsRunKnown: boolean;
  locale: InsightReport["locale"];
}): string {
  if (input.mode === "codex-history") {
    return tx(input.locale, "report.summary.codexHistory");
  }
  const rag = input.deepTopics.find((topic) => topic.topic === "rag");
  if (input.mode === "workspace" && rag) {
    return tx(input.locale, "report.summary.workspaceRag", {
      projects: input.projects.length,
      mentioned: rag.mentionedProjects
    });
  }
  if (input.mode === "workspace") {
    return tx(input.locale, "report.summary.workspace", { projects: input.projects.length });
  }
  if (!input.testsRunKnown) {
    return tx(input.locale, "report.summary.repoUnknownTests");
  }
  return tx(input.locale, "report.summary.repoWithEvidence");
}

function summarizeHistoryCommandEvidence(
  sessions: Array<{
    commands: Array<{ command: string; exitCode?: number; outputSnippet?: string }>;
  }>
): CommandEvidenceSummary {
  const commands = sessions.flatMap((session) =>
    session.commands.map((command) => ({
      command: command.command,
      category: "other" as const,
      source: "session" as const,
      exitCode: command.exitCode,
      outputSnippet: command.outputSnippet,
      confidence: "high" as const
    }))
  );
  return {
    testsRunKnown: commands.some((command) => /test|vitest|jest|pytest|go test/.test(command.command)),
    testsRunCount: commands.filter((command) => /test|vitest|jest|pytest|go test/.test(command.command)).length || undefined,
    testCommands: commands.filter((command) => /test|vitest|jest|pytest|go test/.test(command.command)),
    buildCommands: commands.filter((command) => /build|tsc|go build/.test(command.command)),
    lintCommands: commands.filter((command) => /lint/.test(command.command)),
    typecheckCommands: commands.filter((command) => /typecheck|tsc/.test(command.command)),
    dockerCommands: commands.filter((command) => /docker/.test(command.command)),
    unknownReason: commands.length ? undefined : "No command evidence was found in Codex history.",
    dataQuality: []
  };
}

function createDefaultProductInsights(input: {
  mode: ReportMode;
  projects: ProjectProfile[];
  deepTopics: DeepTopicReport[];
  locale: InsightReport["locale"];
  testsRunKnown?: boolean;
  workspaceQuality?: InsightReport["workspaceQuality"];
}): InsightReport["productInsights"] {
  const rag = input.deepTopics.find((topic) => topic.topic === "rag");
  return {
    atAGlance: [
      input.mode === "workspace"
        ? tx(input.locale, "report.product.atAGlance.workspace", { projects: input.projects.length })
        : tx(input.locale, "report.product.atAGlance.default")
    ],
    whatYouWorkOn: [
      rag
        ? tx(input.locale, "report.product.work.rag", {
            mentioned: rag.mentionedProjects,
            total: rag.totalProjects
          })
        : tx(input.locale, "report.product.work.noHistory")
    ],
    howYouUseCodex: [
      input.testsRunKnown
        ? tx(input.locale, "report.product.usage.testsKnown")
        : tx(input.locale, "report.product.usage.testsUnknown")
    ],
    impressiveThings: [
      rag?.recommendedReferenceProjects.length
        ? tx(input.locale, "report.product.strength.reference", {
            projects: rag.recommendedReferenceProjects.join(", ")
          })
        : tx(input.locale, "report.product.strength.noReference")
    ],
    whereThingsGoWrong: [
      input.workspaceQuality?.projectsWithoutQualityEvidence
        ? tx(input.locale, "report.product.problem.qualityGap", {
            count: input.workspaceQuality.projectsWithoutQualityEvidence
          })
        : tx(input.locale, "report.product.problem.noQualityGap")
    ],
    featuresToTry: [tx(input.locale, "report.product.features")],
    suggestedAgentsAdditions: [tx(input.locale, "report.product.agents")],
    newWaysToUseCodex: [tx(input.locale, "report.product.newWays")],
    onTheHorizon: [tx(input.locale, "report.product.horizon")]
  };
}

function defaultWorkspacePath(repoPath: string): string {
  return dirname(repoPath);
}

function createReportRecommendations(
  deepTopics: DeepTopicReport[],
  unknownReason?: string,
  locale: InsightReport["locale"] = "en-US"
): string[] {
  const recommendations: string[] = [];
  const rag = deepTopics.find((topic) => topic.topic === "rag");
  if (rag?.platformizationRecommendation.shouldPlatformize) {
    recommendations.push(
      tx(locale, "report.recommendation.ragPlatform", { mentioned: rag.mentionedProjects })
    );
  }
  if (unknownReason) {
    recommendations.push(tx(locale, "report.recommendation.unknownTests"));
  }
  if (recommendations.length === 0) {
    recommendations.push(tx(locale, "report.recommendation.default"));
  }
  return recommendations;
}
