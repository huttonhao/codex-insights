import { basename, resolve } from "node:path";
import { collectCodexSession } from "../collectors/codexSessionCollector.js";
import { collectCommandEvidence } from "../collectors/commandEvidenceCollector.js";
import { collectGitContext } from "../collectors/gitCollector.js";
import { scanWorkspace } from "../collectors/workspaceScanner.js";
import type { CommandEvidenceSummary } from "../model/command.js";
import type { DataQuality } from "../model/dataQuality.js";
import { createDataQualityRecord, mergeDataQuality } from "../model/dataQuality.js";
import type {
  GenerateInsightsReportOptions,
  InsightReport,
  RepositoryInfo,
  ScanSummary
} from "../model/report.js";
import type { DeepTopicReport } from "../model/topic.js";
import type { ProjectProfile } from "../model/project.js";
import { analyzeRagProjects } from "./ragAnalyzer.js";
import { createBaselineTrend } from "./trends.js";

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

export function analyzeSession(input: SessionInsightInput): InsightReport {
  const now = input.generatedAt;
  const testsRunKnown = typeof input.testsRun === "number";
  return {
    schemaVersion: "2.0",
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
    deepTopics: []
  };
}

export async function generateInsightsReport(
  options: GenerateInsightsReportOptions
): Promise<InsightReport> {
  const startedAt = options.now ?? new Date().toISOString();
  const mode = options.mode ?? inferMode(options);
  const repoPath = resolve(options.repoPath ?? process.cwd());
  const workspacePath = resolve(options.workspacePath ?? repoPath);
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

  if (mode === "workspace") {
    const scan = await scanWorkspace({
      workspacePath,
      topics: options.topics,
      maxProjects: options.maxProjects,
      maxFilesPerProject: options.maxFilesPerProject,
      maxFileBytes: options.maxFileBytes,
      include: options.include,
      exclude: options.exclude
    });
    const projectCommandEvidence = await Promise.all(
      scan.projects.map((project) =>
        collectCommandEvidence({
          repoPath: project.path,
          suppressUnknownDataQuality: true
        })
      )
    );
    projects = scan.projects.map((project, index) => ({
      ...project,
      commandEvidence: projectCommandEvidence[index]
    }));
    scanNumbers = scan.summary;
    dataQuality.push(...scan.dataQuality);
    commandEvidence = aggregateWorkspaceCommandEvidence(projectCommandEvidence);
  } else if (mode === "repo") {
    const git = await collectGitContext(repoPath);
    dataQuality.push(...git.dataQuality);
    const scan = await scanWorkspace({
      workspacePath: repoPath,
      topics: options.topics,
      maxProjects: 1,
      maxFilesPerProject: options.maxFilesPerProject,
      maxFileBytes: options.maxFileBytes,
      include: options.include,
      exclude: options.exclude
    });
    commandEvidence = await collectCommandEvidence({ repoPath });
    projects = scan.projects.map((project) => ({
      ...project,
      commandEvidence
    }));
    scanNumbers = scan.summary;
    dataQuality.push(...scan.dataQuality);
    filesTouched = new Set([
      ...git.changedFiles,
      ...git.stagedFiles,
      ...git.untrackedFiles
    ]).size;
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
  const deepTopics = options.deep
    ? createDeepTopicReports(projects, options.topics, options.locale)
    : [];
  const repository = createRepositoryInfo(mode, repoPath, workspacePath);
  const scanSummary: ScanSummary = {
    mode,
    repoPath: mode === "workspace" ? undefined : repoPath,
    workspacePath: mode === "workspace" ? workspacePath : undefined,
    ...scanNumbers,
    startedAt,
    completedAt
  };

  const report: InsightReport = {
    schemaVersion: "2.0",
    id: createReportId(mode, repository, startedAt),
    sessionId,
    repository,
    generatedAt: completedAt,
    locale: options.locale,
    summary: {
      title: mode === "workspace" ? "Workspace deep analysis" : "Codex insight report",
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
      buildCommands: commandEvidence.buildCommands
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
    deepTopics
  };

  return report;
}

function inferMode(options: GenerateInsightsReportOptions): "session" | "repo" | "workspace" {
  if (options.workspacePath) return "workspace";
  if (options.repoPath) return "repo";
  if (options.sessionFile || options.sessionJson) return "session";
  return "repo";
}

function createDeepTopicReports(
  projects: ProjectProfile[],
  topics?: string[],
  locale: InsightReport["locale"] = "en-US"
): DeepTopicReport[] {
  const requested = topics?.length ? topics : ["rag"];
  return requested.includes("rag") ? [analyzeRagProjects(projects, locale)] : [];
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
  mode: "session" | "repo" | "workspace",
  repoPath: string,
  workspacePath: string
): RepositoryInfo {
  const root = mode === "workspace" ? workspacePath : repoPath;
  return {
    root,
    name: basename(root)
  };
}

function createReportId(
  mode: "session" | "repo" | "workspace",
  repository: RepositoryInfo,
  timestamp: string
): string {
  return `${mode}-${repository.name}-${timestamp}`;
}

function createNarrative(input: {
  mode: "session" | "repo" | "workspace";
  projects: ProjectProfile[];
  deepTopics: DeepTopicReport[];
  testsRunKnown: boolean;
  locale: InsightReport["locale"];
}): string {
  const rag = input.deepTopics.find((topic) => topic.topic === "rag");
  if (input.mode === "workspace" && rag) {
    if (input.locale === "zh-CN") {
      return `在扫描的 ${input.projects.length} 个项目中，有 ${rag.mentionedProjects} 个项目出现 RAG 相关证据。当前重点不是“有没有 RAG”，而是多个项目分别处在提及、设计、原型、局部实现和接近生产的不同成熟度，后续需要收敛为可复用的平台能力。`;
    }
    return `Scanned ${input.projects.length} projects. ${rag.mentionedProjects} projects contain RAG evidence, with maturity ranging from mention-only to production-ready.`;
  }
  if (input.mode === "workspace") {
    if (input.locale === "zh-CN") {
      return `扫描了 ${input.projects.length} 个项目，并生成 workspace 级洞察分析。`;
    }
    return `Scanned ${input.projects.length} projects and generated a workspace insight report.`;
  }
  if (!input.testsRunKnown) {
    if (input.locale === "zh-CN") {
      return "已生成仓库洞察分析，但没有找到可证明测试执行情况的命令证据。";
    }
    return "Generated a repository insight report. Test execution evidence is unknown.";
  }
  if (input.locale === "zh-CN") {
    return "已基于命令证据生成仓库洞察分析。";
  }
  return "Generated a repository insight report with command evidence.";
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
      locale === "zh-CN"
        ? `建议把 RAG 抽成平台能力：业务项目保留数据源、权限模型和业务 prompt；公共平台负责文档接入、切片、embedding、索引、召回、重排、引用校验、评估和观测。当前有 ${rag.mentionedProjects} 个项目出现 RAG 证据，继续分散实现会增加重复建设和评估口径不一致的风险。`
        : rag.platformizationRecommendation.reason
    );
  }
  if (unknownReason) {
    recommendations.push(
      locale === "zh-CN"
        ? "没有找到已执行的测试命令证据，因此报告只能标记测试状态未知，不能把它当作未执行或已执行。"
        : unknownReason
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      locale === "zh-CN"
        ? "继续保存基于证据的报告，以便后续生成更可靠的趋势比较。"
        : "Continue collecting evidence-backed reports to improve trend quality."
    );
  }
  return recommendations;
}
