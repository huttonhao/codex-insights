import type { AnomalyIssue } from "../model/anomaly.js";
import type { AgentRuleSuggestion } from "../model/agentRuleSuggestion.js";
import type { DataQuality } from "../model/dataQuality.js";
import type { Evidence } from "../model/evidence.js";
import type {
  AgentRuleNarrative,
  EvidenceIndexItem,
  FullReportNarrative,
  NarrativeInsight,
  ProblemCategoryNarrative,
  ProjectRadarItem,
  RagDimensionNarrative,
  RagProjectNarrative,
  TopicDimensionNarrative,
  TopicNarrative
} from "../model/narrative.js";
import type { ProjectProfile } from "../model/project.js";
import type { InsightReport } from "../model/report.js";
import type { DeepTopicReport, ProjectTopicMaturity } from "../model/topic.js";
import { isLocale, tx } from "../i18n/index.js";
import { generateNextCodexPrompts } from "./actionPlanGenerator.js";
import {
  cleanSnippet,
  collectTopicEvidence,
  evidenceFiles,
  evidenceSnippets,
  formatEvidence
} from "./evidenceInterpreter.js";
import { priorityLabel, scorePriority } from "./priorityScorer.js";

const fullTopicOrder = [
  "rag",
  "agent",
  "llm-gateway",
  "auth",
  "billing",
  "observability",
  "security",
  "i18n",
  "workflow",
  "evaluation",
  "deployment",
  "ci",
  "testing",
  "data-pipeline",
  "model-dispatch",
  "audio-ai",
  "frontend-ui",
  "backend-api",
  "database",
  "sdk",
  "documentation"
];

const ragCriticalDimensions = [
  "source connectors / document ingestion",
  "document normalization / parsing",
  "chunking strategy",
  "metadata model",
  "embedding provider / embedding model",
  "vector store / index schema",
  "retrieval API",
  "hybrid search / keyword + vector",
  "reranking",
  "prompt assembly / context packing",
  "grounded generation / citations",
  "evaluation dataset",
  "observability / tracing",
  "access control / tenant isolation",
  "cache / incremental indexing",
  "failure handling / retries",
  "cost tracking",
  "tests / CI"
];

const agentDimensions = [
  "planner",
  "tool registry",
  "memory",
  "state machine",
  "execution sandbox",
  "human approval",
  "eval",
  "tracing",
  "failure recovery"
];

const gatewayDimensions = [
  "provider abstraction",
  "model routing",
  "pricing/billing",
  "rate limit",
  "fallback",
  "retry",
  "safety",
  "usage logging",
  "OpenAI compatible API",
  "SDK/documentation"
];

export function buildFullReportNarrative(
  report: InsightReport,
  anomalies: AnomalyIssue[] = report.anomalies ?? []
): FullReportNarrative {
  const topicOverview = buildTopicOverview(report);
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");
  const agent = report.deepTopics.find((topic) => topic.topic === "agent");
  const gateway = report.deepTopics.find((topic) => topic.topic === "llm-gateway");
  const evidenceIndex = buildEvidenceIndex(report);

  return {
    title: tx(report.locale, "report.title.full"),
    executiveSummary: buildExecutiveSummary(report, anomalies, topicOverview),
    coverage: {
      sessionCount: valueSentence(report, "sessions"),
      projectCount: `${report.scanSummary.projectsScanned}`,
      fileCount: `${report.scanSummary.filesScanned} scanned / ${report.scanSummary.skippedFiles} skipped`,
      topicCount: `${report.deepTopics.length}`,
      dataGaps: report.dataQuality.length
        ? report.dataQuality.slice(0, 6).map((item) => `${item.source}: ${item.status} - ${item.reason}`)
        : [tx(report.locale, "common.noBlockingDataQuality")],
      confidence: computeConfidence(report, anomalies),
      confidenceReason: confidenceReason(report, anomalies)
    },
    recentWork: buildRecentWork(report),
    codexUsage: buildCodexUsage(report),
    projectRadar: buildProjectRadar(report),
    workspaceQuality: buildWorkspaceQualityNarrative(report),
    topicOverview,
    rag: {
      projects: buildRagProjectNarratives(rag),
      dimensions: buildRagDimensions(rag),
      roadmap: buildRagRoadmap(rag, report.locale)
    },
    agentLlmGateway: {
      agent: buildTopicDimensions(agent, agentDimensions, report.locale),
      llmGateway: buildTopicDimensions(gateway, gatewayDimensions, report.locale),
      findings: buildAgentGatewayFindings(agent, gateway, report.locale)
    },
    problems: buildProblemCategories(report, anomalies),
    strengths: buildStrengths(report),
    agentRules: buildAgentRuleNarratives(report.agentRuleSuggestions, report),
    nextPrompts: generateNextCodexPrompts(report),
    dataQuality: {
      confidence: computeConfidence(report, anomalies),
      sources: dataSources(report),
      unknowns: report.dataQuality.map((item) => `${item.source}: ${item.reason}`).slice(0, 8),
      suspiciousMetrics: anomalies.map((item) => `${item.title}: ${item.explanation}`),
      caveats: buildCaveats(report, anomalies)
    },
    trend: buildTrendNarrative(report),
    evidenceIndex,
    anomalies
  };
}

export { fullTopicOrder };

