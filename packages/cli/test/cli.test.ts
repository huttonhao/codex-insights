import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { runCli } from "../src/main.js";

const workspacePath = fileURLToPath(
  new URL("../../core/test/fixtures/workspace-rag/", import.meta.url)
);

describe("codex-insights CLI", () => {
  it("prints supported locales", async () => {
    const result = await runCli(["locales"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("en-US");
    expect(result.stdout).toContain("zh-CN");
  });

  it("prints a localized HTML report without saving", async () => {
    const result = await runCli([
      "report",
      "--scope",
      "workspace",
      "--workspace",
      workspacePath,
      "--locale",
      "zh-CN",
      "--format",
      "html",
      "--no-save"
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("<!doctype html>");
    expect(result.stdout).toContain("Codex Insights 全量洞察报告");
    expect(result.stdout).toContain("<style>");
    expect(result.stdout).not.toContain("https://cdn.tailwindcss.com");
    expect(result.stderr).toBe("");
  }, 10_000);

  it("prints a deep workspace JSON report without saving", async () => {
    const result = await runCli([
      "report",
      "--locale",
      "zh-CN",
      "--deep",
      "--workspace",
      workspacePath,
      "--topics",
      "rag",
      "--format",
      "json",
      "--no-save"
    ]);

    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.stdout) as {
      schemaVersion: string;
      scanSummary: { mode: string; projectsScanned: number };
      deepTopics: Array<{ topic: string; mentionedProjects: number }>;
    };
    expect(report.schemaVersion).toBe("3.0");
    expect(report.scanSummary).toMatchObject({
      mode: "workspace",
      projectsScanned: 5
    });
    expect(report.deepTopics[0]).toMatchObject({
      topic: "rag",
      mentionedProjects: 5
    });
  });

  it("prints a deep workspace Markdown report without saving", async () => {
    const result = await runCli([
      "report",
      "--locale",
      "zh-CN",
      "--deep",
      "--workspace",
      workspacePath,
      "--format",
      "markdown",
      "--no-save"
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Codex Insights 全量洞察报告");
    expect(result.stdout).toContain("## 8. RAG 深度分析");
    expect(result.stdout).toContain("rag-production-like");
  });

  it("runs doctor checks", async () => {
    const result = await runCli(["doctor"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("node:");
    expect(result.stdout).toContain("git:");
    expect(result.stdout).toContain("skill:");
    expect(result.stdout).toContain("wording:");
  });
});
