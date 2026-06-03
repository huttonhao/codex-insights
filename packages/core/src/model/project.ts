import type { DataQuality } from "./dataQuality.js";
import type { CommandEvidenceSummary } from "./command.js";
import type { Evidence } from "./evidence.js";
import type { TopicMention, TopicMaturity } from "./topic.js";

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  sizeBytes: number;
  content: string;
}

export interface ProjectProfile {
  name: string;
  path: string;
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  databases: string[];
  aiProviders: string[];
  topics: TopicMention[];
  evidence: Evidence[];
  maturityByTopic: Record<string, TopicMaturity>;
  commandEvidence?: CommandEvidenceSummary;
  files: ScannedFile[];
}

export interface WorkspaceScanSummary {
  projectsScanned: number;
  filesScanned: number;
  bytesScanned: number;
  skippedFiles: number;
}

export interface WorkspaceScanResult {
  workspacePath: string;
  projects: ProjectProfile[];
  summary: WorkspaceScanSummary;
  dataQuality: DataQuality[];
}
