export interface RetrievalMetric {
  recall: number;
  precision: number;
  mrr: number;
  ndcg: number;
}

export interface CostTrace {
  promptTokens: number;
  completionTokens: number;
  embeddingTokens: number;
  estimatedCostUsd: number;
}

export function scoreRetrieval(): RetrievalMetric {
  return {
    recall: 0.89,
    precision: 0.82,
    mrr: 0.76,
    ndcg: 0.8
  };
}

export function recordRagTrace(traceId: string, cost: CostTrace): string {
  return `${traceId}:${cost.estimatedCostUsd}`;
}
