import { execFile } from "node:child_process";
import { access, mkdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { defaultReportsDir } from "./history/reportHistory.js";
import {
  defaultCodexSessionsDir,
  scanCodexJsonlSessionFiles
} from "./collectors/codexJsonlSessionScanner.js";

const execFileAsync = promisify(execFile);

export interface DoctorCheck {
  name: string;
  ok: boolean;
  message: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
  warnings: string[];
}

export interface DoctorOptions {
  cwd?: string;
  sessionsDir?: string;
}

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const cwd = options.cwd ?? process.cwd();
  const checks: DoctorCheck[] = [];
  checks.push(checkNode());
  checks.push(await checkPackageManager(cwd));
  checks.push(await checkRepoRoot(cwd));
  checks.push(await checkGit(cwd));
  checks.push(await checkCodexCli(cwd));
  checks.push(await checkReportDir(cwd));
  checks.push(await checkMcpImport());
  checks.push(await checkSkill(cwd));
  checks.push(await checkWording(cwd));
  checks.push(await checkEmptyDataPatterns(cwd));
  checks.push(await checkSessionsDir(options.sessionsDir));
  checks.push(await checkRolloutJsonl(options.sessionsDir));

  return {
    checks,
    warnings: checks.filter((check) => !check.ok).map((check) => check.message)
  };
}

async function checkCodexCli(cwd: string): Promise<DoctorCheck> {
  const result = await run("codex", ["--version"], cwd);
  return {
    name: "codex-cli",
    ok: result.ok,
    message: result.ok ? `codex cli: ${result.stdout.trim()}` : `codex cli: ${result.error}`
  };
}

function checkNode(): DoctorCheck {
  return {
    name: "node",
    ok: Number(process.versions.node.split(".")[0]) >= 18,
    message: `node: ${process.versions.node}`
  };
}

async function checkPackageManager(cwd: string): Promise<DoctorCheck> {
  const packageJson = await readText(join(cwd, "package.json"));
  return {
    name: "package-manager",
    ok: packageJson !== undefined,
    message: packageJson ? "package manager: npm scripts available" : "package manager: package.json not found"
  };
}

async function checkRepoRoot(cwd: string): Promise<DoctorCheck> {
  const result = await run("git", ["rev-parse", "--show-toplevel"], cwd);
  return {
    name: "repo-root",
    ok: result.ok,
    message: result.ok ? `repo root: ${result.stdout.trim()}` : `repo root: ${result.error}`
  };
}

async function checkGit(cwd: string): Promise<DoctorCheck> {
  const result = await run("git", ["--version"], cwd);
  return {
    name: "git",
    ok: result.ok,
    message: result.ok ? `git: ${result.stdout.trim()}` : `git: ${result.error}`
  };
}

async function checkReportDir(cwd: string): Promise<DoctorCheck> {
  const path = join(cwd, defaultReportsDir);
  try {
    await mkdir(path, { recursive: true });
    await access(path, constants.W_OK);
    return {
      name: "report-dir",
      ok: true,
      message: `report dir: ${path}`
    };
  } catch (error) {
    return {
      name: "report-dir",
      ok: false,
      message: `report dir: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function checkMcpImport(): Promise<DoctorCheck> {
  try {
    await import("../../mcp-server/src/tools.js");
    return {
      name: "mcp",
      ok: true,
      message: "mcp: tools importable"
    };
  } catch (error) {
    return {
      name: "mcp",
      ok: false,
      message: `mcp: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function checkSkill(cwd: string): Promise<DoctorCheck> {
  const path = join(cwd, "skills", "codex-insights", "SKILL.md");
  const exists = await readText(path);
  return {
    name: "skill",
    ok: exists !== undefined,
    message: exists ? `skill: ${path}` : `skill: ${path} not found`
  };
}

async function checkWording(cwd: string): Promise<DoctorCheck> {
  const files = [
    "README.md",
    join("skills", "codex-insights", "SKILL.md")
  ];
  const disallowed = [
    "native " + "/insights",
    "built-in " + "/insights",
    "原生 " + "/insights"
  ];
  const matches: string[] = [];
  for (const file of files) {
    const text = await readText(join(cwd, file));
    if (!text) continue;
    for (const phrase of disallowed) {
      if (text.includes(phrase)) {
        matches.push(`${file}:${phrase}`);
      }
    }
  }
  return {
    name: "wording",
    ok: matches.length === 0,
    message: matches.length
      ? `wording: unsupported trigger wording found in ${matches.join(", ")}`
      : "wording: no unsupported native trigger claims found"
  };
}

async function checkEmptyDataPatterns(cwd: string): Promise<DoctorCheck> {
  const files = [
    join("packages", "cli", "src", "main.ts"),
    join("packages", "mcp-server", "src", "tools.ts")
  ];
  const patterns = [
    new RegExp("toolCalls" + ":\\s*\\[\\]"),
    new RegExp("filesTouched" + ":\\s*\\[\\]"),
    new RegExp("testsRun" + ":\\s*0"),
    new RegExp("warnings" + ":\\s*\\[\\]")
  ];
  const matches: string[] = [];
  for (const file of files) {
    const text = await readText(join(cwd, file));
    if (!text) continue;
    if (patterns.some((pattern) => pattern.test(text))) {
      matches.push(file);
    }
  }
  return {
    name: "empty-data",
    ok: matches.length === 0,
    message: matches.length
      ? `empty-data: synthetic empty report inputs found in ${matches.join(", ")}`
      : "empty-data: no synthetic empty main-path report inputs found"
  };
}

async function checkSessionsDir(sessionsDir = defaultCodexSessionsDir()): Promise<DoctorCheck> {
  try {
    await access(sessionsDir, constants.R_OK);
    return {
      name: "sessions-dir",
      ok: true,
      message: `sessions dir: ${sessionsDir}`
    };
  } catch (error) {
    return {
      name: "sessions-dir",
      ok: false,
      message: `sessions dir: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function checkRolloutJsonl(sessionsDir = defaultCodexSessionsDir()): Promise<DoctorCheck> {
  const scan = await scanCodexJsonlSessionFiles({ sessionsDir, limit: 1 });
  return {
    name: "rollout-jsonl",
    ok: scan.files.length > 0,
    message: scan.files.length > 0
      ? `rollout jsonl: found ${scan.files.length} sample file`
      : `rollout jsonl: none found in ${sessionsDir}`
  };
}

async function readText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

async function run(
  command: string,
  args: string[],
  cwd: string
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
  try {
    const { stdout } = await execFileAsync(command, args, { cwd });
    return { ok: true, stdout };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
