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
      reason:
        locale === "zh-CN"
          ? `${input.topic} 的跨项目证据还不足，先保持项目内治理。`
          : `There is not enough cross-project ${input.topic} evidence to justify platformization yet.`,
      proposedModules: [],
      migrationPlan: [
        locale === "zh-CN"
          ? "继续收集实现证据、质量证据和重复模式，再决定公共边界。"
          : "Collect more implementation, quality, and repetition evidence before drawing shared boundaries."
      ]
    };
  }

  const reference = input.referenceProjects[0] ?? "the strongest implementation";
  return {
    shouldPlatformize: true,
    reason:
      locale === "zh-CN"
        ? `${input.topic} 已在多个项目中出现，且存在重复信号，适合沉淀统一契约和质量门禁。`
        : `${input.topic} appears across multiple projects with repeated signals, making shared contracts and quality gates worthwhile.`,
    proposedModules: input.repeatedPatterns.slice(0, 8),
    migrationPlan:
      locale === "zh-CN"
        ? [
            `以 ${reference} 作为 ${input.topic} 参考实现候选。`,
            "先抽公共接口、配置模型和质量门禁，再迁移一个 partial 项目验证边界。",
            "业务差异保留在项目侧，公共能力进入共享平台。"
          ]
        : [
            `Use ${reference} as the ${input.topic} reference candidate.`,
            "Extract shared interfaces, configuration, and quality gates, then migrate one partial project to validate boundaries.",
            "Keep product-specific policy in projects while moving shared capability into a platform module."
          ]
  };
}
