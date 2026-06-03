import type { Evidence } from "./evidence.js";

export type AnomalySeverity = "info" | "warning" | "critical";

export interface AnomalyIssue {
  id: string;
  title: string;
  severity: AnomalySeverity;
  metric: string;
  value: string;
  explanation: string;
  impact: string;
  nextAction: string;
  evidence: Evidence[];
}
