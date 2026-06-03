export interface RagPlatformizationInput {
  mentionedProjects: number;
  matureProjects: string[];
  repeatedDimensions: string[];
  locale?: "en-US" | "zh-CN";
}

export interface RagPlatformizationRecommendation {
  shouldPlatformize: boolean;
  reason: string;
  proposedModules: string[];
  migrationPlan: string[];
}

export interface GenericPlatformizationInput {
  topic: string;
  mentionedProjects: number;
  repeatedPatterns: string[];
  referenceProjects: string[];
  locale?: "en-US" | "zh-CN";
}

const coreModules = [
  "Source Connector",
  "Document Normalizer",
  "Chunker",
  "Metadata Extractor",
  "Embedding Adapter",
  "Vector Index",
  "Retriever",
  "Reranker",
  "Citation Verifier",
  "Evaluation Harness",
  "Observability & Cost Dashboard",
  "Access Control / Tenant Isolation"
];

export function buildRagPlatformizationRecommendation(
  input: RagPlatformizationInput
): RagPlatformizationRecommendation {
  const locale = input.locale ?? "en-US";
  if (input.mentionedProjects < 2) {
    return {
      shouldPlatformize: false,
      reason: tx(locale, "rag.platform.notEnough"),
      proposedModules: [],
      migrationPlan: [tx(locale, "rag.platform.collectMore")]
    };
  }

  const repeated = input.repeatedDimensions.length
    ? tx(locale, "rag.platform.repeated", {
        dimensions: input.repeatedDimensions.join(", ")
      })
    : "";
  const reference = input.matureProjects[0] ?? tx(locale, "rag.platform.referenceFallback");

  return {
    shouldPlatformize: true,
    reason: tx(locale, "rag.platform.reason", { repeated }),
    proposedModules: coreModules,
    migrationPlan: [
      tx(locale, "rag.platform.plan.reference", { reference }),
      tx(locale, "rag.platform.plan.extract"),
      tx(locale, "rag.platform.plan.business"),
      tx(locale, "rag.platform.plan.migrate")
    ]
  };
}

export function buildGenericPlatformizationRecommendation(
  input: GenericPlatformizationInput
): RagPlatformizationRecommendation {
  const locale = input.locale ?? "en-US";
  const shouldPlatformize =
    input.mentionedProjects >= 2 &&
    (input.repeatedPatterns.length > 0 || input.referenceProjects.length > 0);
  if (!shouldPlatformize) {
    return {
      shouldPlatformize: false,
      reason: tx(locale, "topic.platform.no", {
        topic: input.topic,
        count: input.mentionedProjects
      }),
      proposedModules: [],
      migrationPlan: [tx(locale, "topic.platform.plan.start")]
    };
  }

  const reference = input.referenceProjects[0] ?? tx(locale, "topic.platform.referenceFallback");
  return {
    shouldPlatformize: true,
    reason: tx(locale, "topic.platform.yes", {
      topic: input.topic,
      count: input.mentionedProjects
    }),
    proposedModules: input.repeatedPatterns.slice(0, 8),
    migrationPlan: [
      tx(locale, "topic.platform.plan.reference", {
        reference,
        topic: input.topic
      }),
      tx(locale, "topic.platform.plan.boundary"),
      tx(locale, "topic.platform.plan.productPolicy")
    ]
  };
}
import { tx } from "../i18n/index.js";
