import type { Evidence } from "./evidence.js";

export interface AgentRuleSuggestion {
  id: string;
  title: string;
  ruleText: string;
  reason: string;
  evidence: Evidence[];
  appliesTo: {
    languages?: string[];
    frameworks?: string[];
    projects?: string[];
    topics?: string[];
  };
  severity: "recommended" | "strongly_recommended" | "critical";
}
