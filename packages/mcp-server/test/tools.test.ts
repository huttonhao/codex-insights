import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import {
  doctor,
  getRepoInsights,
  getSessionInsights,
  getWorkspaceInsights,
  listSupportedLocales
} from "../src/tools.js";

const workspacePath = fileURLToPath(
  new URL("../../core/test/fixtures/workspace-rag/", import.meta.url)
);

describe("MCP tool handlers", () => {
  it("lists supported locales", () => {
    expect(listSupportedLocales()).toEqual({
      locales: ["en-US", "zh-CN"],
      fallbackLocale: "en-US"
    });
  });

  it("generates a localized Markdown session insight report", async () => {
    const result = await getSessionInsights({
      locale: "zh-CN",
      save: false,
      cwd: "/repo/codex-insights",
      now: "2026-06-02T08:00:00.000Z",
      format: "markdown"
    });

    expect(result.locale).toBe("zh-CN");
    expect(result.format).toBe("markdown");
    expect(result.report.schemaVersion).toBe("3.0");
    expect(result.markdownSummary).toContain("# Codex 洞察分析");
    expect(result.saved).toBeUndefined();
  });

  it("generates workspace deep insights with RAG report data", async () => {
    const result = await getWorkspaceInsights({
      locale: "zh-CN",
      workspacePath,
      deep: true,
      topics: ["rag"],
      format: "markdown",
      save: false
    });

    expect(result.report.scanSummary.projectsScanned).toBe(5);
    expect(result.report.deepTopics[0]?.topic).toBe("rag");
    expect(result.markdownSummary).toContain("RAG 深挖");
    expect(result.dataQuality).toEqual(result.report.dataQuality);
  });

  it("generates repo insights without claiming unknown tests are zero", async () => {
    const result = await getRepoInsights({
      locale: "en-US",
      repoPath: workspacePath,
      format: "json",
      save: false
    });

    expect(result.report.metrics.testsRunKnown).toBe(false);
    expect(result.report.metrics.testsRunCount).toBeUndefined();
  });

  it("runs doctor checks", async () => {
    const result = await doctor({ cwd: process.cwd() });

    expect(result.checks.some((check) => check.name === "node")).toBe(true);
    expect(result.checks.some((check) => check.name === "skill")).toBe(true);
    expect(result.warnings).toEqual(expect.any(Array));
  });
});
