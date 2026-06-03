import type { Evidence } from "../model/evidence.js";
import type { SupportedLocale } from "../i18n/localeResolver.js";
import type { ProjectProfile } from "../model/project.js";
import type {
  DeepTopicReport,
  ProjectTopicMaturity,
  TopicMaturity
} from "../model/topic.js";
import {
  buildRagPlatformizationRecommendation
} from "./recommendationEngine.js";
import { detectRagDimensions, ragDimensions } from "./ragSignals.js";

const maturityOrder: Record<TopicMaturity, number> = {
  none: 0,
  mention_only: 1,
  design_only: 2,
  prototype: 3,
  partial: 4,
  production_ready: 5
};

export function analyzeRagProjects(
  projects: ProjectProfile[],
  locale: SupportedLocale = "en-US"
): DeepTopicReport {
  const projectMaturity = projects
    .map((project) => createProjectRagMaturity(project, locale))
    .filter((project) => project.maturity !== "none");
  const distribution = createDistribution(projectMaturity);
  const mentionedProjects = projectMaturity.length;
  const repeatedDimensions = findRepeatedDimensions(projectMaturity);
  const matureProjects = projectMaturity
    .filter((project) => project.maturity === "production_ready")
    .sort((left, right) => right.implementedDimensions.length - left.implementedDimensions.length)
    .map((project) => project.projectName);
  const platformizationRecommendation = buildRagPlatformizationRecommendation({
    mentionedProjects,
    matureProjects,
    repeatedDimensions,
    locale
  });

  return {
    topic: "rag",
    totalProjects: projects.length,
    mentionedProjects,
    maturityDistribution: distribution,
    projectMaturity,
    crossProjectFindings: createCrossProjectFindings(projectMaturity, projects.length, locale),
    repeatedPatterns: repeatedDimensions,
    duplicationRisks:
      repeatedDimensions.length > 0
        ? [localizeDuplicationRisk(locale)]
        : [],
    recommendedReferenceProjects: matureProjects.length
      ? matureProjects
      : projectMaturity
          .filter((project) => project.maturity === "partial")
          .sort((left, right) => right.implementedDimensions.length - left.implementedDimensions.length)
          .map((project) => project.projectName)
          .slice(0, 2),
    recommendedArchitecture: {
      name: "Unified RAG Platform Architecture",
      stages: [
        "Source Connector",
        "Document Normalizer",
        "Chunker",
        "Metadata Extractor",
        "Embedding Adapter",
        "Vector Index",
        "Retriever",
        "Hybrid Search",
        "Reranker",
        "Context Packer",
        "Grounded Generator",
        "Citation Verifier",
        "Evaluation Harness",
        "Observability & Cost Dashboard",
        "Access Control / Tenant Isolation"
      ],
      rationale: [
        ...localizeArchitectureRationale(locale)
      ]
    },
    platformizationRecommendation
  };
}

function createProjectRagMaturity(
  project: ProjectProfile,
  locale: SupportedLocale
): ProjectTopicMaturity {
  const implementedDimensions = [...detectRagDimensions(project.files)];
  const missingDimensions = ragDimensions.filter(
    (dimension) => !implementedDimensions.includes(dimension)
  );
  const maturity = project.maturityByTopic.rag ?? "none";
  const evidence = limitEvidence(project.evidence.filter((item) => item.signal.includes("rag") || item.signal.includes("embedding") || item.signal.includes("retriev") || item.signal.includes("vector") || item.signal.includes("chunk") || item.signal.includes("citation") || item.signal.includes("dependency")));

  return {
    projectName: project.name,
    maturity,
    implementedDimensions,
    missingDimensions,
    evidence,
    risks: createRisks(maturity, missingDimensions, locale),
    recommendedNextActions: createNextActions(maturity, missingDimensions, locale)
  };
}

function createDistribution(
  projects: ProjectTopicMaturity[]
): Record<TopicMaturity, number> {
  const distribution: Record<TopicMaturity, number> = {
    none: 0,
    mention_only: 0,
    design_only: 0,
    prototype: 0,
    partial: 0,
    production_ready: 0
  };

  for (const project of projects) {
    distribution[project.maturity] += 1;
  }

  return distribution;
}

