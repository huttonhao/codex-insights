export interface Chunk {
  id: string;
  documentId: string;
  tenantId: string;
  text: string;
  metadata: Record<string, string>;
}

export function chunkDocument(documentId: string, tenantId: string, text: string): Chunk[] {
  return text.match(/.{1,400}/g)?.map((part, index) => ({
    id: `${documentId}-${index}`,
    documentId,
    tenantId,
    text: part,
    metadata: {
      source: "knowledge-base"
    }
  })) ?? [];
}
