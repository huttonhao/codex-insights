import { describe, expect, it } from "vitest";
import { detectReportAnomalies } from "../src/insights/anomalyDetector.js";
import type { InsightReport } from "../src/index.js";

function makeReport(overrides: Partial<InsightReport> = {}): InsightReport {
  return {
    schemaVersion: "3.0",
    id: "anomaly-test",
    repository: { root: "/repo", name: "repo" },
    generatedAt: "2026-06-03T00:00:00.000Z",
    locale: "en-US",
    summary: { title: "test", narrative: "test" },
    metrics: {
      toolCalls: 0,
      filesTouched: 0,
      warnings: 0,
      testsRunKnown: false,
      testCommands: [],
      buildCommands: []
    },
    recommendations: [],
    trend: { kind: "baseline", message: "baseline", deltas: {} },
    dataQuality: [],
    scanSummary: {
      mode: "full",
      projectsScanned: 0,
      filesScanned: 10,
      bytesScanned: 0,
      skippedFiles: 0,
      startedAt: "2026-06-03T00:00:00.000Z",
      completedAt: "2026-06-03T00:00:00.000Z"
    },
    projects: [],
    deepTopics: [],
    ...overrides
  };
}

describe("anomaly detector", () => {
  it("explains suspicious usage metrics instead of leaving raw numbers unexplained", () => {
    const issues = detectReportAnomalies(makeReport({
      usageAnalytics: {
        linesAdded: 1_500_000,
        totalSessions: 1,
        qualifyingSessions: 1,
        totalMessages: 1,
        userMessages: 1,
        assistantMessages: 0,
        toolCalls: 2_500,
        commandStats: {
          totalCommands: 4,
          failedCommands: 2,
          failureCategories: { test: 2 }
        }
      }
    }));

    expect(issues.map((issue) => issue.id)).toEqual(
      expect.arrayContaining([
        "lines-added-large",
        "tool-calls-large",
        "failed-command-ratio"
      ])
    );
    expect(issues.every((issue) => issue.explanation && issue.nextAction)).toBe(true);
  });
});
