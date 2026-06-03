import type { PriorityLevel } from "../model/narrative.js";
import type { TopicMaturity } from "../model/topic.js";
import { tx, type SupportedLocale } from "../i18n/index.js";

const maturityScore: Record<TopicMaturity, number> = {
  none: 0,
  mention_only: 1,
  design_only: 2,
  prototype: 3,
  partial: 4,
  production_ready: 5
};

export function scorePriority(input: {
  riskCount?: number;
  affectedProjects?: number;
  missingCriticalCount?: number;
  maturity?: TopicMaturity;
  hasProductionClaim?: boolean;
}): PriorityLevel {
  const riskCount = input.riskCount ?? 0;
  const affectedProjects = input.affectedProjects ?? 0;
  const missingCriticalCount = input.missingCriticalCount ?? 0;
  const maturity = input.maturity ? maturityScore[input.maturity] : 0;

  if (
    input.hasProductionClaim &&
    missingCriticalCount >= 3
  ) {
    return "P0";
  }
  if (riskCount >= 3 || affectedProjects >= 5 || missingCriticalCount >= 5) {
    return "P1";
  }
  if (riskCount >= 1 || affectedProjects >= 2 || maturity >= maturityScore.prototype) {
    return "P2";
  }
  return "P3";
}

export function priorityLabel(priority: PriorityLevel, locale: SupportedLocale): string {
  return tx(locale, `priority.${priority}`);
}
