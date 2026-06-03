import { mkdtemp, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  compareReportTrends,
  createReportFileBase,
  loadLatestComparableReport,
  saveReportSnapshot,
  type InsightReport
} from "../src/index.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "codex-insights-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("report history", () => {
  it("creates deterministic date-versioned file bases", () => {
    expect(createReportFileBase(makeReport())).toBe(
      "2026-06-02T08-00-00_repo_en-US"
    );
  });

  it("saves structured JSON and rendered HTML snapshots", async () => {
    const report = makeReport();
    const saved = await saveReportSnapshot({
      report,
      html: "<!doctype html><title>Codex Insights</title>",
      reportsDir: tempRoot
    });

    expect(existsSync(saved.jsonPath)).toBe(true);
    expect(existsSync(saved.latestJsonPath)).toBe(true);
    expect(saved.htmlPath).toBeDefined();
    expect(existsSync(saved.htmlPath!)).toBe(true);
    expect(saved.latestHtmlPath).toBeDefined();
    expect(existsSync(saved.latestHtmlPath!)).toBe(true);

    const parsed = JSON.parse(await readFile(saved.jsonPath, "utf8")) as InsightReport;
    expect(parsed.sessionId).toBe("session-1");
    expect(await readFile(saved.htmlPath!, "utf8")).toBe(
      "<!doctype html><title>Codex Insights</title>"
    );
  });

  it("loads the latest previous report for the same repository", async () => {
    const olderSameRepo = makeReport({
      id: "older",
      sessionId: "older-session",
      generatedAt: "2026-06-01T08:00:00.000Z"
    });
    const newerOtherRepo = makeReport({
      id: "other",
      sessionId: "other-session",
      generatedAt: "2026-06-03T08:00:00.000Z",
      repository: { root: "/other", name: "other" },
      scanSummary: {
        mode: "repo",
        repoPath: "/other",
        projectsScanned: 1,
        filesScanned: 1,
        bytesScanned: 1,
        skippedFiles: 0,
        startedAt: "2026-06-03T08:00:00.000Z",
        completedAt: "2026-06-03T08:00:00.000Z"
      }
    });
    const current = makeReport({
      id: "current",
      sessionId: "current-session",
      generatedAt: "2026-06-04T08:00:00.000Z"
    });

    await saveReportSnapshot({
      report: olderSameRepo,
      html: "older",
      reportsDir: tempRoot
    });
    await saveReportSnapshot({
      report: newerOtherRepo,
      html: "other",
      reportsDir: tempRoot
    });

    const loaded = await loadLatestComparableReport(current, tempRoot);
    expect(loaded?.id).toBe("older");
  });

  it("computes trend deltas against a previous report", () => {
    const previous = makeReport({
      scanSummary: {
        mode: "repo",
        repoPath: "/repo",
        projectsScanned: 1,
        filesScanned: 2,
        bytesScanned: 100,
        skippedFiles: 2,
        startedAt: "2026-06-01T08:00:00.000Z",
        completedAt: "2026-06-01T08:00:00.000Z"
      }
    });
    const current = makeReport({
      scanSummary: {
        mode: "repo",
        repoPath: "/repo",
        projectsScanned: 2,
        filesScanned: 6,
        bytesScanned: 350,
        skippedFiles: 1,
        startedAt: "2026-06-02T08:00:00.000Z",
        completedAt: "2026-06-02T08:00:00.000Z"
      }
    });

    expect(compareReportTrends(previous, current)).toEqual({
      kind: "comparison",
      message: "Compared with the previous saved report.",
      deltas: {
        projectsScanned: 1,
        filesScanned: 4,
        bytesScanned: 250,
        skippedFiles: -1,
        topicMentions: {},
        ragMaturityDistribution: {},
        newTopics: [],
        disappearedTopics: [],
        newRisks: [],
        resolvedRisks: [],
        repeatedRecommendedActions: ["Keep building with tests first."]
      }
    });
  });
});

function makeReport(overrides: Partial<InsightReport> = {}): InsightReport {
  return {
    id: "report-1",
    sessionId: "session-1",
    repository: {
      root: "/repo",
      name: "codex-insights"
    },
    generatedAt: "2026-06-02T08:00:00.000Z",
    locale: "en-US",
    summary: {
      title: "Session report",
      narrative: "Implemented Codex Insights."
    },
    metrics: {
      toolCalls: 8,
      filesTouched: 6,
      testsRunKnown: true,
      testsRunCount: 12,
      warnings: 1,
      testCommands: [],
      buildCommands: []
    },
    recommendations: ["Keep building with tests first."],
    trend: {
      kind: "baseline",
      message: "This is the first saved report for this repository.",
      deltas: {}
    },
    schemaVersion: "3.0",
    dataQuality: [],
    scanSummary: {
      mode: "repo",
      repoPath: "/repo",
      projectsScanned: 1,
      filesScanned: 6,
      bytesScanned: 1200,
      skippedFiles: 0,
      startedAt: "2026-06-02T08:00:00.000Z",
      completedAt: "2026-06-02T08:00:00.000Z"
    },
    projects: [],
    deepTopics: [],
    ...overrides
  };
}
