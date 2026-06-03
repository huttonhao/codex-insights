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
import { tx } from "../i18n/index.js";
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
      projects: buildRagProjectNarratives(rag, report.locale),
      dimensions: buildRagDimensions(rag, report.locale),
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
  const insights: NarrativeInsight[] = [];
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");
  const platformTopics = topicOverview.filter((topic) =>
    topic.platformization.includes(tx(report.locale, "report.topic.platform.match"))
  );
  const riskyQualityProjects = report.projects.filter((project) =>
    !project.qualitySummary?.hasTestScript || !project.qualitySummary?.hasCi
  );

  if (report.codexHistory) {
    insights.push({
      conclusion: tx(report.locale, "report.summary.fullSessionWorkspace", {
          sessions: report.codexHistory.qualifyingSessions,
          projects: report.scanSummary.projectsScanned
        }),
      evidence: [
        `codexHistory.parsedSessions=${report.codexHistory.parsedSessions}`,
        `workspace.projectsScanned=${report.scanSummary.projectsScanned}`
      ],
      explanation: tx(report.locale, "report.summary.fullSessionWorkspace.explain"),
      risk: report.dataQuality.length
        ? tx(report.locale, "report.summary.fullSessionWorkspace.risk")
        : tx(report.locale, "common.noBlockingDataQuality"),
      nextAction: tx(report.locale, "report.summary.fullSessionWorkspace.action"),
      priority: report.dataQuality.length ? "P2" : "P3",
      projects: topProjects(report),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  if (rag && rag.mentionedProjects > 0) {
    const production = rag.maturityDistribution.production_ready;
    insights.push({
      conclusion: tx(report.locale, "report.summary.ragCoverage", {
          mentioned: rag.mentionedProjects,
          total: rag.totalProjects,
          production
        }),
      evidence: rag.crossProjectFindings.concat(evidenceSnippets(collectTopicEvidence(rag), 2)),
      explanation: tx(report.locale, "report.summary.ragCoverage.explain"),
      risk: rag.duplicationRisks[0] ?? tx(report.locale, "report.rag.defaultRisk"),
      nextAction: tx(report.locale, "report.summary.ragCoverage.action"),
      priority: scorePriority({ affectedProjects: rag.mentionedProjects, missingCriticalCount: missingCriticalCount(rag) }),
      projects: rag.projectMaturity.map((project) => project.projectName),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  if (platformTopics.length) {
    insights.push({
      conclusion: tx(report.locale, "report.summary.platformTopics", { count: platformTopics.length }),
      evidence: platformTopics.slice(0, 4).map((topic) => `${topic.topic}: ${topic.platformization}`),
      explanation: tx(report.locale, "report.summary.platformTopics.explain"),
      risk: tx(report.locale, "report.summary.platformTopics.risk"),
      nextAction: tx(report.locale, "report.summary.platformTopics.action"),
      priority: "P1",
      projects: unique(platformTopics.flatMap((topic) => topic.involvedProjects)).slice(0, 8),
      dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
    });
  }

  if (riskyQualityProjects.length) {
    insights.push({
      conclusion: tx(report.locale, "report.summary.qualityGaps", { count: riskyQualityProjects.length }),
      evidence: riskyQualityProjects.slice(0, 5).map((project) =>
        `${project.name}: testScript=${yesNo(project.qualitySummary?.hasTestScript, report.locale)}, CI=${yesNo(project.qualitySummary?.hasCi, report.locale)}`
      ),
      explanation: tx(report.locale, "report.summary.qualityGaps.explain"),
      risk: tx(report.locale, "report.summary.qualityGaps.risk"),
      nextAction: tx(report.locale, "report.summary.qualityGaps.action"),
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
  const projects = report.usageAnalytics?.projectBreakdown?.slice(0, 5) ?? [];
  if (projects.length) {
    return projects.map((project) => ({
      conclusion: tx(report.locale, "report.recentWork.project", {
        project: displayProjectName(project.projectName, report.locale)
      }),
      evidence: [
        `sessions=${project.sessions}`,
        `messages=${project.messages}`,
        `toolCalls=${project.toolCalls}`,
        `filesModified=${valueOrNotDetected(project.filesModified, report.locale)}`
      ],
      explanation: tx(report.locale, "report.recentWork.explain"),
      risk: project.toolErrors
        ? tx(report.locale, "report.recentWork.toolErrorRisk", { count: project.toolErrors })
        : tx(report.locale, "report.recentWork.noToolErrorRisk"),
      nextAction: tx(report.locale, "report.recentWork.action"),
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
  const usage = report.usageAnalytics;
  const commandStats = usage?.commandStats;
  const failed = commandStats?.failedCommands ?? 0;
  const commands = commandStats?.totalCommands ?? 0;
  const toolCalls = usage?.toolCalls ?? report.metrics.toolCalls;
  const messages = usage?.totalMessages;
  return [
    {
      conclusion: tx(report.locale, "report.codexUsage.conclusion", {
          style: commands > 0
            ? tx(report.locale, "report.codexUsage.style.command")
            : toolCalls > 0
              ? tx(report.locale, "report.codexUsage.style.tool")
              : tx(report.locale, "report.codexUsage.style.qa")
        }),
      evidence: [
        `messages=${valueOrNotDetected(messages, report.locale)}`,
        `toolCalls=${toolCalls}`,
        `commands=${valueOrNotDetected(commands, report.locale)}`
      ],
      explanation: tx(report.locale, "report.codexUsage.explain"),
      risk: failed > 0
        ? tx(report.locale, "report.codexUsage.failedRisk", { failed, total: commands })
        : tx(report.locale, "report.codexUsage.noFailedRisk"),
      nextAction: failed > 0
        ? tx(report.locale, "report.codexUsage.failedAction")
        : tx(report.locale, "report.codexUsage.defaultAction"),
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
  const projects = report.projects;
  const missingTest = projects.filter((project) => !project.qualitySummary?.hasTestScript);
  const missingCi = projects.filter((project) => !project.qualitySummary?.hasCi);
  const missingTests = projects.filter((project) => !project.qualitySummary?.hasTestFiles);
  const findings: NarrativeInsight[] = [
    {
      conclusion: tx(report.locale, "report.workspaceQuality.conclusion", {
        missingTest: missingTest.length,
        missingCi: missingCi.length,
        missingFiles: missingTests.length
      }),
      evidence: projects.slice(0, 8).map((project) =>
        `${project.name}: testScript=${yesNo(project.qualitySummary?.hasTestScript, report.locale)}, CI=${yesNo(project.qualitySummary?.hasCi, report.locale)}, testFiles=${yesNo(project.qualitySummary?.hasTestFiles, report.locale)}`
      ),
      explanation: tx(report.locale, "report.workspaceQuality.explain"),
      risk: tx(report.locale, "report.workspaceQuality.risk"),
      nextAction: tx(report.locale, "report.workspaceQuality.action"),
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
      ? tx(report.locale, "report.topic.platform.yes", { reason: topic.platformizationRecommendation.reason })
      : tx(report.locale, "report.topic.platform.no", { reason: topic.platformizationRecommendation.reason });
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

function buildRagProjectNarratives(rag: DeepTopicReport | undefined, locale: "en-US" | "zh-CN"): RagProjectNarrative[] {
  return (rag?.projectMaturity ?? []).map((project) => ({
    project: project.projectName,
    maturity: project.maturity,
    evidenceFiles: evidenceFiles(project.evidence),
    implementedDimensions: project.implementedDimensions,
    missingCriticalDimensions: project.missingDimensions.filter((dimension) =>
      ragCriticalDimensions.includes(dimension)
    ),
    risk: project.risks[0] ?? tx(locale, "report.rag.defaultRisk"),
    nextAction: project.recommendedNextActions[0] ?? tx(locale, "report.rag.defaultAction")
  }));
}

function buildRagDimensions(rag: DeepTopicReport | undefined, locale: "en-US" | "zh-CN"): RagDimensionNarrative[] {
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
        ? tx(locale, "report.rag.dimension.withEvidence", {
            dimension,
            projects: withEvidence.join(", "),
            missing: missing.slice(0, 5).join(", ") || tx(locale, "report.rag.dimensionMissingNone")
          })
        : tx(locale, "report.rag.dimension.noEvidence", { dimension })
    };
  });
}

function buildRagRoadmap(rag: DeepTopicReport | undefined, locale: "en-US" | "zh-CN") {
  const reference = rag?.recommendedReferenceProjects[0] ?? tx(locale, "report.rag.noReference");
  const rejected = (rag?.projectMaturity ?? [])
    .filter((project) => project.projectName !== reference && project.maturity !== "production_ready")
    .slice(0, 4)
    .map((project) => `${project.projectName}: ${project.maturity}, missing ${project.missingDimensions.slice(0, 3).join(", ")}`);
  return {
    referenceProject: reference,
    rejectedReferences: rejected.length ? rejected : [tx(locale, "report.rag.noRejected")],
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
      tx(locale, "report.rag.roadmap.phaseOne.freeze"),
      tx(locale, "report.rag.roadmap.phaseOne.reference"),
      tx(locale, "report.rag.roadmap.phaseOne.gates")
    ],
    phaseTwo: [
      tx(locale, "report.rag.roadmap.phaseTwo.interfaces"),
      tx(locale, "report.rag.roadmap.phaseTwo.pilot"),
      tx(locale, "report.rag.roadmap.phaseTwo.eval")
    ],
    phaseThree: [
      tx(locale, "report.rag.roadmap.phaseThree.platform"),
      tx(locale, "report.rag.roadmap.phaseThree.apis"),
      tx(locale, "report.rag.roadmap.phaseThree.metrics")
    ],
    defer: [
      tx(locale, "report.rag.roadmap.defer.rewrite"),
      tx(locale, "report.rag.roadmap.defer.rerank"),
      tx(locale, "report.rag.roadmap.defer.acl")
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
        ? tx(locale, "report.dimension.current.withEvidence", {
            projects: matched.map((project) => project.projectName).join(", ")
          })
        : tx(locale, "report.dimension.current.noEvidence", { dimension }),
      evidence: matched.flatMap((project) => evidenceSnippets(project.evidence, 1)).slice(0, 3),
      risk: matched.length
        ? tx(locale, "report.dimension.risk.withEvidence")
        : tx(locale, "report.dimension.risk.noEvidence"),
      nextAction: tx(locale, "report.dimension.action", { dimension })
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
      conclusion: tx(locale, "report.agentGateway.conclusion", {
        agentProjects: agent?.mentionedProjects ?? 0,
        gatewayProjects: gateway?.mentionedProjects ?? 0
      }),
      evidence: [
        agent?.crossProjectFindings[0] ?? tx(locale, "report.render.emptySection"),
        gateway?.crossProjectFindings[0] ?? tx(locale, "report.render.emptySection")
      ],
      explanation: tx(locale, "report.agentGateway.explain"),
      risk: tx(locale, "report.agentGateway.risk"),
      nextAction: tx(locale, "report.agentGateway.action"),
      priority: "P2",
      projects: unique([
        ...(agent?.projectMaturity.map((project) => project.projectName) ?? []),
        ...(gateway?.projectMaturity.map((project) => project.projectName) ?? [])
      ]),
      dataQualityNote: tx(locale, "report.agentGateway.dataQuality")
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
      category: tx(report.locale, "report.problems.none"),
      count: 0,
      projects: topProjects(report),
      snippet: tx(report.locale, "report.problems.noneSnippet"),
      rootCause: tx(report.locale, "report.problems.noneRootCause"),
      fixStrategy: tx(report.locale, "report.problems.noneFix"),
      needsAgentRule: false
    });
  }
  return problems;
}

function buildStrengths(report: InsightReport): NarrativeInsight[] {
  const strongTopics = report.deepTopics
    .flatMap((topic) => topic.projectMaturity.map((project) => ({ topic, project })))
    .filter(({ project }) => project.maturity === "production_ready" || project.maturity === "partial")
    .slice(0, 5);
  return strongTopics.length
    ? strongTopics.map(({ topic, project }) => ({
        conclusion: tx(report.locale, "report.strength.project", {
          project: project.projectName,
          topic: topic.topic
        }),
        evidence: evidenceSnippets(project.evidence, 3),
        explanation: tx(report.locale, "report.strength.explain"),
        risk: project.risks[0] ?? tx(report.locale, "report.strength.defaultRisk"),
        nextAction: project.recommendedNextActions[0] ?? tx(report.locale, "report.strength.defaultAction"),
        priority: "P2",
        projects: [project.projectName],
        dataQualityNote: summarizeDataQuality(report.dataQuality, report.locale)
      }))
    : [
        {
          conclusion: tx(report.locale, "report.strength.none"),
          evidence: [tx(report.locale, "report.render.emptySection")],
          explanation: tx(report.locale, "report.strength.noneExplain"),
          risk: tx(report.locale, "report.strength.noneRisk"),
          nextAction: tx(report.locale, "report.strength.noneAction"),
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
      title: tx(report.locale, "report.agents.staticFirst.title"),
      ruleText: tx(report.locale, "report.agents.staticFirst.rule"),
      reason: tx(report.locale, "report.agents.staticFirst.reason"),
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
    title: rule.title || tx(report.locale, "report.agents.fallback.title"),
    ruleText: rule.ruleText || tx(report.locale, "report.agents.fallback.rule"),
    reason: rule.reason || tx(report.locale, "report.agents.fallback.reason"),
    evidence: rule.evidence.length
      ? rule.evidence.map(formatEvidence).slice(0, 5)
      : [tx(report.locale, "report.agents.fallback.evidence")],
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
  return tx(report.locale, "report.coverage.confidenceReason", {
    dataQualityCount: report.dataQuality.length,
    anomalyCount: anomalies.length,
    evidenceCount: buildEvidenceIndex(report).length
  });
}

function buildCaveats(report: InsightReport, anomalies: AnomalyIssue[]): string[] {
  return [
    tx(report.locale, "report.dataQuality.caveat.codexJsonl"),
    tx(report.locale, "report.dataQuality.caveat.llmFacets"),
    ...(anomalies.length
      ? anomalies.map((item) => `${item.title}: ${item.impact}`)
      : [tx(report.locale, "report.dataQuality.caveat.noAnomaly")])
  ];
}

function buildTrendNarrative(report: InsightReport): string[] {
  if (report.trend.kind === "baseline") {
    return [
      tx(report.locale, "report.trend.baseline"),
      tx(report.locale, "report.trend.baselineNext")
    ];
  }
  const deltas = report.trend.deltas;
  return [
    tx(report.locale, "report.trend.delta", {
      projects: signed(deltas.projectsScanned),
      files: signed(deltas.filesScanned),
      skipped: signed(deltas.skippedFiles)
    }),
    tx(report.locale, "report.trend.risks", {
      newRisks: deltas.newRisks?.length ?? 0,
      resolvedRisks: deltas.resolvedRisks?.length ?? 0,
      repeated: deltas.repeatedRecommendedActions?.length ?? 0
    })
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
    report.codexHistory ? tx(report.locale, "report.source.codexHistory") : "",
    report.projects.length ? tx(report.locale, "report.source.workspaceScanner") : "",
    report.scanSummary.repoPath ? tx(report.locale, "report.source.gitRepo") : "",
    report.deepTopics.length ? tx(report.locale, "report.source.topicAnalyzers") : "",
    report.sessionFacets?.length ? tx(report.locale, "report.source.sessionFacets") : ""
  ].filter(Boolean);
  return sources.length ? sources : [tx(report.locale, "common.reportMetadataOnly")];
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
  if (category.includes("test")) return tx(locale, "report.category.root.test");
  if (category.includes("build")) return tx(locale, "report.category.root.build");
  if (category.includes("permission")) return tx(locale, "report.category.root.permission");
  return tx(locale, "report.category.root.default");
}

function categoryFixStrategy(category: string, locale: "en-US" | "zh-CN"): string {
  if (category.includes("test")) return tx(locale, "report.category.fix.test");
  if (category.includes("build")) return tx(locale, "report.category.fix.build");
  return tx(locale, "report.category.fix.default");
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
  return parts.length ? parts.join("; ") : tx(report.locale, "common.globalWorkspaceDefault");
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
