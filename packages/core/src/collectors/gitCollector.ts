import { execFile } from "node:child_process";
import { basename } from "node:path";
import { promisify } from "node:util";
import {
  createDataQualityRecord,
  type DataQuality
} from "../model/dataQuality.js";
import type { Evidence } from "../model/evidence.js";

const execFileAsync = promisify(execFile);

export interface GitContext {
  repoRoot: string;
  currentBranch?: string;
  currentCommit?: string;
  remoteUrls: string[];
  statusShort: string;
  changedFiles: string[];
  stagedFiles: string[];
  untrackedFiles: string[];
  recentCommits: string[];
  diffSummary: string;
  changedFileExtensions: string[];
  fileClassifications: {
    test: string[];
    config: string[];
    docs: string[];
    source: string[];
  };
  evidence: Evidence[];
  dataQuality: DataQuality[];
}

export async function collectGitContext(repoPath: string): Promise<GitContext> {
  const dataQuality: DataQuality[] = [];
  const evidence: Evidence[] = [];
  const empty: GitContext = {
    repoRoot: repoPath,
    remoteUrls: [],
    statusShort: "",
    changedFiles: [],
    stagedFiles: [],
    untrackedFiles: [],
    recentCommits: [],
    diffSummary: "",
    changedFileExtensions: [],
    fileClassifications: {
      test: [],
      config: [],
      docs: [],
      source: []
    },
    evidence,
    dataQuality
  };

  const root = await git(repoPath, ["rev-parse", "--show-toplevel"]);
  if (!root.ok) {
    dataQuality.push(
      createDataQualityRecord({
        source: "git",
        status: "unavailable",
        reason: root.error,
        attemptedSources: ["git rev-parse --show-toplevel"]
      })
    );
    return empty;
  }

  const repoRoot = root.stdout.trim();
  const [branch, commit, remotes, status, log, diff] = await Promise.all([
    git(repoRoot, ["branch", "--show-current"]),
    git(repoRoot, ["rev-parse", "HEAD"]),
    git(repoRoot, ["remote", "-v"]),
    git(repoRoot, ["status", "--short"]),
    git(repoRoot, ["log", "--oneline", "-5"]),
    git(repoRoot, ["diff", "--stat", "--stat-count=40"])
  ]);

  for (const result of [branch, commit, remotes, status, log, diff]) {
    if (!result.ok) {
      dataQuality.push(
        createDataQualityRecord({
          source: "git",
          status: "partial",
          reason: result.error,
          attemptedSources: [result.command]
        })
      );
    }
  }

  const parsedStatus = parseStatus(status.ok ? status.stdout : "");
  const files = unique([
    ...parsedStatus.changedFiles,
    ...parsedStatus.stagedFiles,
    ...parsedStatus.untrackedFiles
  ]);
  const classifications = classifyFiles(files);
  const projectName = basename(repoRoot);

  if (status.ok) {
    evidence.push({
      projectName,
      filePath: ".",
      signal: "git status",
      snippet: status.stdout.slice(0, 1000),
      confidence: "high",
      source: "git",
      command: "git status --short",
      path: repoRoot
    });
  }

  if (diff.ok && diff.stdout.trim()) {
    evidence.push({
      projectName,
      filePath: ".",
      signal: "git diff summary",
      snippet: diff.stdout.slice(0, 1000),
      confidence: "high",
      source: "git",
      command: "git diff --stat --stat-count=40",
      path: repoRoot
    });
  }

  return {
    repoRoot,
    currentBranch: branch.ok ? branch.stdout.trim() : undefined,
    currentCommit: commit.ok ? commit.stdout.trim() : undefined,
    remoteUrls: parseRemoteUrls(remotes.ok ? remotes.stdout : ""),
    statusShort: status.ok ? status.stdout : "",
    changedFiles: parsedStatus.changedFiles,
    stagedFiles: parsedStatus.stagedFiles,
    untrackedFiles: parsedStatus.untrackedFiles,
    recentCommits: log.ok ? log.stdout.trim().split("\n").filter(Boolean) : [],
    diffSummary: diff.ok ? diff.stdout : "",
    changedFileExtensions: unique(
      files.map((file) => file.match(/\.([^.\\/]+)$/)?.[1]).filter(Boolean) as string[]
    ),
    fileClassifications: classifications,
    evidence,
    dataQuality
  };
}

type GitResult =
  | { ok: true; stdout: string; command: string }
  | { ok: false; error: string; command: string };

async function git(cwd: string, args: string[]): Promise<GitResult> {
  const command = `git ${args.join(" ")}`;
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 1024 * 1024
    });
    return { ok: true, stdout, command };
  } catch (error) {
    return {
      ok: false,
      command,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function parseStatus(status: string): {
  changedFiles: string[];
  stagedFiles: string[];
  untrackedFiles: string[];
} {
  const changedFiles: string[] = [];
  const stagedFiles: string[] = [];
  const untrackedFiles: string[] = [];

  for (const line of status.split("\n").filter(Boolean)) {
    const code = line.slice(0, 2);
    const file = line.slice(3).replace(/^"|"$/g, "");
    if (code === "??") {
      untrackedFiles.push(file);
      continue;
    }
    if (code[0] && code[0] !== " ") {
      stagedFiles.push(file);
    }
    if (code[1] && code[1] !== " ") {
      changedFiles.push(file);
    }
  }

  return {
    changedFiles: unique(changedFiles),
    stagedFiles: unique(stagedFiles),
    untrackedFiles: unique(untrackedFiles)
  };
}

function parseRemoteUrls(output: string): string[] {
  return unique(
    output
      .split("\n")
      .map((line) => line.split(/\s+/)[1])
      .filter(Boolean)
  );
}

function classifyFiles(files: string[]): GitContext["fileClassifications"] {
  return {
    test: files.filter((file) => /(^|\/)(test|tests|__tests__)\/|\.test\.|\.spec\./.test(file)),
    config: files.filter((file) =>
      /(^|\/)(package\.json|tsconfig\.json|vite\.config|vitest\.config|pom\.xml|build\.gradle|go\.mod|Cargo\.toml|\.github\/)/.test(
        file
      )
    ),
    docs: files.filter((file) => /\.(md|mdx|rst|txt)$/i.test(file)),
    source: files.filter((file) => /\.(ts|tsx|js|jsx|py|go|rs|java|kt|cs)$/i.test(file))
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
