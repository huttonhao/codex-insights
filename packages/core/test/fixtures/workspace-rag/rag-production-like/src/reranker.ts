import type { RetrievedContext } from "./retriever.js";

export async function rerankWithCohere(query: string, contexts: RetrievedContext[]): Promise<RetrievedContext[]> {
  return contexts
    .map((context, index) => ({ ...context, score: context.score - index * 0.01 }))
    .sort((left, right) => right.score - left.score);
}
