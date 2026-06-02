import { describe, expect, it } from "vitest";
import { renderInsightsReport, type InsightReport } from "../src/index.js";

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
    testsRun: 12,
    warnings: 1
  },
  recommendations: [
    "Add transcript parsing once the stable report model is covered."
  ],
  trend: {
    kind: "baseline",
    message: "This is the first saved report for this repository.",
    deltas: {}
  }
};

describe("renderInsightsReport", () => {
  it("renders an English Markdown report", () => {
    const markdown = renderInsightsReport(report, "en-US");

    expect(markdown).toContain("# Codex Insights");
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("Implemented the first version");
    expect(markdown).toContain("| Tool calls | 8 |");
    expect(markdown).toContain("## Trend");
    expect(markdown).toContain("first saved report");
  });

  it("renders a Chinese Markdown report from the same model", () => {
    const markdown = renderInsightsReport(report, "zh-CN");

    expect(markdown).toContain("# Codex 洞察");
    expect(markdown).toContain("## 摘要");
    expect(markdown).toContain("| 工具调用 | 8 |");
    expect(markdown).toContain("## 趋势");
    expect(markdown).toContain("首次保存的报告");
  });
});
