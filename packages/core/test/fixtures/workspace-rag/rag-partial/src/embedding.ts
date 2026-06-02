export async function embedChunk(text: string): Promise<number[]> {
  return text.split(/\s+/).map((word) => word.length);
}
