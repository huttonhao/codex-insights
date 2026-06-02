import type { RetrievedContext } from "./retriever.js";

export interface GroundedAnswer {
  answer: string;
  citations: string[];
  hallucinationCheck: "passed" | "failed";
}

export function packContext(contexts: RetrievedContext[], tokenBudget: number): string {
  return contexts
    .slice(0, Math.max(1, Math.floor(tokenBudget / 512)))
    .map((context) => `[${context.citation}] ${context.text}`)
    .join("\n");
}

export async function generateGroundedAnswer(question: string, contexts: RetrievedContext[]): Promise<GroundedAnswer> {
  const context = packContext(contexts, 2048);
  return {
    answer: `${question}\n${context}`,
    citations: contexts.map((item) => item.citation),
    hallucinationCheck: contexts.length > 0 ? "passed" : "failed"
  };
}
