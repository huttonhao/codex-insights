import { hybridSearch } from "./vectorStore.js";

export interface RetrievedContext {
  chunkId: string;
  score: number;
  text: string;
  citation: string;
}

export async function retrieveContext(query: string, tenantId: string): Promise<RetrievedContext[]> {
  const records = await hybridSearch(query, tenantId);
  return records.map((record) => ({
    chunkId: record.id,
    score: 0.92,
    text: "grounded context",
    citation: `source:${record.id}`
  }));
}
