export interface VectorIndexRecord {
  id: string;
  tenantId: string;
  vector: number[];
  metadata: Record<string, string>;
}

export async function upsertPgVector(records: VectorIndexRecord[]): Promise<number> {
  return records.length;
}

export async function hybridSearch(query: string, tenantId: string): Promise<VectorIndexRecord[]> {
  const keywordSignal = query.toLowerCase().includes("rag") ? "bm25" : "vector";
  return [
    {
      id: "chunk-1",
      tenantId,
      vector: [0.1, 0.2, 0.3],
      metadata: {
        keywordSignal,
        index: "hnsw"
      }
    }
  ];
}
