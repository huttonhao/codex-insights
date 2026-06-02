import type { Evidence } from "../model/evidence.js";
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

export function analyzeRagProjects(projects: ProjectProfile[]): DeepTopicReport {
  const projectMaturity = projects
    .map((project) => createProjectRagMaturity(project))
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
    repeatedDimensions
  });

  return {
    topic: "rag",
    totalProjects: projects.length,
    mentionedProjects,
    maturityDistribution: distribution,
    projectMaturity,
    crossProjectFindings: createCrossProjectFindings(projectMaturity),
    repeatedPatterns: repeatedDimensions,
    duplicationRisks:
      repeatedDimensions.length > 0
        ? [
            "Several projects implement overlapping RAG dimensions, which can create duplicated indexing, retrieval, evaluation, and permission logic."
          ]
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
        "Business projects should own data sources, permissions, and business prompts.",
        "Shared platform modules should own indexing, retrieval, reranking, citation verification, evaluation, observability, cost tracking, and tenant isolation.",
        "This separates product-specific policy from reusable retrieval infrastructure."
      ]
    },
    platformizationRecommendation
  };
}

function createProjectRagMaturity(project: ProjectProfile): ProjectTopicMaturity {
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
    risks: createRisks(maturity, missingDimensions),
    recommendedNextActions: createNextActions(maturity, missingDimensions)
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

function createCrossProjectFindings(projects: ProjectTopicMaturity[]): string[] {
  const implemented = projects.filter(
    (project) => maturityOrder[project.maturity] >= maturityOrder.prototype
  ).length;
  const designOnly = projects.filter((project) => project.maturity === "design_only").length;
  return [
    `${projects.length} projects contain RAG evidence; ${implemented} contain source-code implementation signals and ${designOnly} are design-only.`,
    "The primary architectural risk is fragmented partial RAG implementation across projects rather than a complete absence of RAG work."
  ];
}

function createRisks(maturity: TopicMaturity, missingDimensions: string[]): string[] {
  if (maturity === "mention_only") {
    return ["RAG is only mentioned, so implementation scope and production readiness are unknown."];
  }
  if (maturity === "design_only") {
    return ["The architecture exists on paper but has no verifiable implementation chain yet."];
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
      risks.push(`Missing ${dimension}.`);
    }
  }
  return risks.length ? risks : ["No major RAG production-readiness gap detected from scanned evidence."];
}

function createNextActions(
  maturity: TopicMaturity,
  missingDimensions: string[]
): string[] {
  if (maturity === "mention_only") {
    return ["Decide whether RAG is in scope; then add an architecture and implementation plan before coding."];
  }
  if (maturity === "design_only") {
    return ["Implement a thin ingestion to retrieval path and add evidence-backed tests."];
  }
  return missingDimensions
    .slice(0, 4)
    .map((dimension) => `Add ${dimension} before treating this RAG path as production-ready.`);
}

function limitEvidence(evidence: Evidence[]): Evidence[] {
  return evidence.slice(0, 12);
}
