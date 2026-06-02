export interface SourceDocument {
  id: string;
  tenantId: string;
  body: string;
}

export function ingestDocuments(documents: SourceDocument[]): SourceDocument[] {
  return documents.filter((document) => document.body.trim().length > 0);
}
