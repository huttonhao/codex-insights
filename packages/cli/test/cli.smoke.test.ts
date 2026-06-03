import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const workspacePath = fileURLToPath(
  new URL("../../core/test/fixtures/workspace-rag/", import.meta.url)
);

describe("cli smoke", () => {
  it("runs deep workspace JSON through the real CLI entry", async () => {
    const { stdout } = await execFileAsync(
      "npm",
      [
        "run",
        "cli",
        "--",
        "report",
        "--locale",
        "zh-CN",
        "--deep",
        "--workspace",
        workspacePath,
        "--format",
        "json",
        "--no-save"
      ],
      { cwd: repoRoot, maxBuffer: 1024 * 1024 * 8 }
    );
    const report = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
      schemaVersion: string;
      scanSummary: { projectsScanned: number };
      deepTopics: Array<{ topic: string; mentionedProjects: number }>;
    };

    expect(report.schemaVersion).toBe("2.0");
    expect(report.scanSummary.projectsScanned).toBe(5);
    expect(report.deepTopics[0]).toMatchObject({
      topic: "rag",
      mentionedProjects: 5
    });
  });

  it("runs doctor through the real CLI entry", async () => {
    const { stdout } = await execFileAsync("npm", ["run", "cli", "--", "doctor"], {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024
    });

    expect(stdout).toContain("node: ok");
    expect(stdout).toContain("empty-data: ok");
  });
});
