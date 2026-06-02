export interface ConnectorDocument {
  id: string;
  tenantId: string;
  sourceUri: string;
  content: string;
  updatedAt: string;
}

export async function loadDocumentsFromSource(sourceUri: string): Promise<ConnectorDocument[]> {
  return [
    {
      id: "doc-1",
      tenantId: "tenant-a",
      sourceUri,
      content: "retrieval augmented generation handbook",
      updatedAt: new Date(0).toISOString()
    }
  ];
}

export function normalizeDocument(document: ConnectorDocument): ConnectorDocument {
  return {
    ...document,
    content: document.content.replace(/\s+/g, " ").trim()
  };
}
