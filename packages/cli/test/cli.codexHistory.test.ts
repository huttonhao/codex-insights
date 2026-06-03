import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const sessionsDir = fileURLToPath(
  new URL("../../core/test/fixtures/codex-sessions/", import.meta.url)
);

describe("cli codex history", () => {
  it("runs codex-history dry-run JSON without LLM", async () => {
    const { stdout } = await execFileAsync(
      "npm",
      [
        "run",
        "cli",
        "--",
        "report",
        "--locale",
        "zh-CN",
        "--codex-history",
        "--sessions-dir",
        sessionsDir,
        "--dry-run",
        "--format",
        "json",
        "--no-save"
      ],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 * 8 }
    );
    const report = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
      schemaVersion: string;
      codexHistory: { scannedFiles: number; dryRun: boolean };
      usageAnalytics: { totalSessions: number };
    };

    expect(report.schemaVersion).toBe("3.0");
    expect(report.codexHistory.dryRun).toBe(true);
    expect(report.codexHistory.scannedFiles).toBeGreaterThanOrEqual(4);
    expect(report.usageAnalytics.totalSessions).toBeGreaterThan(0);
  });

  it("renders codex-history markdown without LLM", async () => {
    const { stdout } = await execFileAsync(
      "npm",
      [
        "run",
        "cli",
        "--",
        "report",
        "--locale",
        "zh-CN",
        "--codex-history",
        "--sessions-dir",
        sessionsDir,
        "--no-llm",
        "--format",
        "markdown",
        "--no-save"
      ],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 * 8 }
    );

    expect(stdout).toContain("Codex Insights 全量洞察报告");
    expect(stdout).toContain("## 0. 执行摘要");
    expect(stdout).toContain("## 16. 建议加入 AGENTS.md 的规则");
  });
});
