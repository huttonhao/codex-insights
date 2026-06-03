import { basename, dirname, resolve } from "node:path";
import { collectCodexSession } from "../collectors/codexSessionCollector.js";
import { collectCodexSessionHistory } from "../collectors/codexSessionHistoryCollector.js";
import { collectCommandEvidence } from "../collectors/commandEvidenceCollector.js";
import { collectGitContext } from "../collectors/gitCollector.js";
import { scanWorkspace } from "../collectors/workspaceScanner.js";
import type { CommandEvidenceSummary } from "../model/command.js";
import type { DataQuality } from "../model/dataQuality.js";
import { createDataQualityRecord, mergeDataQuality } from "../model/dataQuality.js";
import { isLocale, tx } from "../i18n/index.js";
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
      title: "Session report",
      narrative: testsRunKnown
        ? `This session used ${input.toolCalls.length} tool calls, touched ${new Set(input.filesTouched).size} files, ran ${input.testsRun} test commands, and recorded ${input.warnings.length} warnings.`
        : `This session used ${input.toolCalls.length} tool calls, touched ${new Set(input.filesTouched).size} files, and recorded ${input.warnings.length} warnings. Test execution is unknown.`
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
        ? (isLocale(options.locale, "zh-CN") ? "Codex Insights 全量洞察报告" : "Codex Insights Full Report")
        : mode === "workspace" ? "Workspace deep analysis" : "Codex insight report",
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
    return isLocale(input.locale, "zh-CN")
      ? "已基于 Codex JSONL session history 生成个人使用洞察。未知指标会保留为 dataQuality，不会写成 0。"
      : "Generated personal usage insights from Codex JSONL session history. Unknown metrics are represented through dataQuality, not zeroes.";
  }
  const rag = input.deepTopics.find((topic) => topic.topic === "rag");
  if (input.mode === "workspace" && rag) {
    if (isLocale(input.locale, "zh-CN")) {
      return `在扫描的 ${input.projects.length} 个项目中，有 ${rag.mentionedProjects} 个项目出现 RAG 相关证据。当前重点不是“有没有 RAG”，而是多个项目分别处在提及、设计、原型、局部实现和接近生产的不同成熟度，后续需要收敛为可复用的平台能力。`;
    }
    return `Scanned ${input.projects.length} projects. ${rag.mentionedProjects} projects contain RAG evidence, with maturity ranging from mention-only to production-ready.`;
  }
  if (input.mode === "workspace") {
    if (isLocale(input.locale, "zh-CN")) {
      return `扫描了 ${input.projects.length} 个项目，并生成 workspace 级洞察分析。`;
    }
    return `Scanned ${input.projects.length} projects and generated a workspace insight report.`;
  }
  if (!input.testsRunKnown) {
    if (isLocale(input.locale, "zh-CN")) {
      return "已生成仓库洞察分析，但没有找到可证明测试执行情况的命令证据。";
    }
    return "Generated a repository insight report. Test execution evidence is unknown.";
  }
  if (isLocale(input.locale, "zh-CN")) {
    return "已基于命令证据生成仓库洞察分析。";
  }
  return "Generated a repository insight report with command evidence.";
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
  if (isLocale(input.locale, "zh-CN")) {
    return {
      atAGlance: [
        input.mode === "workspace"
          ? `扫描 ${input.projects.length} 个项目，生成跨项目技术雷达。`
          : "生成 Codex 洞察分析报告。"
      ],
      whatYouWorkOn: [
        rag ? `RAG 相关项目 ${rag.mentionedProjects}/${rag.totalProjects} 个。` : "当前报告没有足够的 session history 来判断个人工作主题。"
      ],
      howYouUseCodex: [
        input.testsRunKnown ? "报告找到了已执行测试命令证据。" : "测试执行情况未知，报告不会把 unknown 写成 0。"
      ],
      impressiveThings: [
        rag?.recommendedReferenceProjects.length
          ? `可作为参考实现的项目：${rag.recommendedReferenceProjects.join("、")}。`
          : "尚未形成可复用参考实现判断。"
      ],
      whereThingsGoWrong: [
        input.workspaceQuality?.projectsWithoutQualityEvidence
          ? `${input.workspaceQuality.projectsWithoutQualityEvidence} 个项目缺少质量证据。`
          : "未发现明确的质量证据缺口，或当前模式没有 workspace quality 数据。"
      ],
      featuresToTry: ["用 MCP/skill 固化重复的质量门禁和专题分析。"],
      suggestedAgentsAdditions: ["验收代码改动时，先运行 find、grep、git diff、git show，再运行 test/build。"],
      newWaysToUseCodex: ["定期运行 workspace deep report，观察技术雷达和趋势变化。"],
      onTheHorizon: ["把高频 topic 的 partial 项目迁移到 reference implementation 或公共平台能力。"]
    };
  }
  return {
    atAGlance: [input.mode === "workspace" ? `Scanned ${input.projects.length} projects.` : "Generated a Codex insight report."],
    whatYouWorkOn: [rag ? `${rag.mentionedProjects}/${rag.totalProjects} projects contain RAG evidence.` : "Session-history work themes are unavailable in this mode."],
    howYouUseCodex: [input.testsRunKnown ? "Executed test-command evidence was found." : "Test execution is unknown and is not converted to zero."],
    impressiveThings: [rag?.recommendedReferenceProjects.length ? `Reference candidates: ${rag.recommendedReferenceProjects.join(", ")}.` : "No reusable reference candidate was identified."],
    whereThingsGoWrong: [input.workspaceQuality?.projectsWithoutQualityEvidence ? `${input.workspaceQuality.projectsWithoutQualityEvidence} projects lack quality evidence.` : "No explicit quality gap was identified for this mode."],
    featuresToTry: ["Use MCP/skills to make repeated quality gates and topic analysis consistent."],
    suggestedAgentsAdditions: ["Run static inspection first: find, grep, git diff, git show; then run test/build."],
    newWaysToUseCodex: ["Run recurring workspace deep reports to track technology radar changes."],
    onTheHorizon: ["Migrate high-frequency partial topics toward reference implementations or platform modules."]
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
      isLocale(locale, "zh-CN")
        ? `建议把 RAG 抽成平台能力：业务项目保留数据源、权限模型和业务 prompt；公共平台负责文档接入、切片、embedding、索引、召回、重排、引用校验、评估和观测。当前有 ${rag.mentionedProjects} 个项目出现 RAG 证据，继续分散实现会增加重复建设和评估口径不一致的风险。`
        : rag.platformizationRecommendation.reason
    );
  }
  if (unknownReason) {
    recommendations.push(
      isLocale(locale, "zh-CN")
        ? "没有找到已执行的测试命令证据，因此报告只能标记测试状态未知，不能把它当作未执行或已执行。"
        : unknownReason
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      isLocale(locale, "zh-CN")
        ? "继续保存基于证据的报告，以便后续生成更可靠的趋势比较。"
        : "Continue collecting evidence-backed reports to improve trend quality."
    );
  }
  return recommendations;
}
