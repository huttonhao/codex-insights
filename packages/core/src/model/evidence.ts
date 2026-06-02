export type EvidenceConfidence = "low" | "medium" | "high";

export interface Evidence {
  projectName: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  signal: string;
  snippet: string;
  confidence: EvidenceConfidence;
  source?: string;
  command?: string;
  path?: string;
}
