export interface IndexedChunk {
  id: string;
  documentId: string;
  tenantId: string;
  text: string;
  tokenCount: number;
  metadata: {
    sourceUri: string;
    section: string;
    updatedAt: string;
  };
}

export function chunkForRetrieval(documentId: string, tenantId: string, sourceUri: string, content: string): IndexedChunk[] {
  return content.match(/.{1,512}/g)?.map((text, index) => ({
    id: `${documentId}:${index}`,
    documentId,
    tenantId,
    text,
    tokenCount: text.split(/\s+/).length,
    metadata: {
      sourceUri,
      section: `section-${index}`,
      updatedAt: new Date(0).toISOString()
    }
  })) ?? [];
}
