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
      reason:
        locale === "zh-CN"
          ? "当前跨项目证据还不足，暂时不建议抽成统一 RAG 平台。"
          : "There is insufficient cross-project evidence to justify a shared RAG platform yet.",
      proposedModules: [],
      migrationPlan: [
        locale === "zh-CN"
          ? "先继续收集实现证据，再决定公共平台边界。"
          : "Collect more implementation evidence before introducing shared platform boundaries."
      ]
    };
  }

  const repeated =
    input.repeatedDimensions.length && locale === "zh-CN"
      ? ` 重复出现的维度包括：${input.repeatedDimensions.join("、")}。`
      : input.repeatedDimensions.length
        ? ` Repeated dimensions: ${input.repeatedDimensions.join(", ")}.`
        : "";
  const reference = input.matureProjects[0] ?? "the most complete implementation";

  return {
    shouldPlatformize: true,
    reason:
      locale === "zh-CN"
        ? `多个项目已经出现 RAG 证据，继续分散实现会带来重复建设、评估口径不一致和权限边界不清晰的风险。${repeated}`
        : `RAG signals appear in multiple projects, which creates repeated implementation and evaluation risk.${repeated}`,
    proposedModules: coreModules,
    migrationPlan:
      locale === "zh-CN"
        ? [
            `以 ${reference === "the most complete implementation" ? "当前最完整的实现" : reference} 作为参考实现，先沉淀公共契约。`,
            "把文档接入、切片、embedding、索引、召回、重排、引用校验、评估、观测和租户隔离抽成共享模块。",
            "业务项目只保留数据源权限、业务 prompt 策略和产品侧编排。",
            "先迁移一个 partial 项目验证边界，再停止新增重复 RAG 实现，除非它补的是平台缺失能力。"
          ]
        : [
            `Use ${reference} as the reference implementation for the shared contract.`,
            "Extract ingestion, chunking, embedding, indexing, retrieval, reranking, citation checks, evaluation, observability, and tenant isolation into shared modules.",
            "Keep business-specific source permissions and prompt policy in each product project.",
            "Migrate one partial project first, then stop new duplicated RAG implementations unless they target a missing platform capability."
          ]
  };
}
