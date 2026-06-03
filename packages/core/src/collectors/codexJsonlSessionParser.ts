import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import {
  createDataQualityRecord,
  type DataQuality
} from "../model/dataQuality.js";
import { redactSensitiveText, snippet } from "./redaction.js";

export interface ParsedCodexJsonlSession {
  sessionId: string;
  filePath: string;
  projectPath?: string;
  projectName?: string;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  model?: string;
  modelProvider?: string;
  cliVersion?: string;
  terminalType?: string;
  gitBranch?: string;
  gitRepo?: string;
  userPrompts: string[];
  assistantMessages: string[];
  toolCalls: Array<{
    name: string;
    argumentsSnippet?: string;
    outputSnippet?: string;
    accepted?: boolean;
    rejected?: boolean;
    startedAt?: string;
    completedAt?: string;
  }>;
  commands: Array<{
    command: string;
    exitCode?: number;
    outputSnippet?: string;
    startedAt?: string;
    completedAt?: string;
  }>;
  fileEdits: Array<{
    path: string;
    operation?: string;
    accepted?: boolean;
    rejected?: boolean;
  }>;
  warnings: string[];
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  estimatedCost?: {
    amount: number;
    currency: string;
  };
  linesAdded?: number;
  linesRemoved?: number;
  commitsCreated?: number;
  pullRequestsCreated?: number;
  transcriptSnippet?: string;
}

export interface ParseCodexJsonlSessionOptions {
  maxTranscriptChars?: number;
  redact?: boolean;
  includeTranscriptSnippets?: boolean;
}

export interface ParseCodexJsonlSessionResult {
  session?: ParsedCodexJsonlSession;
  dataQuality: DataQuality[];
}

interface ParsedLine {
  timestamp?: string;
  type?: string;
  record_type?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function parseCodexJsonlSessionFile(
  filePath: string,
  options: ParseCodexJsonlSessionOptions = {}
): Promise<ParseCodexJsonlSessionResult> {
  const dataQuality: DataQuality[] = [];
  const raw = await readFile(filePath, "utf8").catch((error) => {
    dataQuality.push(
      createDataQualityRecord({
        source: "codex-jsonl-parser",
        status: "unavailable",
        reason: `Unable to read JSONL session file: ${error instanceof Error ? error.message : String(error)}`,
        attemptedSources: [filePath]
      })
    );
    return undefined;
  });

  if (raw === undefined) {
    return { dataQuality };
  }

  const events: ParsedLine[] = [];
  const warnings: string[] = [];
  raw.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) {
      return;
    }
    try {
      events.push(JSON.parse(line) as ParsedLine);
    } catch {
      warnings.push(`Invalid JSONL line ${index + 1}`);
    }
  });

  if (events.length === 0) {
    dataQuality.push(
      createDataQualityRecord({
        source: "codex-jsonl-parser",
        status: "unavailable",
        reason: "No parseable JSONL events were found.",
        attemptedSources: [filePath],
        warnings
      })
    );
    return { dataQuality };
  }

  if (warnings.length > 0) {
    dataQuality.push(
      createDataQualityRecord({
        source: "codex-jsonl-parser",
        status: "partial",
        reason: "Some JSONL lines could not be parsed.",
        attemptedSources: [filePath],
        warnings
      })
    );
  }

  const session = buildParsedSession(filePath, events, warnings, options);
  if (!session.sessionId) {
    dataQuality.push(
      createDataQualityRecord({
        source: "codex-jsonl-parser",
        status: "unavailable",
        reason: "Session ID could not be determined from JSONL events.",
        attemptedSources: [filePath],
        warnings
      })
    );
    return { dataQuality };
  }

  return { session, dataQuality };
}

