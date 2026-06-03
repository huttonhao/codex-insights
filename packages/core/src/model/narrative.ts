import type { AnomalyIssue } from "./anomaly.js";
import type { Evidence } from "./evidence.js";

export type PriorityLevel = "P0" | "P1" | "P2" | "P3";
export type ReportConfidence = "high" | "medium" | "low";

export interface NarrativeInsight {
  conclusion: string;
  evidence: string[];
  explanation: string;
  risk: string;
  nextAction: string;
  priority: PriorityLevel;
  projects: string[];
  dataQualityNote: string;
}

export interface CoverageNarrative {
  sessionCount: string;
  projectCount: string;
  fileCount: string;
  topicCount: string;
  dataGaps: string[];
  confidence: ReportConfidence;
  confidenceReason: string;
}

export interface ProjectRadarItem {
  project: string;
  role: "platform" | "business" | "experiment" | "risk";
  topics: string[];
  judgment: string;
  evidence: string[];
  risk: string;
  nextAction: string;
  priority: PriorityLevel;
}

export interface WorkspaceQualityNarrative {
  findings: NarrativeInsight[];
  priorityOrder: string[];
  commandSuggestions: string[];
  missingVsUnknown: string[];
}

export interface TopicNarrative {
  topic: string;
  involvedProjects: string[];
  maturitySummary: string;
  strongestProject: string;
  biggestGap: string;
  platformization: string;
  nextAction: string;
  priority: PriorityLevel;
  evidence: string[];
}

export interface RagProjectNarrative {
  project: string;
  maturity: string;
  evidenceFiles: string[];
  implementedDimensions: string[];
  missingCriticalDimensions: string[];
  risk: string;
  nextAction: string;
}

export interface RagDimensionNarrative {
  dimension: string;
  projectsWithEvidence: string[];
  projectsMissing: string[];
  evidence: string[];
  platformize: boolean;
  interpretation: string;
}

export interface RagRoadmapNarrative {
  referenceProject: string;
  rejectedReferences: string[];
  sharedModules: string[];
  businessBoundaries: string[];
  phaseOne: string[];
  phaseTwo: string[];
  phaseThree: string[];
  defer: string[];
}

export interface TopicDimensionNarrative {
  dimension: string;
  currentState: string;
  evidence: string[];
  risk: string;
  nextAction: string;
}

export interface ProblemCategoryNarrative {
  category: string;
  count: number;
  projects: string[];
  snippet: string;
  rootCause: string;
  fixStrategy: string;
  needsAgentRule: boolean;
}

export interface AgentRuleNarrative {
  title: string;
  ruleText: string;
  reason: string;
  evidence: string[];
  appliesTo: string;
  severity: string;
  target: "global" | "workspace" | "project";
}

export interface NextPromptNarrative {
  title: string;
  prompt: string;
  evidence: string[];
  priority: PriorityLevel;
}

export interface TrustNarrative {
  confidence: ReportConfidence;
  sources: string[];
  unknowns: string[];
  suspiciousMetrics: string[];
  caveats: string[];
}

export interface EvidenceIndexItem {
  project: string;
  filePath: string;
  snippet: string;
  signal: string;
  topic: string;
  confidence: string;
}

export interface FullReportNarrative {
  title: string;
  executiveSummary: NarrativeInsight[];
  coverage: CoverageNarrative;
  recentWork: NarrativeInsight[];
  codexUsage: NarrativeInsight[];
  projectRadar: ProjectRadarItem[];
  workspaceQuality: WorkspaceQualityNarrative;
  topicOverview: TopicNarrative[];
  rag: {
    projects: RagProjectNarrative[];
    dimensions: RagDimensionNarrative[];
    roadmap: RagRoadmapNarrative;
  };
  agentLlmGateway: {
    agent: TopicDimensionNarrative[];
    llmGateway: TopicDimensionNarrative[];
    findings: NarrativeInsight[];
  };
  problems: ProblemCategoryNarrative[];
  strengths: NarrativeInsight[];
  agentRules: AgentRuleNarrative[];
  nextPrompts: NextPromptNarrative[];
  dataQuality: TrustNarrative;
  trend: string[];
  evidenceIndex: EvidenceIndexItem[];
  anomalies: AnomalyIssue[];
}

export function evidenceToText(evidence: Evidence): string {
  const location = evidence.lineStart
    ? `${evidence.filePath}:${evidence.lineStart}`
    : evidence.filePath;
  return `${evidence.projectName} ${location} (${evidence.signal}): ${evidence.snippet}`;
}
