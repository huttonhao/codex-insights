import { execFileSync } from "node:child_process";
import { mkdtemp, realpath, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectGitContext } from "../src/index.js";

let repoPath: string;

beforeEach(async () => {
  repoPath = await mkdtemp(join(tmpdir(), "codex-insights-git-"));
  git(["init"]);
  git(["config", "user.email", "test@example.com"]);
  git(["config", "user.name", "Test User"]);
  await writeFile(join(repoPath, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
  await mkdir(join(repoPath, "src"), { recursive: true });
  await writeFile(join(repoPath, "src", "index.ts"), "export const value = 1;\n");
  git(["add", "."]);
  git(["commit", "-m", "initial commit"]);
});

afterEach(async () => {
  await rm(repoPath, { recursive: true, force: true });
});

describe("collectGitContext", () => {
  it("collects branch, commit, status groups, diff summary, classifications, and command evidence", async () => {
    await writeFile(join(repoPath, "src", "index.ts"), "export const value = 2;\n");
    await writeFile(join(repoPath, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    git(["add", "tsconfig.json"]);
    await writeFile(join(repoPath, "README.md"), "# Docs\n");

    const context = await collectGitContext(repoPath);

    expect(context.repoRoot).toBe(await realpath(repoPath));
    expect((context.currentBranch ?? "").length).toBeGreaterThan(0);
    expect(context.currentCommit).toMatch(/[a-f0-9]{7,40}/);
    expect(context.changedFiles).toContain("src/index.ts");
    expect(context.stagedFiles).toContain("tsconfig.json");
    expect(context.untrackedFiles).toContain("README.md");
    expect(context.recentCommits[0]).toContain("initial commit");
    expect(context.diffSummary).toContain("src/index.ts");
    expect(context.fileClassifications.source).toContain("src/index.ts");
    expect(context.fileClassifications.config).toContain("tsconfig.json");
    expect(context.fileClassifications.docs).toContain("README.md");
    expect(context.evidence.some((item) => item.command?.includes("git status"))).toBe(true);
    expect(context.dataQuality.every((item) => item.status !== "missing")).toBe(true);
  });

  it("returns data-quality warnings instead of throwing when git is unavailable for a path", async () => {
    const context = await collectGitContext(join(repoPath, "not-a-repo"));

    expect(context.repoRoot).toBe(join(repoPath, "not-a-repo"));
    expect(context.dataQuality.some((item) => item.status === "unavailable")).toBe(true);
    expect(context.evidence).toEqual([]);
  });
});

function git(args: string[]): void {
  execFileSync("git", args, { cwd: repoPath, stdio: "ignore" });
}