function buildParsedSession(
  filePath: string,
  events: ParsedLine[],
  warnings: string[],
  options: ParseCodexJsonlSessionOptions
): ParsedCodexJsonlSession {
  const redaction = { redact: options.redact !== false };
  const first = events[0];
  const meta = findPayload(events, "session_meta") ?? (first.id ? first : undefined);
  const turnContext = findPayload(events, "turn_context");
  const timestamps = events.map((event) => event.timestamp).filter(isString);
  const startedAt = stringValue(meta?.timestamp) ?? timestamps[0];
  const endedAt = timestamps[timestamps.length - 1] ?? startedAt;
  const durationMinutes =
    startedAt && endedAt
      ? Math.max(0, (Date.parse(endedAt) - Date.parse(startedAt)) / 60000)
      : undefined;
  const git = objectValue(meta?.git);
  const userPrompts: string[] = [];
  const assistantMessages: string[] = [];
  const toolCalls: ParsedCodexJsonlSession["toolCalls"] = [];
  const commands: ParsedCodexJsonlSession["commands"] = [];
  const fileEdits: ParsedCodexJsonlSession["fileEdits"] = [];
  const transcriptParts: string[] = [];
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let cacheReadTokens: number | undefined;
  let cacheCreationTokens: number | undefined;
  let linesAdded: number | undefined;
  let linesRemoved: number | undefined;
  let commitsCreated: number | undefined;
  let pullRequestsCreated: number | undefined;

  for (const event of events) {
    const payload = objectValue(event.payload) ?? event;
    const payloadType = stringValue(payload.type) ?? stringValue(event.type);

    if (payloadType === "user_message") {
      addUserMessage(stringValue(payload.message), userPrompts, transcriptParts, redaction);
    }
    if (payloadType === "agent_message") {
      addAssistantMessage(stringValue(payload.message), assistantMessages, transcriptParts, redaction);
    }
    if (payloadType === "token_count") {
      const usage = objectValue(objectValue(payload.info)?.total_token_usage);
      inputTokens = sumOptional(inputTokens, numberValue(usage?.input_tokens));
      outputTokens = sumOptional(outputTokens, numberValue(usage?.output_tokens));
      cacheReadTokens = sumOptional(cacheReadTokens, numberValue(usage?.cached_input_tokens));
      cacheCreationTokens = sumOptional(cacheCreationTokens, numberValue(usage?.cache_creation_input_tokens));
    }

    if (payloadType === "message" && stringValue(payload.role) === "user") {
      for (const text of contentTexts(payload.content)) {
        if (!text.startsWith("<user_instructions>") && !text.startsWith("<environment_context>")) {
          addUserMessage(text, userPrompts, transcriptParts, redaction);
        }
        const cwd = text.match(/<cwd>([^<]+)<\/cwd>/)?.[1];
        if (cwd && !meta?.cwd) {
          meta && (meta.cwd = cwd);
        }
      }
    }
    if (payloadType === "message" && stringValue(payload.role) === "assistant") {
      for (const text of contentTexts(payload.content)) {
        addAssistantMessage(text, assistantMessages, transcriptParts, redaction);
      }
    }

    if (payloadType === "function_call" && stringValue(payload.name)) {
      const toolCall = {
        name: stringValue(payload.name) ?? "unknown",
        argumentsSnippet: snippet(stringValue(payload.arguments), 500, redaction),
        accepted: booleanValue(payload.accepted),
        rejected: booleanValue(payload.rejected),
        startedAt: event.timestamp
      };
      toolCalls.push(toolCall);
      transcriptParts.push(`TOOL_CALL: ${toolCall.name} ${toolCall.argumentsSnippet ?? ""}`);
      const command = extractCommand(toolCall.name, stringValue(payload.arguments), redaction);
      if (command) {
        commands.push({
          command: command.command,
          startedAt: event.timestamp
        });
      }
      const edit = extractFileEdit(toolCall.name, stringValue(payload.arguments), redaction);
      if (edit) {
        fileEdits.push(edit);
      }
    }

    if (payloadType === "function_call_output") {
      const output = stringValue(payload.output);
      const last = toolCalls[toolCalls.length - 1];
      if (last) {
        last.outputSnippet = snippet(output, 800, redaction);
        last.completedAt = event.timestamp;
      }
      const lastCommand = isCommandTool(last?.name) ? commands[commands.length - 1] : undefined;
      if (lastCommand && output) {
        lastCommand.outputSnippet = snippet(output, 800, redaction);
        lastCommand.exitCode = extractExitCode(output);
        lastCommand.completedAt = event.timestamp;
      }
      const stats = extractLineStats(output);
      linesAdded = sumOptional(linesAdded, stats.linesAdded);
      linesRemoved = sumOptional(linesRemoved, stats.linesRemoved);
      commitsCreated = sumOptional(commitsCreated, stats.commitsCreated);
      pullRequestsCreated = sumOptional(pullRequestsCreated, stats.pullRequestsCreated);
      transcriptParts.push(`TOOL_OUTPUT: ${snippet(output, 800, redaction) ?? ""}`);
    }

    if (payloadType === "error" || stringValue(payload.level) === "error") {
      warnings.push(snippet(stringValue(payload.message) ?? stringValue(payload.text), 300, redaction) ?? "Unknown error event");
    }
  }

  return {
    sessionId: stringValue(meta?.id) ?? stringValue(first.id) ?? basename(filePath).replace(/\.jsonl$/i, ""),
    filePath,
    projectPath: stringValue(meta?.cwd) ?? stringValue(turnContext?.cwd),
    projectName: basename(stringValue(meta?.cwd) ?? stringValue(turnContext?.cwd) ?? ""),
    startedAt,
    endedAt,
    durationMinutes,
    model: stringValue(turnContext?.model) ?? stringValue(meta?.model),
    modelProvider: stringValue(meta?.model_provider),
    cliVersion: stringValue(meta?.cli_version),
    terminalType: stringValue(meta?.terminal_type),
    gitBranch: stringValue(git?.branch),
    gitRepo: stringValue(git?.repository_url),
    userPrompts,
    assistantMessages,
    toolCalls,
    commands,
    fileEdits,
    warnings: [...new Set(warnings)],
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    linesAdded,
    linesRemoved,
    commitsCreated,
    pullRequestsCreated,
    transcriptSnippet:
      options.includeTranscriptSnippets === false
        ? undefined
        : snippet(transcriptParts.join("\n"), options.maxTranscriptChars ?? 4000, redaction)
  };
}

