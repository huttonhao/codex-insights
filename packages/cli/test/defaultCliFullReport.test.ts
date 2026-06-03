import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../src/main.js";

const workspacePath = fileURLToPath(
  new URL("../../core/test/fixtures/workspace-rag/", import.meta.url)
);
const sessionsDir = fileURLToPath(
  new URL("../../core/test/fixtures/codex-sessions/", import.meta.url)
);

let tempRoot: string | undefined;

afterEach(async () => {
  if (tempRoot) {
    await rm(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

describe("default CLI full report", () => {
  it("defaults to en-US, full scope, and summary output when not saving", async () => {
    const previousWorkspace = process.env.CODEX_INSIGHTS_WORKSPACE;
    process.env.CODEX_INSIGHTS_WORKSPACE = workspacePath;
    try {
      const result = await runCli([
        "report",
        "--sessions-dir",
        sessionsDir,
        "--limit",
        "4",
        "--no-llm",
        "--no-save"
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Mode: full");
      expect(result.stdout).toContain("Locale: en-US");
      expect(result.stdout).toContain("Deep topics:");
    } finally {
      if (previousWorkspace === undefined) {
        delete process.env.CODEX_INSIGHTS_WORKSPACE;
      } else {
        process.env.CODEX_INSIGHTS_WORKSPACE = previousWorkspace;
      }
    }
  }, 10_000);

  it("saves html, markdown, json, and latest aliases by default", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "codex-insights-cli-"));
    const oldCwd = process.cwd();
    const previousWorkspace = process.env.CODEX_INSIGHTS_WORKSPACE;
    process.chdir(tempRoot);
    process.env.CODEX_INSIGHTS_WORKSPACE = workspacePath;

    try {
      const result = await runCli([
        "report",
        "--locale",
        "zh-CN",
        "--sessions-dir",
        sessionsDir,
        "--limit",
        "4",
        "--no-llm"
      ]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Codex Insights full report generated.");
      expect(existsSync(join(tempRoot, ".codex-insights/reports/latest.zh-CN.html"))).toBe(true);
      expect(existsSync(join(tempRoot, ".codex-insights/reports/latest.zh-CN.md"))).toBe(true);
      expect(existsSync(join(tempRoot, ".codex-insights/reports/latest.zh-CN.json"))).toBe(true);
    } finally {
      process.chdir(oldCwd);
      if (previousWorkspace === undefined) {
        delete process.env.CODEX_INSIGHTS_WORKSPACE;
      } else {
        process.env.CODEX_INSIGHTS_WORKSPACE = previousWorkspace;
      }
    }
  }, 10_000);
});
