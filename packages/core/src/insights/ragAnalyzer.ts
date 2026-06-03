import type { Evidence } from "../model/evidence.js";
import type { SupportedLocale } from "../i18n/localeResolver.js";
import { tx } from "../i18n/index.js";
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
  return [
    tx(locale, "rag.finding.coverage", {
      count: projects.length,
      total: totalProjects,
      implemented,
      designOnly
    }),
    tx(locale, "rag.finding.risk")
  ];
}

function createRisks(
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "mention_only") {
    return [tx(locale, "rag.risk.mentionOnly")];
  }
  if (maturity === "design_only") {
    return [tx(locale, "rag.risk.designOnly")];
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
      risks.push(tx(locale, "rag.risk.missing", { dimension }));
    }
  }
  return risks.length
    ? risks
    : [tx(locale, "rag.risk.noneMajor")];
}

function createNextActions(
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "mention_only") {
    return [tx(locale, "rag.action.mentionOnly")];
  }
  if (maturity === "design_only") {
    return [tx(locale, "rag.action.designOnly")];
  }
  return missingDimensions
    .slice(0, 4)
    .map((dimension) =>
      tx(locale, "rag.action.addDimension", { dimension })
    );
}

function localizeDuplicationRisk(locale: SupportedLocale): string {
  return tx(locale, "rag.duplicationRisk");
}

function localizeArchitectureRationale(locale: SupportedLocale): string[] {
  return [
    tx(locale, "rag.architecture.rationale.business"),
    tx(locale, "rag.architecture.rationale.platform"),
    tx(locale, "rag.architecture.rationale.separation")
  ];
}

function limitEvidence(evidence: Evidence[]): Evidence[] {
  return evidence.slice(0, 12);
}
