import type { Evidence } from "./evidence.js";

export type TopicMaturity =
  | "none"
  | "mention_only"
  | "design_only"
  | "prototype"
  | "partial"
  | "production_ready";

export interface TopicMention {
  topic: string;
  signals: string[];
  evidence: Evidence[];
  maturity: TopicMaturity;
}

export interface ProjectTopicMaturity {
  projectName: string;
  maturity: TopicMaturity;
  implementedDimensions: string[];
  missingDimensions: string[];
  evidence: Evidence[];
  risks: string[];
  recommendedNextActions: string[];
}

export interface DeepTopicReport {
  topic: string;
  totalProjects: number;
  mentionedProjects: number;
  maturityDistribution: Record<TopicMaturity, number>;
  projectMaturity: ProjectTopicMaturity[];
  crossProjectFindings: string[];
  repeatedPatterns: string[];
  duplicationRisks: string[];
  recommendedReferenceProjects: string[];
  recommendedArchitecture: {
    name: string;
    stages: string[];
    rationale: string[];
  };
  platformizationRecommendation: {
    shouldPlatformize: boolean;
    reason: string;
    proposedModules: string[];
    migrationPlan: string[];
  };
}
