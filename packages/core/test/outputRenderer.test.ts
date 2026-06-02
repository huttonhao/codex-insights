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
  it("renders an English Tailwind-styled HTML report", () => {
    const html = renderInsightsReport(report, "en-US");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("https://cdn.tailwindcss.com");
    expect(html).toContain("Codex Insights");
    expect(html).toContain("Summary");
    expect(html).toContain("Implemented the first version");
    expect(html).toContain("Tool calls");
    expect(html).toContain(">8<");
    expect(html).toContain("Trend");
    expect(html).toContain("first saved report");
    expect(html).toContain("rounded-xl");
  });

  it("renders a Chinese Tailwind-styled HTML report from the same model", () => {
    const html = renderInsightsReport(report, "zh-CN");

    expect(html).toContain("Codex 洞察分析");
    expect(html).toContain("摘要");
    expect(html).toContain("工具调用");
    expect(html).toContain(">8<");
    expect(html).toContain("趋势");
    expect(html).toContain("首次保存的报告");
    expect(html).toContain("lang=\"zh-CN\"");
  });
});
