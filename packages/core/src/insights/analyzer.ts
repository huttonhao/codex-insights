import type { SupportedLocale } from "../i18n/localeResolver.js";
import type { InsightReport, RepositoryInfo } from "./reportModel.js";
import { createBaselineTrend } from "./trends.js";

export interface SessionInsightInput {
  sessionId: string;
  repository: RepositoryInfo;
  generatedAt: string;
  locale: SupportedLocale;
  toolCalls: string[];
  filesTouched: string[];
  testsRun: number;
  warnings: string[];
}

export function analyzeSession(input: SessionInsightInput): InsightReport {
  const uniqueFiles = new Set(input.filesTouched);
  const recommendations = createRecommendations(input);

  return {
    id: `${input.sessionId}-${input.generatedAt}`,
    sessionId: input.sessionId,
    repository: input.repository,
    generatedAt: input.generatedAt,
    locale: input.locale,
    summary: {
      title: "Session report",
      narrative: `This session used ${input.toolCalls.length} tool calls, touched ${uniqueFiles.size} files, ran ${input.testsRun} tests, and recorded ${input.warnings.length} warnings.`
    },
    metrics: {
      toolCalls: input.toolCalls.length,
      filesTouched: uniqueFiles.size,
      testsRun: input.testsRun,
      warnings: input.warnings.length
    },
    recommendations,
    trend: createBaselineTrend()
  };
}

function createRecommendations(input: SessionInsightInput): string[] {
  const recommendations: string[] = [];

  if (input.testsRun === 0) {
    recommendations.push("Run a focused verification command before closing the work.");
  }

  if (input.warnings.length > 0) {
    recommendations.push("Review warnings before treating this session as complete.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Keep saving reports to build a useful trend history.");
  }

  return recommendations;
}
