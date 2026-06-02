export interface EmbeddingProvider {
  model: string;
  embed(text: string): Promise<number[]>;
}

export function createOpenAIEmbeddingProvider(model = "text-embedding-3-large"): EmbeddingProvider {
  return {
    model,
    async embed(text: string) {
      return text.split(/\s+/).map((word) => word.length / 100);
    }
  };
}
