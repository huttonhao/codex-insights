import { describe, expect, it } from "vitest";
import {
  renderInsightsMarkdown,
  renderInsightsReport,
  type InsightReport
} from "../src/index.js";

const report: InsightReport = {
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
    narrative: "Implemented the first version of Codex Insights."
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
  recommendations: [
    "Add transcript parsing once the stable report model is covered."
  ],
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
  deepTopics: []
};

describe("renderInsightsReport", () => {
  it("renders an English self-contained HTML report", () => {
    const html = renderInsightsReport(report, "en-US");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<style>");
    expect(html).not.toContain("https://cdn.tailwindcss.com");
    expect(html).toContain("Codex Insights");
    expect(html).toContain("0. Executive Summary");
    expect(html).toContain("Implemented the first version");
    expect(html).toContain("Projects scanned");
    expect(html).toContain(">1<");
    expect(html).toContain("Trend Comparison");
    expect(html).toContain("first saved report");
  });

  it("renders a Chinese self-contained HTML report from the same model", () => {
    const html = renderInsightsReport(report, "zh-CN");

    expect(html).toContain("Codex 洞察分析");
    expect(html).toContain("0. 执行摘要");
    expect(html).toContain("扫描项目");
    expect(html).toContain(">1<");
    expect(html).toContain("趋势");
    expect(html).toContain("lang=\"zh-CN\"");
  });

  it("renders Markdown for issue or documentation sharing", () => {
    const markdown = renderInsightsMarkdown(report, "zh-CN");

    expect(markdown).toContain("# Codex 洞察分析");
    expect(markdown).toContain("## 0. 执行摘要");
    expect(markdown).toContain("Projects scanned: 1");
  });
});
