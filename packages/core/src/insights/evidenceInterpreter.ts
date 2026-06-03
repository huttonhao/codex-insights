import type { Evidence } from "../model/evidence.js";
import type { ProjectProfile } from "../model/project.js";
import type { DeepTopicReport } from "../model/topic.js";

export function formatEvidence(evidence: Evidence | undefined): string {
  if (!evidence) {
    return "No direct evidence snippet was collected for this point; treat it as an inference from aggregate signals.";
  }
  const location = evidence.lineStart
    ? `${evidence.filePath}:${evidence.lineStart}`
    : evidence.filePath;
  return `${evidence.projectName} ${location} [${evidence.confidence}] ${evidence.signal}: ${cleanSnippet(evidence.snippet)}`;
}

export function evidenceFiles(evidence: Evidence[], limit = 4): string[] {
  return unique(
    evidence
      .slice(0, limit)
      .map((item) => item.lineStart ? `${item.filePath}:${item.lineStart}` : item.filePath)
  );
}

export function evidenceSnippets(evidence: Evidence[], limit = 3): string[] {
  return evidence.slice(0, limit).map(formatEvidence);
}

export function collectTopicEvidence(
  topic: DeepTopicReport,
  limit = 12
): Evidence[] {
  return topic.projectMaturity
    .flatMap((project) => project.evidence)
    .slice(0, limit);
}

export function collectProjectEvidence(
  project: ProjectProfile,
  limit = 8
): string[] {
  return project.evidence.slice(0, limit).map(formatEvidence);
}

export function cleanSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 220);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