function findRepeatedDimensions(projects: ProjectTopicMaturity[]): string[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    for (const dimension of project.implementedDimensions) {
      counts.set(dimension, (counts.get(dimension) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .map(([dimension]) => dimension);
}

function createCrossProjectFindings(
  projects: ProjectTopicMaturity[],
  totalProjects: number,
  locale: SupportedLocale
): string[] {
  const implemented = projects.filter(
    (project) => maturityOrder[project.maturity] >= maturityOrder.prototype
  ).length;
  const designOnly = projects.filter((project) => project.maturity === "design_only").length;
  if (locale === "zh-CN") {
    return [
      `在扫描的 ${totalProjects} 个项目中，有 ${projects.length} 个项目出现 RAG 相关证据；其中 ${implemented} 个已经有代码实现信号，${designOnly} 个仍停留在设计阶段。`,
      "当前最大风险不是没有 RAG，而是多个项目各自实现半套 RAG，后续会造成重复建设、评估口径不一致、向量索引不可迁移、权限边界不清晰等问题。"
    ];
  }
  return [
    `${projects.length} projects contain RAG evidence; ${implemented} contain source-code implementation signals and ${designOnly} are design-only.`,
    "The primary architectural risk is fragmented partial RAG implementation across projects rather than a complete absence of RAG work."
  ];
}

function createRisks(
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "mention_only") {
    return [
      locale === "zh-CN"
        ? "RAG 只停留在概念提及，无法判断实现范围和生产可用性。"
        : "RAG is only mentioned, so implementation scope and production readiness are unknown."
    ];
  }
  if (maturity === "design_only") {
    return [
      locale === "zh-CN"
        ? "目前只有架构设计，缺少可验证的 ingestion 到 retrieval 最小闭环。"
        : "The architecture exists on paper but has no verifiable implementation chain yet."
    ];
  }
  const risks: string[] = [];
  for (const dimension of [
    "evaluation dataset",
    "retrieval metrics",
    "observability / tracing",
    "access control / tenant isolation",
    "tests / CI"
  ]) {
    if (missingDimensions.includes(dimension)) {
      risks.push(locale === "zh-CN" ? `缺少 ${dimension}。` : `Missing ${dimension}.`);
    }
  }
  return risks.length
    ? risks
    : [
        locale === "zh-CN"
          ? "从当前证据看，没有发现主要 RAG 生产就绪缺口。"
          : "No major RAG production-readiness gap detected from scanned evidence."
      ];
}

function createNextActions(
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "mention_only") {
    return [
      locale === "zh-CN"
        ? "先确认 RAG 是否进入产品范围，再补架构设计和最小实现计划。"
        : "Decide whether RAG is in scope; then add an architecture and implementation plan before coding."
    ];
  }
  if (maturity === "design_only") {
    return [
      locale === "zh-CN"
        ? "先实现 ingestion -> chunking -> embedding -> retrieval 的最小闭环，并补证据化测试。"
        : "Implement a thin ingestion to retrieval path and add evidence-backed tests."
    ];
  }
  return missingDimensions
    .slice(0, 4)
    .map((dimension) =>
      locale === "zh-CN"
        ? `补齐 ${dimension} 后，再把这条 RAG 链路视为生产可用。`
        : `Add ${dimension} before treating this RAG path as production-ready.`
    );
}

function localizeDuplicationRisk(locale: SupportedLocale): string {
  return locale === "zh-CN"
    ? "多个项目正在重复实现相同 RAG 维度，容易造成重复建设，以及索引、召回、评估和权限逻辑分散。"
    : "Several projects implement overlapping RAG dimensions, which can create duplicated indexing, retrieval, evaluation, and permission logic.";
}

function localizeArchitectureRationale(locale: SupportedLocale): string[] {
  if (locale === "zh-CN") {
    return [
      "业务项目应该负责数据源、权限模型和业务 prompt。",
      "公共平台应该负责索引、召回、重排、引用校验、评估、观测、成本追踪和租户隔离。",
      "这样能把产品策略和可复用检索基础设施分开，减少后续重复建设。"
    ];
  }
  return [
    "Business projects should own data sources, permissions, and business prompts.",
    "Shared platform modules should own indexing, retrieval, reranking, citation verification, evaluation, observability, cost tracking, and tenant isolation.",
    "This separates product-specific policy from reusable retrieval infrastructure."
  ];
}

function limitEvidence(evidence: Evidence[]): Evidence[] {
  return evidence.slice(0, 12);
}
