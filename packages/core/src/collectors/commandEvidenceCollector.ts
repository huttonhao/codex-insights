import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  createDataQualityRecord,
  type DataQuality
} from "../model/dataQuality.js";
import type {
  CommandEvidence,
  CommandEvidenceSummary
} from "../model/command.js";
import type { CodexSession } from "./codexSessionCollector.js";

export interface CollectCommandEvidenceOptions {
  session?: CodexSession;
  repoPath?: string;
  suppressUnknownDataQuality?: boolean;
}

export async function collectCommandEvidence(
  options: CollectCommandEvidenceOptions = {}
): Promise<CommandEvidenceSummary> {
  const dataQuality: DataQuality[] = [];
  const commands: CommandEvidence[] = [];

  if (options.session) {
    for (const command of options.session.commands) {
      commands.push({
        command: command.command,
        category: classifyCommand(command.command),
        source: "session",
        exitCode: command.exitCode,
        startedAt: command.startedAt,
        completedAt: command.completedAt,
        outputSnippet: command.outputSnippet,
        confidence: "high"
      });
    }
  }

  if (options.repoPath) {
    commands.push(...(await collectPackageScripts(options.repoPath, dataQuality)));
    commands.push(...(await collectCiCommands(options.repoPath)));
    commands.push(...(await collectTestFileEvidence(options.repoPath)));
    commands.push(...(await collectBuildConfigEvidence(options.repoPath)));
  }

  const executedTests = commands.filter(
    (command) => command.category === "test" && command.source === "session"
  );
  const testsRunKnown = executedTests.length > 0;
  const unknownReason = testsRunKnown
    ? undefined
    : "No executed test command was found in session or command history.";

  if (!testsRunKnown && !options.suppressUnknownDataQuality) {
    dataQuality.push(
      createDataQualityRecord({
        source: "test-evidence",
        status: "unavailable",
        reason: unknownReason ?? "No executed test command was found.",
        attemptedSources: [
          "session.commands",
          "package.json scripts",
          "local report history",
          "git diff"
        ]
      })
    );
  }

  return {
    testsRunKnown,
    testsRunCount: testsRunKnown ? executedTests.length : undefined,
    testCommands: commands.filter((command) => command.category === "test"),
    buildCommands: commands.filter((command) => command.category === "build"),
    lintCommands: commands.filter((command) => command.category === "lint"),
    typecheckCommands: commands.filter((command) => command.category === "typecheck"),
    dockerCommands: commands.filter((command) => command.category === "docker"),
    unknownReason,
    dataQuality
  };
}

export function classifyCommand(command: string): CommandEvidence["category"] {
  const normalized = command.toLowerCase();

  if (
    /\b(npm|pnpm|yarn)\s+(run\s+)?test\b/.test(normalized) ||
    /\bgo\s+test\b/.test(normalized) ||
    /\bmvn\s+test\b/.test(normalized) ||
    /\bgradle\s+test\b/.test(normalized) ||
    /\bpytest\b/.test(normalized) ||
    /\bcargo\s+test\b/.test(normalized)
  ) {
    return "test";
  }

  if (
    /\b(npm|pnpm|yarn)\s+(run\s+)?build\b/.test(normalized) ||
    /\bgo\s+build\b/.test(normalized) ||
    /\bmvn\s+package\b/.test(normalized) ||
    /\bgradle\s+build\b/.test(normalized)
  ) {
    return "build";
  }

  if (/\b(npm|pnpm|yarn)\s+(run\s+)?lint\b/.test(normalized)) {
    return "lint";
  }

  if (
    /\b(npm|pnpm|yarn)\s+(run\s+)?typecheck\b/.test(normalized) ||
    /\btsc\b/.test(normalized)
  ) {
    return "typecheck";
  }

  if (/\bdocker\s+compose\b/.test(normalized)) {
    return "docker";
  }

  return "other";
}

async function collectPackageScripts(
  repoPath: string,
  dataQuality: DataQuality[]
): Promise<CommandEvidence[]> {
  const packageJsonPath = join(repoPath, "package.json");
  if (!existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const packageJson = JSON.parse(
      await readFile(packageJsonPath, "utf8")
    ) as { scripts?: Record<string, string> };
    const scripts = packageJson.scripts ?? {};
    return Object.keys(scripts)
      .map((script) => ({
        command: `npm run ${script}`,
        category: classifyCommand(`npm run ${script}`),
        source: "package.json" as const,
        confidence: "medium" as const
      }))
      .filter((command) => command.category !== "other");
  } catch (error) {
    dataQuality.push(
      createDataQualityRecord({
        source: "package-scripts",
        status: "missing",
        reason: `Unable to read package scripts: ${error instanceof Error ? error.message : String(error)}`,
        attemptedSources: [packageJsonPath]
      })
    );
    return [];
  }
}

async function collectCiCommands(repoPath: string): Promise<CommandEvidence[]> {
  const workflowsDir = join(repoPath, ".github", "workflows");
  if (!existsSync(workflowsDir)) {
    return [];
  }

  const files = await listFiles(workflowsDir, repoPath, 50);
  const commands: CommandEvidence[] = [];
  for (const file of files.filter((item) => /\.(ya?ml)$/i.test(item.relativePath))) {
    const content = await readFile(file.absolutePath, "utf8").catch(() => "");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/run:\s*(.+)$/);
      if (!match) {
        continue;
      }
      const command = match[1]?.trim().replace(/^["']|["']$/g, "");
      if (!command) {
        continue;
      }
      const category = classifyCommand(command);
      if (category === "other") {
        continue;
      }
      commands.push({
        command,
        category,
        source: "ci",
        confidence: "medium"
      });
    }
  }
  return commands;
}

async function collectTestFileEvidence(repoPath: string): Promise<CommandEvidence[]> {
  const files = await listFiles(repoPath, repoPath, 300);
  return files
    .filter((file) => /(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\./.test(file.relativePath))
    .map((file) => ({
      command: `test file: ${file.relativePath}`,
      category: "test" as const,
      source: "test-file" as const,
      confidence: "medium" as const
    }));
}

async function collectBuildConfigEvidence(repoPath: string): Promise<CommandEvidence[]> {
  const files = await listFiles(repoPath, repoPath, 120);
  const buildConfigs = files.filter((file) =>
    /(^|\/)(tsconfig\.json|vite\.config\.[cm]?[tj]s|webpack\.config\.[cm]?[tj]s|rollup\.config\.[cm]?[tj]s|pom\.xml|build\.gradle|settings\.gradle|go\.mod|Cargo\.toml|pyproject\.toml|Dockerfile)$/.test(
      file.relativePath
    )
  );
  return buildConfigs.map((file) => ({
    command: `build config: ${file.relativePath}`,
    category: "build" as const,
    source: "build-config" as const,
    confidence: "low" as const
  }));
}

async function listFiles(
  root: string,
  repoPath: string,
  maxFiles: number
): Promise<Array<{ absolutePath: string; relativePath: string }>> {
  const results: Array<{ absolutePath: string; relativePath: string }> = [];
  const ignored = new Set(["node_modules", ".git", "dist", "build", "coverage"]);

  async function visit(path: string): Promise<void> {
    if (results.length >= maxFiles) {
      return;
    }
    const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (results.length >= maxFiles || ignored.has(entry.name)) {
        continue;
      }
      const absolutePath = join(path, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      const fileStat = await stat(absolutePath).catch(() => undefined);
      if (!fileStat || fileStat.size > 256 * 1024) {
        continue;
      }
      results.push({
        absolutePath,
        relativePath: relative(repoPath, absolutePath)
      });
    }
  }

  await visit(root);
  return results;
}