function findPayload(events: ParsedLine[], type: string): Record<string, unknown> | undefined {
  const event = events.find((item) => item.type === type);
  return objectValue(event?.payload);
}

function addUserMessage(
  value: string | undefined,
  target: string[],
  transcriptParts: string[],
  redaction: { redact: boolean }
): void {
  if (!value) return;
  const text = redactSensitiveText(value, redaction) ?? value;
  target.push(text);
  transcriptParts.push(`USER: ${text}`);
}

function addAssistantMessage(
  value: string | undefined,
  target: string[],
  transcriptParts: string[],
  redaction: { redact: boolean }
): void {
  if (!value) return;
  const text = redactSensitiveText(value, redaction) ?? value;
  target.push(text);
  transcriptParts.push(`ASSISTANT: ${text}`);
}

function contentTexts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (objectValue(item)?.text ? String(objectValue(item)?.text) : undefined))
    .filter(isString);
}

function extractCommand(
  toolName: string,
  rawArguments: string | undefined,
  redaction: { redact: boolean }
): { command: string } | undefined {
  const lower = toolName.toLowerCase();
  if (!/(exec|shell|command|terminal|bash)/.test(lower)) {
    return undefined;
  }
  const parsed = parseArguments(rawArguments);
  const command =
    stringValue(parsed?.cmd) ??
    stringValue(parsed?.command) ??
    stringValue(parsed?.chars) ??
    rawArguments;
  return command ? { command: redactSensitiveText(command, redaction) ?? command } : undefined;
}

function isCommandTool(toolName: string | undefined): boolean {
  return toolName ? /(exec|shell|command|terminal|bash)/.test(toolName.toLowerCase()) : false;
}

function extractFileEdit(
  toolName: string,
  rawArguments: string | undefined,
  redaction: { redact: boolean }
): ParsedCodexJsonlSession["fileEdits"][number] | undefined {
  const lower = toolName.toLowerCase();
  const parsed = parseArguments(rawArguments);
  const path =
    stringValue(parsed?.path) ??
    stringValue(parsed?.filePath) ??
    stringValue(parsed?.filename) ??
    stringValue(parsed?.target_file);
  if (path) {
    return {
      path: redactSensitiveText(path, redaction) ?? path,
      operation: /delete/.test(lower) ? "delete" : /create|add/.test(lower) ? "create" : "edit",
      accepted: booleanValue(parsed?.accepted),
      rejected: booleanValue(parsed?.rejected)
    };
  }
  if (/apply_patch|edit|write|patch/.test(lower) && rawArguments) {
    const match = rawArguments.match(/\*\*\* (?:Update|Add|Delete) File: ([^\n]+)/);
    if (match?.[1]) {
      return {
        path: redactSensitiveText(match[1].trim(), redaction) ?? match[1].trim(),
        operation: /Add File/.test(rawArguments) ? "create" : /Delete File/.test(rawArguments) ? "delete" : "edit"
      };
    }
  }
  return undefined;
}

function parseArguments(raw: string | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return objectValue(parsed);
  } catch {
    return undefined;
  }
}

function extractExitCode(output: string): number | undefined {
  const match = output.match(/exit\s*code[:=]\s*(\d+)/i);
  return match ? Number.parseInt(match[1] ?? "", 10) : undefined;
}

function extractLineStats(output: string | undefined): {
  linesAdded?: number;
  linesRemoved?: number;
  commitsCreated?: number;
  pullRequestsCreated?: number;
} {
  if (!output) return {};
  return {
    linesAdded: numberFromMatch(output, /(\d+)\s+(?:insertions?|lines?\s+added)/i),
    linesRemoved: numberFromMatch(output, /(\d+)\s+(?:deletions?|lines?\s+removed)/i),
    commitsCreated: /(?:git\s+commit|created\s+commit|commit\s+[a-f0-9]{7,})/i.test(output) ? 1 : undefined,
    pullRequestsCreated: /(?:pull request|created pr|gh pr create)/i.test(output) ? 1 : undefined
  };
}

function numberFromMatch(value: string, pattern: RegExp): number | undefined {
  const match = value.match(pattern);
  return match?.[1] ? Number.parseInt(match[1], 10) : undefined;
}

function sumOptional(left: number | undefined, right: number | undefined): number | undefined {
  if (right === undefined || Number.isNaN(right)) return left;
  return (left ?? 0) + right;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}
