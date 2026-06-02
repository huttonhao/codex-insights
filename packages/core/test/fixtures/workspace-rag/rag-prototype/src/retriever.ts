export async function retrieve(question: string): Promise<string[]> {
  const embedding = await createEmbedding(question);
  return vectorSimilaritySearch(embedding);
}

async function createEmbedding(input: string): Promise<number[]> {
  return input.split(/\s+/).map((word) => word.length / 10);
}

function vectorSimilaritySearch(vector: number[]): string[] {
  return vector.length > 0 ? ["demo document chunk"] : [];
}
