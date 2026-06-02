import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
  }

  const executedTests = commands.filter(
    (command) => command.category === "test" && command.source === "session"
  );
  const testsRunKnown = executedTests.length > 0;
  const unknownReason = testsRunKnown
    ? undefined
    : "No executed test command was found in session or command history.";

  if (!testsRunKnown) {
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
  try {
    const packageJson = JSON.parse(
      await readFile(join(repoPath, "package.json"), "utf8")
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
        attemptedSources: [join(repoPath, "package.json")]
      })
    );
    return [];
  }
}
