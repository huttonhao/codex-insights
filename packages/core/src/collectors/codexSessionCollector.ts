import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createDataQualityRecord,
  type DataQuality
} from "../model/dataQuality.js";

export interface CodexToolCall {
  name: string;
  arguments?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  exitCode?: number;
}

export interface CodexCommand {
  command: string;
  exitCode?: number;
  startedAt?: string;
  completedAt?: string;
  outputSnippet?: string;
}

export interface CodexFileEdit {
  path: string;
  operation?: string;
}

export interface CodexSession {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  userPrompts: unknown[];
  assistantActions: unknown[];
  toolCalls: CodexToolCall[];
  commands: CodexCommand[];
  fileEdits: CodexFileEdit[];
  warnings: string[];
}

export interface CollectCodexSessionOptions {
  sessionFile?: string;
  sessionJson?: string;
  candidateEnv?: NodeJS.ProcessEnv | Record<string, string | undefined>;
  commonSearchRoots?: string[];
}

export interface CodexSessionCollectionResult {
  session?: CodexSession;
  dataQuality: DataQuality[];
  attemptedSources: string[];
}

const sessionEnvKeys = [
  "CODEX_SESSION_FILE",
  "CODEX_INSIGHTS_SESSION_FILE",
  "CODEX_INSIGHTS_WORKSPACE"
];

export async function collectCodexSession(
  options: CollectCodexSessionOptions = {}
): Promise<CodexSessionCollectionResult> {
  const attemptedSources: string[] = [];
  const dataQuality: DataQuality[] = [];

  if (options.sessionJson) {
    attemptedSources.push("session-json");
    return parseSession(options.sessionJson, "session-json", attemptedSources);
  }

  if (options.sessionFile) {
    attemptedSources.push(options.sessionFile);
    return readSessionFile(options.sessionFile, attemptedSources);
  }

  const env = options.candidateEnv ?? process.env;
  for (const key of sessionEnvKeys) {
    const value = env[key];
    attemptedSources.push(key);
    if (!value) {
      continue;
    }

    const path = key === "CODEX_INSIGHTS_WORKSPACE" ? join(value, "session.json") : value;
    if (existsSync(path)) {
      return readSessionFile(path, attemptedSources);
    }
  }

  for (const candidate of createCommonCandidates(options.commonSearchRoots)) {
    attemptedSources.push(candidate);
    if (existsSync(candidate)) {
      return readSessionFile(candidate, attemptedSources);
    }
  }

  dataQuality.push(
    createDataQualityRecord({
      source: "codex-session",
      status: "missing",
      reason: "No readable Codex session source was found.",
      attemptedSources
    })
  );

  return {
    dataQuality,
    attemptedSources
  };
}

async function readSessionFile(
  path: string,
  attemptedSources: string[]
): Promise<CodexSessionCollectionResult> {
  try {
    const raw = await readFile(path, "utf8");
    return parseSession(raw, path, attemptedSources);
  } catch (error) {
    return {
      attemptedSources,
      dataQuality: [
        createDataQualityRecord({
          source: "codex-session",
          status: "unavailable",
          reason: `Unable to read session file: ${error instanceof Error ? error.message : String(error)}`,
          attemptedSources
        })
      ]
    };
  }
}

function parseSession(
  raw: string,
  source: string,
  attemptedSources: string[]
): CodexSessionCollectionResult {
  try {
    const parsed = JSON.parse(raw) as Partial<CodexSession>;
    const session: CodexSession = {
      sessionId: String(parsed.sessionId ?? "unknown-session"),
      startedAt: String(parsed.startedAt ?? new Date(0).toISOString()),
      endedAt: parsed.endedAt,
      userPrompts: Array.isArray(parsed.userPrompts) ? parsed.userPrompts : [],
      assistantActions: Array.isArray(parsed.assistantActions)
        ? parsed.assistantActions
        : [],
      toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      fileEdits: Array.isArray(parsed.fileEdits) ? parsed.fileEdits : [],
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.map((warning) => String(warning))
        : []
    };

    return {
      session,
      attemptedSources,
      dataQuality: [
        createDataQualityRecord({
          source: "codex-session",
          status: "ok",
          reason: `Loaded Codex session from ${source}.`,
          attemptedSources
        })
      ]
    };
  } catch (error) {
    return {
      attemptedSources,
      dataQuality: [
        createDataQualityRecord({
          source: "codex-session",
          status: "unavailable",
          reason: `Unable to parse session JSON: ${error instanceof Error ? error.message : String(error)}`,
          attemptedSources
        })
      ]
    };
  }
}

function createCommonCandidates(searchRoots?: string[]): string[] {
  const roots = searchRoots ?? [
    process.cwd(),
    join(homedir(), ".codex"),
    join(homedir(), ".codex", "sessions")
  ];
  return roots.flatMap((root) => [
    join(root, "session.json"),
    join(root, "codex-session.json"),
    join(root, "latest-session.json")
  ]);
}