function buildExecutiveSummary(
  report: InsightReport,
  anomalies: AnomalyIssue[],
  topicOverview: TopicNarrative[]
): NarrativeInsight[] {
  const zh = isLocale(report.locale, "zh-CN");
  const insights: NarrativeInsight[] = [];
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");
  const platformTopics = topicOverview.filter((topic) => topic.platformization.includes(zh ? "适合" : "suitable"));
  const riskyQualityProjects = report.projects.filter((project) =>
    !project.qualitySummary?.hasTestScript || !project.qualitySummary?.hasCi
  );

  if (report.codexHistory) {
    insights.push({
      conclusion: zh
        ? `本次报告解析了 ${report.codexHistory.qualifyingSessions} 个有效 Codex session，并结合 workspace 扫描形成全量视角。`
        : `This report parsed ${report.codexHistory.qualifyingSessions} qualifying Codex sessions and combines them with workspace scan evidence.`,
      evidence: [
        `codexHistory.parsedSessions=${report.codexHistory.parsedSessions}`,
        `workspace.projectsScanned=${report.scanSummary.projectsScanned}`
      ],
      explanation: zh
        ? "这让报告既能回答最近怎么用 Codex，也能回答项目资产的技术现状。"
        : "This lets the report explain both recent Codex usage and project-level technical state.",
      risk: report.dataQuality.length
        ? (zh ? "部分 session 字段仍是 best-effort，结论需要结合 dataQuality 阅读。" : "Some session fields are best-effort; read conclusions with dataQuality notes.")
        : tx(report.locale, "common.noBlockingDataQuality"),
      nextAction: zh
        ? "后续优先修复 dataQuality 中的缺口，再比较趋势。"
        : "Prioritize data-quality gaps before using trend changes for decisions.",
      priority: report.dataQuality.length ? "P2" : "P3",
      projects: topProjects(report),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  if (rag && rag.mentionedProjects > 0) {
    const production = rag.maturityDistribution.production_ready;
    insights.push({
      conclusion: zh
        ? `RAG 覆盖 ${rag.mentionedProjects}/${rag.totalProjects} 个项目，但 production_ready 只有 ${production} 个。`
        : `RAG appears in ${rag.mentionedProjects}/${rag.totalProjects} projects, but only ${production} are production-ready.`,
      evidence: rag.crossProjectFindings.concat(evidenceSnippets(collectTopicEvidence(rag), 2)),
      explanation: zh
        ? "核心判断不是有没有 RAG，而是是否具备 ingestion、chunking、embedding、retrieval、eval、observability、ACL 和 tests/CI 的闭环。"
        : "The key question is not whether RAG exists, but whether ingestion, chunking, embeddings, retrieval, eval, observability, ACL, and tests/CI form a complete chain.",
      risk: rag.duplicationRisks[0] ?? (zh ? "多个项目可能各自维护半套检索链路。" : "Several projects may maintain partial retrieval stacks."),
      nextAction: zh
        ? "先以最成熟项目作为 reference candidate，抽取公共 RAG 模块，不要立即重写所有业务项目。"
        : "Use the strongest project as a reference candidate and extract shared RAG modules before rewriting product projects.",
      priority: scorePriority({ affectedProjects: rag.mentionedProjects, missingCriticalCount: missingCriticalCount(rag) }),
      projects: rag.projectMaturity.map((project) => project.projectName),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  if (platformTopics.length) {
    insights.push({
      conclusion: zh
        ? `有 ${platformTopics.length} 个 topic 出现平台化机会。`
        : `${platformTopics.length} topics show platformization opportunities.`,
      evidence: platformTopics.slice(0, 4).map((topic) => `${topic.topic}: ${topic.platformization}`),
      explanation: zh
        ? "平台化机会来自多个项目重复出现的实现信号，而不是单个项目的想法。"
        : "These opportunities come from repeated implementation signals across projects, not a single project idea.",
      risk: zh
        ? "如果不收敛，会继续形成重复建设和质量门禁不一致。"
        : "Without convergence, duplicated implementation and inconsistent quality gates will continue.",
      nextAction: zh
        ? "按 P1/P2 优先级先收敛 RAG、Agent、LLM Gateway 或质量门禁。"
        : "Converge RAG, Agent, LLM Gateway, or quality gates by P1/P2 priority.",
      priority: "P1",
      projects: unique(platformTopics.flatMap((topic) => topic.involvedProjects)).slice(0, 8),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  if (riskyQualityProjects.length) {
    insights.push({
      conclusion: zh
        ? `${riskyQualityProjects.length} 个项目缺少 test script 或 CI 证据，质量门禁是下一轮最直接的改进点。`
        : `${riskyQualityProjects.length} projects lack test script or CI evidence; quality gates are the most direct next improvement.`,
      evidence: riskyQualityProjects.slice(0, 5).map((project) =>
        `${project.name}: testScript=${yesNo(project.qualitySummary?.hasTestScript, report.locale)}, CI=${yesNo(project.qualitySummary?.hasCi, report.locale)}`
      ),
      explanation: zh
        ? "topic 深度提升前，先补可重复验证的质量证据，否则 Codex 很容易进入改完但无法验收的状态。"
        : "Before raising topic maturity, add repeatable verification evidence; otherwise Codex changes remain hard to validate.",
      risk: zh ? "缺少质量门禁会放大 RAG/Agent 等复杂能力的回归风险。" : "Weak quality gates amplify regression risk for complex RAG/Agent work.",
      nextAction: zh ? "按质量矩阵的优先顺序补 test script、test files、CI 和 build config。" : "Patch test scripts, test files, CI, and build config in quality-matrix order.",
      priority: "P1",
      projects: riskyQualityProjects.map((project) => project.name),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  for (const anomaly of anomalies.slice(0, 2)) {
    insights.push({
      conclusion: anomaly.title,
      evidence: [`${anomaly.metric}=${anomaly.value}`],
      explanation: anomaly.explanation,
      risk: anomaly.impact,
      nextAction: anomaly.nextAction,
      priority: anomaly.severity === "critical" ? "P0" : "P2",
      projects: [],
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  return insights.slice(0, 7);
}

function buildRecentWork(report: InsightReport): NarrativeInsight[] {
  const zh = isLocale(report.locale, "zh-CN");
  const projects = report.usageAnalytics?.projectBreakdown?.slice(0, 5) ?? [];
  if (projects.length) {
    return projects.map((project) => ({
      conclusion: zh
        ? `${displayProjectName(project.projectName, report.locale)} 是近期 Codex 投入主线之一。`
        : `${displayProjectName(project.projectName, report.locale)} is one of the recent Codex work streams.`,
      evidence: [
        `sessions=${project.sessions}`,
        `messages=${project.messages}`,
        `toolCalls=${project.toolCalls}`,
        `filesModified=${valueOrNotDetected(project.filesModified, report.locale)}`
      ],
      explanation: zh
        ? "判断依据是 session、message 和 tool call 同时集中，而不是只看项目名出现。"
        : "This is based on sessions, messages, and tool calls together, not just project-name appearance.",
      risk: project.toolErrors
        ? (zh ? `该项目记录到 ${project.toolErrors} 个工具错误，可能存在低产出循环。` : `${project.toolErrors} tool errors may indicate low-output loops.`)
        : (zh ? "未发现明显工具错误，但仍需结合命令失败情况判断产出质量。" : "No clear tool-error concentration was detected; command failures still matter."),
      nextAction: zh
        ? "把该项目的重复工作流沉淀成 AGENTS.md 规则或项目脚本。"
        : "Convert repeated workflows into AGENTS.md rules or project scripts.",
      priority: project.toolErrors ? "P1" : "P2",
      projects: [displayProjectName(project.projectName, report.locale)],
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    }));
  }

  return report.projects.slice(0, 5).map((project) => ({
    conclusion: tx(report.locale, "report.recentWork.inferred", { project: project.name }),
    evidence: collectProjectEvidenceText(project),
    explanation: tx(report.locale, "report.recentWork.inferredExplain"),
    risk: tx(report.locale, "report.recentWork.inferredRisk"),
    nextAction: tx(report.locale, "report.recentWork.inferredAction"),
    priority: "P3",
    projects: [project.name],
    dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
  }));
}

function buildCodexUsage(report: InsightReport): NarrativeInsight[] {
  const zh = isLocale(report.locale, "zh-CN");
  const usage = report.usageAnalytics;
  const commandStats = usage?.commandStats;
  const failed = commandStats?.failedCommands ?? 0;
  const commands = commandStats?.totalCommands ?? 0;
  const toolCalls = usage?.toolCalls ?? report.metrics.toolCalls;
  const messages = usage?.totalMessages;
  return [
    {
      conclusion: zh
        ? `Codex 使用方式偏向 ${commands > 0 ? "命令驱动的实现/验证" : toolCalls > 0 ? "工具辅助的代码操作" : "问答或轻量分析"}。`
        : `Codex usage is currently ${commands > 0 ? "command-driven implementation/verification" : toolCalls > 0 ? "tool-assisted code work" : "question-answer or lightweight analysis"}.`,
      evidence: [
        `messages=${valueOrNotDetected(messages, report.locale)}`,
        `toolCalls=${toolCalls}`,
        `commands=${valueOrNotDetected(commands, report.locale)}`
      ],
      explanation: zh
        ? "message、tool call 和 command 的比例能区分问答、查代码、改代码、跑命令和修测试。"
        : "The mix of messages, tool calls, and commands separates Q&A, code search, edits, command execution, and test fixing.",
      risk: failed > 0
        ? (zh ? `失败命令 ${failed}/${commands}，存在返工循环。` : `${failed}/${commands} commands failed, suggesting correction loops.`)
        : (zh ? "当前没有集中失败命令证据。" : "No concentrated failed-command evidence was detected."),
      nextAction: failed > 0
        ? (zh ? "把失败命令的修复策略写入 AGENTS.md，并优先静态检查。" : "Document failed-command remediation in AGENTS.md and run static checks first.")
        : (zh ? "继续把有效 prompt 模式沉淀成规则。" : "Keep turning effective prompt patterns into rules."),
      priority: failed > 0 ? "P1" : "P2",
      projects: topProjects(report),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    }
  ];
}

function buildProjectRadar(report: InsightReport): ProjectRadarItem[] {
  return report.projects.map((project) => {
    const topics = project.topics.map((topic) => topic.topic);
    const productionTopics = Object.entries(project.maturityByTopic)
      .filter(([, maturity]) => maturity === "production_ready")
      .map(([topic]) => topic);
    const weakQuality = !project.qualitySummary?.hasTestScript || !project.qualitySummary?.hasCi;
    const role: ProjectRadarItem["role"] =
      productionTopics.length >= 2
        ? "platform"
        : weakQuality
          ? "risk"
          : topics.length <= 1
            ? "experiment"
            : "business";
    return {
      project: project.name,
      role,
      topics,
      judgment: projectJudgment(project, role, report.locale),
      evidence: collectProjectEvidenceText(project).slice(0, 3),
      risk: weakQuality
        ? tx(report.locale, "report.projectRadar.qualityRisk")
        : tx(report.locale, "report.projectRadar.noImmediateRisk"),
      nextAction: weakQuality
        ? tx(report.locale, "report.projectRadar.qualityAction")
        : tx(report.locale, "report.projectRadar.defaultAction"),
      priority: weakQuality ? "P1" : "P2"
    };
  });
}

function buildWorkspaceQualityNarrative(report: InsightReport) {
  const zh = isLocale(report.locale, "zh-CN");
  const projects = report.projects;
  const missingTest = projects.filter((project) => !project.qualitySummary?.hasTestScript);
  const missingCi = projects.filter((project) => !project.qualitySummary?.hasCi);
  const missingTests = projects.filter((project) => !project.qualitySummary?.hasTestFiles);
  const findings: NarrativeInsight[] = [
    {
      conclusion: zh
        ? `${missingTest.length} 个项目缺 test script，${missingCi.length} 个项目缺 CI，${missingTests.length} 个项目缺 test files。`
        : `${missingTest.length} projects lack test scripts, ${missingCi.length} lack CI, and ${missingTests.length} lack test files.`,
      evidence: projects.slice(0, 8).map((project) =>
        `${project.name}: testScript=${yesNo(project.qualitySummary?.hasTestScript, report.locale)}, CI=${yesNo(project.qualitySummary?.hasCi, report.locale)}, testFiles=${yesNo(project.qualitySummary?.hasTestFiles, report.locale)}`
      ),
      explanation: zh
        ? "质量矩阵不是只展示表格；它决定哪些项目可以继续推进复杂能力，哪些必须先补验收链路。"
        : "The quality matrix determines which projects can safely advance complex work and which need verification first.",
      risk: zh ? "缺 test/CI 的项目会让 Codex 改动无法稳定验收。" : "Projects without test/CI evidence make Codex changes hard to validate.",
      nextAction: zh ? "优先补 test script，再补最小 test file，最后接入 CI。" : "Add test script first, then a minimal test file, then CI.",
      priority: missingTest.length || missingCi.length ? "P1" : "P3",
      projects: unique([...missingTest, ...missingCi, ...missingTests].map((project) => project.name)),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    }
  ];
  return {
    findings,
    priorityOrder: unique([
      ...missingTest.map((project) => `${project.name}: add test script`),
      ...missingTests.map((project) => `${project.name}: add test files`),
      ...missingCi.map((project) => `${project.name}: add CI`)
    ]).slice(0, 12),
    commandSuggestions: [
      "git status --short",
      "git diff --stat",
      "find . -maxdepth 3 -type f | sort",
      "grep -R \"TODO\\|FIXME\\|placeholder\" -n . || true",
      "npm test / pnpm test / go test ./... / pytest based on project stack",
      "npm run build / go build ./... after static checks pass"
    ],
    missingVsUnknown: report.dataQuality.length
      ? report.dataQuality.map((item) => `${item.source}: ${item.status} - ${item.reason}`).slice(0, 6)
      : [tx(report.locale, "report.workspaceQuality.noUnknown")]
  };
}

function buildTopicOverview(report: InsightReport): TopicNarrative[] {
  return report.deepTopics.map((topic) => {
    const strongest = topic.recommendedReferenceProjects[0] ?? bestProject(topic)?.projectName ?? tx(report.locale, "report.topic.noReference");
    const biggestGap = mostCommonMissingDimension(topic) ?? tx(report.locale, "report.topic.noGap");
    const platform = topic.platformizationRecommendation.shouldPlatformize
      ? (isLocale(report.locale, "zh-CN")
          ? `适合平台化：${topic.platformizationRecommendation.reason}`
          : `Suitable for platformization: ${topic.platformizationRecommendation.reason}`)
      : (isLocale(report.locale, "zh-CN")
          ? `暂缓平台化：${topic.platformizationRecommendation.reason}`
          : `Defer platformization: ${topic.platformizationRecommendation.reason}`);
    return {
      topic: topic.topic,
      involvedProjects: topic.projectMaturity.map((project) => project.projectName),
      maturitySummary: distributionText(topic),
      strongestProject: strongest,
      biggestGap,
      platformization: platform,
      nextAction: topic.platformizationRecommendation.migrationPlan[0] ?? firstProjectAction(topic),
      priority: scorePriority({
        affectedProjects: topic.mentionedProjects,
        missingCriticalCount: missingCriticalCount(topic)
      }),
      evidence: evidenceSnippets(collectTopicEvidence(topic), 3)
    };
  });
}

function buildRagProjectNarratives(rag?: DeepTopicReport): RagProjectNarrative[] {
  return (rag?.projectMaturity ?? []).map((project) => ({
    project: project.projectName,
    maturity: project.maturity,
    evidenceFiles: evidenceFiles(project.evidence),
    implementedDimensions: project.implementedDimensions,
    missingCriticalDimensions: project.missingDimensions.filter((dimension) =>
      ragCriticalDimensions.includes(dimension)
    ),
    risk: project.risks[0] ?? "No major risk was detected from collected evidence.",
    nextAction: project.recommendedNextActions[0] ?? "Keep collecting stronger evidence before changing architecture."
  }));
}

function buildRagDimensions(rag?: DeepTopicReport): RagDimensionNarrative[] {
  return ragCriticalDimensions.map((dimension) => {
    const projects = rag?.projectMaturity ?? [];
    const withEvidence = projects
      .filter((project) => project.implementedDimensions.includes(dimension))
      .map((project) => project.projectName);
    const missing = projects
      .filter((project) => !project.implementedDimensions.includes(dimension))
      .map((project) => project.projectName);
    const evidence = projects
      .filter((project) => project.implementedDimensions.includes(dimension))
      .flatMap((project) => evidenceSnippets(project.evidence, 1))
      .slice(0, 3);
    return {
      dimension,
      projectsWithEvidence: withEvidence,
      projectsMissing: missing,
      evidence,
      platformize: shouldPlatformizeRagDimension(dimension),
      interpretation: withEvidence.length
        ? `${dimension} has evidence in ${withEvidence.join(", ")}; missing in ${missing.slice(0, 5).join(", ") || "no scanned RAG project"}.`
        : `${dimension} has no strong project evidence yet; do not treat it as platform-ready.`
    };
  });
}

function buildRagRoadmap(rag: DeepTopicReport | undefined, locale: "en-US" | "zh-CN") {
  const reference = rag?.recommendedReferenceProjects[0] ?? (isLocale(locale, "zh-CN") ? "暂无 reference project" : "No reference project yet");
  const rejected = (rag?.projectMaturity ?? [])
    .filter((project) => project.projectName !== reference && project.maturity !== "production_ready")
    .slice(0, 4)
    .map((project) => `${project.projectName}: ${project.maturity}, missing ${project.missingDimensions.slice(0, 3).join(", ")}`);
  return {
    referenceProject: reference,
    rejectedReferences: rejected.length ? rejected : [isLocale(locale, "zh-CN") ? "没有足够证据排除其他项目，但仍应优先选择成熟度最高者。" : "No strong rejection evidence for other projects; still prefer the strongest maturity candidate."],
    sharedModules: [
      "Source Connector",
      "Document Normalizer",
      "Chunker",
      "Embedding Adapter",
      "Vector Index",
      "Retriever",
      "Reranker",
      "Citation Verifier",
      "Evaluation Harness",
      "Observability",
      "ACL / Tenant Isolation"
    ],
    businessBoundaries: [
      "data source ownership",
      "permission policy",
      "business prompt",
      "domain ranking signals",
      "product-specific UX"
    ],
    phaseOne: [
      "Freeze duplicated RAG infrastructure changes except critical fixes.",
      "Select reference project and document ingestion -> retrieval evidence.",
      "Add eval, observability, ACL, and tests around the reference chain."
    ],
    phaseTwo: [
      "Extract connector/chunker/embedding/vector/retriever interfaces.",
      "Migrate one partial project as pilot.",
      "Add citation verifier and regression evaluation gates."
    ],
    phaseThree: [
      "Move repeated RAG modules into shared platform package.",
      "Require platform APIs for new business RAG work.",
      "Track cost, latency, recall, and grounded generation metrics."
    ],
    defer: [
      "Do not rewrite every business project before reference evidence is stable.",
      "Do not standardize reranking before evaluation data exists.",
      "Do not platformize tenant-sensitive retrieval without ACL evidence."
    ]
  };
}

function buildTopicDimensions(
  topic: DeepTopicReport | undefined,
  dimensions: string[],
  locale: "en-US" | "zh-CN"
): TopicDimensionNarrative[] {
  const projects = topic?.projectMaturity ?? [];
  return dimensions.map((dimension) => {
    const matched = projects.filter((project) =>
      project.implementedDimensions.some((item) =>
        item.toLowerCase().includes(dimension.toLowerCase().split("/")[0])
      )
    );
    return {
      dimension,
      currentState: matched.length
        ? `${matched.map((project) => project.projectName).join(", ")} contain related evidence.`
        : `${dimension} evidence is not strong in scanned projects.`,
      evidence: matched.flatMap((project) => evidenceSnippets(project.evidence, 1)).slice(0, 3),
      risk: matched.length
        ? "Capability exists somewhere, but consistency and quality gates still need review."
        : "Missing evidence blocks reference implementation status.",
      nextAction: isLocale(locale, "zh-CN")
        ? `补齐 ${dimension} 的接口、测试和运行证据。`
        : `Add interface, test, and runtime evidence for ${dimension}.`
    };
  });
}

function buildAgentGatewayFindings(
  agent: DeepTopicReport | undefined,
  gateway: DeepTopicReport | undefined,
  locale: "en-US" | "zh-CN"
): NarrativeInsight[] {
  return [
    {
      conclusion: isLocale(locale, "zh-CN")
        ? `Agent 涉及 ${agent?.mentionedProjects ?? 0} 个项目，LLM Gateway 涉及 ${gateway?.mentionedProjects ?? 0} 个项目。`
        : `Agent appears in ${agent?.mentionedProjects ?? 0} projects; LLM Gateway appears in ${gateway?.mentionedProjects ?? 0}.`,
      evidence: [
        agent?.crossProjectFindings[0] ?? "No Agent evidence report was generated.",
        gateway?.crossProjectFindings[0] ?? "No LLM Gateway evidence report was generated."
      ],
      explanation: isLocale(locale, "zh-CN")
        ? "Agent 和 Gateway 应分层治理：Agent 关注任务执行链路，Gateway 关注模型访问、治理和成本。"
        : "Agent and Gateway should be governed separately: Agent owns task execution; Gateway owns model access, policy, and cost.",
      risk: isLocale(locale, "zh-CN")
        ? "如果混在业务项目中，会造成工具协议、模型路由和审计口径分散。"
        : "If they stay mixed in product projects, tool contracts, routing, and audit standards fragment.",
      nextAction: isLocale(locale, "zh-CN")
        ? "先定义 Agent runtime 与 LLM Gateway 的边界，再抽公共模块。"
        : "Define Agent runtime and LLM Gateway boundaries before extracting shared modules.",
      priority: "P2",
      projects: unique([
        ...(agent?.projectMaturity.map((project) => project.projectName) ?? []),
        ...(gateway?.projectMaturity.map((project) => project.projectName) ?? [])
      ]),
      dataQualityNote: "Evidence comes from scanned project files and maturity reports."
    }
  ];
}

function buildProblemCategories(
  report: InsightReport,
  anomalies: AnomalyIssue[]
): ProblemCategoryNarrative[] {
  const stats = report.usageAnalytics?.commandStats;
  const categories = Object.entries(stats?.failureCategories ?? {});
  const problems = categories.map(([category, count]) => ({
    category,
    count,
    projects: topProjects(report),
    snippet: `${category}: ${count}`,
    rootCause: categoryRootCause(category, report.locale),
    fixStrategy: categoryFixStrategy(category, report.locale),
    needsAgentRule: count > 0
  }));

  for (const anomaly of anomalies) {
    problems.push({
      category: anomaly.title,
      count: 1,
      projects: [],
      snippet: `${anomaly.metric}=${anomaly.value}`,
      rootCause: anomaly.explanation,
      fixStrategy: anomaly.nextAction,
      needsAgentRule: anomaly.severity !== "info"
    });
  }

  if (!problems.length) {
    problems.push({
      category: isLocale(report.locale, "zh-CN") ? "未发现集中失败类别" : "No concentrated failure category",
      count: 0,
      projects: topProjects(report),
      snippet: isLocale(report.locale, "zh-CN") ? "当前 session/command evidence 没有足够失败样本。" : "Current session/command evidence has no strong failure sample.",
      rootCause: isLocale(report.locale, "zh-CN") ? "可能是真的没有失败，也可能是未采集到执行命令。" : "There may be no failures, or command execution may not have been captured.",
      fixStrategy: isLocale(report.locale, "zh-CN") ? "继续采集 Codex JSONL 和执行命令 evidence。" : "Keep collecting Codex JSONL and executed-command evidence.",
      needsAgentRule: false
    });
  }
  return problems;
}

function buildStrengths(report: InsightReport): NarrativeInsight[] {
  const zh = isLocale(report.locale, "zh-CN");
  const strongTopics = report.deepTopics
    .flatMap((topic) => topic.projectMaturity.map((project) => ({ topic, project })))
    .filter(({ project }) => project.maturity === "production_ready" || project.maturity === "partial")
    .slice(0, 5);
  return strongTopics.length
    ? strongTopics.map(({ topic, project }) => ({
        conclusion: zh
          ? `${project.projectName} 在 ${topic.topic} 上已有可复用信号。`
          : `${project.projectName} has reusable ${topic.topic} signals.`,
        evidence: evidenceSnippets(project.evidence, 3),
        explanation: zh
          ? "成熟度和 evidence 同时存在，说明它比单纯文档设计更接近 reference candidate。"
          : "Maturity and evidence both exist, making it stronger than design-only projects.",
        risk: project.risks[0] ?? (zh ? "仍需补齐生产维度后再平台化。" : "Production dimensions still need review before platformization."),
        nextAction: project.recommendedNextActions[0] ?? (zh ? "抽取接口和质量门禁。" : "Extract interfaces and quality gates."),
        priority: "P2",
        projects: [project.projectName],
        dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
      }))
    : [
        {
          conclusion: zh ? "当前没有足够 production/partial 证据证明某个 topic 可直接复用。" : "No topic has enough production/partial evidence for immediate reuse.",
          evidence: ["Deep topic reports did not produce strong reference candidates."],
          explanation: zh ? "这说明下一轮应先补 evidence 和质量门禁，而不是直接平台化。" : "The next step is evidence and quality gates, not immediate platformization.",
          risk: zh ? "过早抽平台会固化不成熟实现。" : "Premature platform extraction can freeze immature design.",
          nextAction: zh ? "先补测试、CI、eval、observability 和 security evidence。" : "Add test, CI, eval, observability, and security evidence first.",
          priority: "P2",
          projects: topProjects(report),
          dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
        }
      ];
}

function buildAgentRuleNarratives(
  suggestions: AgentRuleSuggestion[] | undefined,
  report: InsightReport
): AgentRuleNarrative[] {
  const fallbackRules: AgentRuleSuggestion[] = [
    {
      id: "static-first-quality-gate",
      title: isLocale(report.locale, "zh-CN") ? "先静态检查，再测试构建" : "Run static checks before test/build",
      ruleText: isLocale(report.locale, "zh-CN")
        ? "验收代码改动时，先运行 git status --short、git diff --stat、find、grep；静态检查通过后，再运行项目对应的 test/build 命令。"
        : "When validating code changes, run git status --short, git diff --stat, find, and grep first; after static checks pass, run project test/build commands.",
      reason: isLocale(report.locale, "zh-CN")
        ? "当前报告需要可重复的质量证据，静态检查能先发现误改和残留不完整实现。"
        : "The report needs repeatable quality evidence; static checks catch wrong files and incomplete implementation first.",
      evidence: buildEvidenceIndex(report).slice(0, 3).map((item) => ({
        projectName: item.project,
        filePath: item.filePath,
        signal: item.signal,
        snippet: item.snippet,
        confidence: item.confidence === "high" || item.confidence === "medium" || item.confidence === "low" ? item.confidence : "medium"
      })),
      appliesTo: {},
      severity: "recommended"
    }
  ];
  const rules = suggestions?.length
    ? suggestions
    : fallbackRules;

  return rules.map((rule) => ({
    title: rule.title || "Static-first validation rule",
    ruleText: rule.ruleText || "Run static checks before test/build commands.",
    reason: rule.reason || "This rule is recommended by Codex Insights based on report evidence.",
    evidence: rule.evidence.length
      ? rule.evidence.map(formatEvidence).slice(0, 5)
      : ["Report-level evidence: workspace scan and command evidence indicate this rule is useful."],
    appliesTo: appliesToText(rule, report),
    severity: rule.severity,
    target: rule.appliesTo.projects?.length === 1 ? "project" : rule.appliesTo.projects?.length ? "workspace" : "global"
  }));
}

function buildTrustFromStatus(dataQuality: DataQuality[]): "high" | "medium" | "low" {
  if (dataQuality.some((item) => item.status === "unavailable")) return "low";
  if (dataQuality.some((item) => item.status === "partial" || item.status === "missing")) return "medium";
  return "high";
}

function computeConfidence(report: InsightReport, anomalies: AnomalyIssue[]): "high" | "medium" | "low" {
  if (anomalies.some((item) => item.severity === "critical")) return "low";
  const fromData = buildTrustFromStatus(report.dataQuality);
  if (fromData === "low") return "low";
  if (fromData === "medium" || anomalies.length) return "medium";
  return "high";
}

function confidenceReason(report: InsightReport, anomalies: AnomalyIssue[]): string {
  if (isLocale(report.locale, "zh-CN")) {
    return `可信度由数据缺口 ${report.dataQuality.length} 项、可疑指标 ${anomalies.length} 项、evidence snippet ${buildEvidenceIndex(report).length} 条共同决定。`;
  }
  return `Confidence is based on ${report.dataQuality.length} data-quality gaps, ${anomalies.length} anomalies, and ${buildEvidenceIndex(report).length} evidence snippets.`;
}

function buildCaveats(report: InsightReport, anomalies: AnomalyIssue[]): string[] {
  const zh = isLocale(report.locale, "zh-CN");
  return [
    zh ? "Codex JSONL 是 best-effort 本地解析，不是官方稳定 analytics API。" : "Codex JSONL parsing is best-effort local analysis, not an official stable analytics API.",
    zh ? "LLM facets 如启用，也只是归纳，不覆盖结构化 evidence。" : "LLM facets, when enabled, summarize; they do not override structured evidence.",
    ...(anomalies.length
      ? anomalies.map((item) => `${item.title}: ${item.impact}`)
      : [zh ? "未发现需要单独解释的可疑指标。" : "No suspicious metric required special explanation."])
  ];
}

function buildTrendNarrative(report: InsightReport): string[] {
  const zh = isLocale(report.locale, "zh-CN");
  if (report.trend.kind === "baseline") {
    return [
      zh
        ? "这是当前 scope 的第一份可比报告，不能做趋势判断。"
        : "This is the first comparable report for the current scope, so no trend judgment is available.",
      zh
        ? "下一次保存报告后，应重点比较项目数、topic mentions、RAG maturity、风险新增/解除和重复建议。"
        : "After the next saved report, compare project count, topic mentions, RAG maturity, new/resolved risks, and repeated recommendations."
    ];
  }
  const deltas = report.trend.deltas;
  return [
    zh
      ? `项目扫描变化：${signed(deltas.projectsScanned)}；文件扫描变化：${signed(deltas.filesScanned)}；跳过文件变化：${signed(deltas.skippedFiles)}。`
      : `Projects scanned changed by ${signed(deltas.projectsScanned)}; files scanned by ${signed(deltas.filesScanned)}; skipped files by ${signed(deltas.skippedFiles)}.`,
    zh
      ? `新增风险 ${deltas.newRisks?.length ?? 0} 项，解除风险 ${deltas.resolvedRisks?.length ?? 0} 项，重复建议 ${deltas.repeatedRecommendedActions?.length ?? 0} 项。`
      : `${deltas.newRisks?.length ?? 0} new risks, ${deltas.resolvedRisks?.length ?? 0} resolved risks, and ${deltas.repeatedRecommendedActions?.length ?? 0} repeated recommendations.`
  ];
}

function buildEvidenceIndex(report: InsightReport): EvidenceIndexItem[] {
  const items: EvidenceIndexItem[] = [];
  for (const topic of report.deepTopics) {
    for (const project of topic.projectMaturity) {
      for (const evidence of project.evidence) {
        items.push({
          project: evidence.projectName,
          filePath: evidence.lineStart ? `${evidence.filePath}:${evidence.lineStart}` : evidence.filePath,
          snippet: cleanSnippet(evidence.snippet),
          signal: evidence.signal,
          topic: topic.topic,
          confidence: evidence.confidence
        });
      }
    }
  }
  for (const project of report.projects) {
    for (const evidence of project.evidence.slice(0, 3)) {
      items.push({
        project: evidence.projectName,
        filePath: evidence.lineStart ? `${evidence.filePath}:${evidence.lineStart}` : evidence.filePath,
        snippet: cleanSnippet(evidence.snippet),
        signal: evidence.signal,
        topic: project.topics[0]?.topic ?? "project-profile",
        confidence: evidence.confidence
      });
    }
  }
  return uniqueBy(items, (item) => `${item.project}:${item.filePath}:${item.signal}`).slice(0, 80);
}

function dataSources(report: InsightReport): string[] {
  const sources = [
    report.codexHistory ? "Codex JSONL rollout history" : "",
    report.projects.length ? "workspace scanner" : "",
    report.scanSummary.repoPath ? "git/repo context" : "",
    report.deepTopics.length ? "topic analyzers" : "",
    report.sessionFacets?.length ? "heuristic or LLM session facets" : ""
  ].filter(Boolean);
  return sources.length ? sources : ["report metadata only"];
}

function valueSentence(report: InsightReport, kind: "sessions"): string {
  if (kind === "sessions") {
    return report.codexHistory
      ? `${report.codexHistory.qualifyingSessions}`
      : `${report.usageAnalytics?.totalSessions ?? 0}`;
  }
  return "0";
}

function topProjects(report: InsightReport): string[] {
  const fromUsage = report.usageAnalytics?.projectBreakdown
    ?.filter((project) => project.projectName !== "unknown")
    .map((project) => project.projectName)
    .slice(0, 5);
  return fromUsage?.length ? fromUsage : report.projects.map((project) => project.name).slice(0, 5);
}

function missingCriticalCount(topic: DeepTopicReport): number {
  return topic.projectMaturity.reduce(
    (count, project) => count + project.missingDimensions.filter((dimension) => ragCriticalDimensions.includes(dimension)).length,
    0
  );
}

function collectProjectEvidenceText(project: ProjectProfile): string[] {
  const evidence = project.evidence.slice(0, 4).map(formatEvidence);
  return evidence.length ? evidence : [`${project.name}: project profile scanned with ${project.files.length} readable files.`];
}

function projectJudgment(
  project: ProjectProfile,
  role: ProjectRadarItem["role"],
  locale: "en-US" | "zh-CN"
): string {
  const topics = project.topics.map((topic) => topic.topic).slice(0, 5).join(", ") ||
    tx(locale, "report.topic.noMaturity");
  return tx(locale, "report.projectRadar.judgment", {
    project: project.name,
    role,
    topics
  });
}

function mostCommonMissingDimension(topic: DeepTopicReport): string | undefined {
  const counts = new Map<string, number>();
  for (const project of topic.projectMaturity) {
    for (const dimension of project.missingDimensions) {
      counts.set(dimension, (counts.get(dimension) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}

function bestProject(topic: DeepTopicReport): ProjectTopicMaturity | undefined {
  return [...topic.projectMaturity].sort(
    (left, right) => right.implementedDimensions.length - left.implementedDimensions.length
  )[0];
}

function distributionText(topic: DeepTopicReport): string {
  return Object.entries(topic.maturityDistribution)
    .filter(([, count]) => count > 0)
    .map(([maturity, count]) => `${maturity}:${count}`)
    .join(", ") || "no maturity evidence";
}

function firstProjectAction(topic: DeepTopicReport): string {
  return topic.projectMaturity[0]?.recommendedNextActions[0] ?? "Collect stronger evidence before changing architecture.";
}

function shouldPlatformizeRagDimension(dimension: string): boolean {
  return ![
    "metadata model",
    "prompt assembly / context packing",
    "grounded generation / citations"
  ].includes(dimension);
}

function categoryRootCause(category: string, locale: "en-US" | "zh-CN"): string {
  if (isLocale(locale, "zh-CN")) {
    if (category.includes("test")) return "测试失败通常来自断言、环境或依赖状态不一致。";
    if (category.includes("build")) return "构建失败通常来自类型、依赖或产物配置问题。";
    if (category.includes("permission")) return "权限问题通常来自沙箱、文件权限或外部服务访问。";
    return "该类别需要结合命令 snippet 和项目上下文继续定位。";
  }
  if (category.includes("test")) return "Test failures usually come from assertions, environment, or dependency state.";
  if (category.includes("build")) return "Build failures usually come from types, dependencies, or artifact config.";
  if (category.includes("permission")) return "Permission issues usually come from sandbox, file permissions, or service access.";
  return "This category needs command snippets and project context for root-cause analysis.";
}

function categoryFixStrategy(category: string, locale: "en-US" | "zh-CN"): string {
  if (isLocale(locale, "zh-CN")) {
    if (category.includes("test")) return "先复现单测，再最小修复，再跑相关测试和静态检查。";
    if (category.includes("build")) return "先运行静态检查和类型检查，再修构建配置。";
    return "把失败命令、错误摘要、修复动作和复跑结果写入 AGENTS.md 工作流。";
  }
  if (category.includes("test")) return "Reproduce the focused test, make the smallest fix, then rerun related tests and static checks.";
  if (category.includes("build")) return "Run static/type checks first, then fix build configuration.";
  return "Record failed command, error summary, remediation, and rerun result in the AGENTS.md workflow.";
}

function summarizeDataQuality(records: DataQuality[], locale: "en-US" | "zh-CN"): string {
  if (!records.length) {
    return tx(locale, "dataQuality.summary.none");
  }
  return tx(locale, "dataQuality.summary.some", { count: records.length });
}

function appliesToText(rule: AgentRuleSuggestion, report: InsightReport): string {
  const parts = [
    rule.appliesTo.projects?.length ? `projects=${rule.appliesTo.projects.join(", ")}` : "",
    rule.appliesTo.languages?.length ? `languages=${rule.appliesTo.languages.join(", ")}` : "",
    rule.appliesTo.frameworks?.length ? `frameworks=${rule.appliesTo.frameworks.join(", ")}` : "",
    rule.appliesTo.topics?.length ? `topics=${rule.appliesTo.topics.join(", ")}` : ""
  ].filter(Boolean);
  return parts.length ? parts.join("; ") : isLocale(report.locale, "zh-CN") ? "全局 / workspace 默认适用" : "global / workspace default";
}

function valueOrNotDetected(value: number | undefined, locale: "en-US" | "zh-CN"): string {
  return value === undefined ? tx(locale, "common.notDetected") : String(value);
}

function yesNo(value: boolean | undefined, locale: "en-US" | "zh-CN"): string {
  if (value === undefined) return tx(locale, "common.notDetected");
  return value ? tx(locale, "common.yes") : tx(locale, "common.no");
}

function signed(value: number | undefined): string {
  if (value === undefined) return "not available";
  return value > 0 ? `+${value}` : String(value);
}

function displayProjectName(projectName: string, locale: "en-US" | "zh-CN"): string {
  return projectName === "unknown"
    ? tx(locale, "report.render.notRecognizedProject")
    : projectName;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const itemKey = key(value);
    if (seen.has(itemKey)) continue;
    seen.add(itemKey);
    result.push(value);
  }
  return result;
}
