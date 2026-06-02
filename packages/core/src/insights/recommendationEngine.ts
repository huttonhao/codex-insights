export interface RagPlatformizationInput {
  mentionedProjects: number;
  matureProjects: string[];
  repeatedDimensions: string[];
}

export interface RagPlatformizationRecommendation {
  shouldPlatformize: boolean;
  reason: string;
  proposedModules: string[];
  migrationPlan: string[];
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
  if (input.mentionedProjects < 2) {
    return {
      shouldPlatformize: false,
      reason:
        "There is insufficient cross-project evidence to justify a shared RAG platform yet.",
      proposedModules: [],
      migrationPlan: [
        "Collect more implementation evidence before introducing shared platform boundaries."
      ]
    };
  }

  const repeated = input.repeatedDimensions.length
    ? ` Repeated dimensions: ${input.repeatedDimensions.join(", ")}.`
    : "";
  const reference = input.matureProjects[0] ?? "the most complete implementation";

  return {
    shouldPlatformize: true,
    reason: `RAG signals appear in multiple projects, which creates repeated implementation and evaluation risk.${repeated}`,
    proposedModules: coreModules,
    migrationPlan: [
      `Use ${reference} as the reference implementation for the shared contract.`,
      "Extract ingestion, chunking, embedding, indexing, retrieval, reranking, citation checks, evaluation, observability, and tenant isolation into shared modules.",
      "Keep business-specific source permissions and prompt policy in each product project.",
      "Migrate one partial project first, then stop new duplicated RAG implementations unless they target a missing platform capability."
    ]
  };
}
