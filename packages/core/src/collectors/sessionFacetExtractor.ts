import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  createDataQualityRecord,
  type DataQuality
} from "../model/dataQuality.js";
import {
  createEmptySessionFacet,
  type SessionFacet
} from "../model/sessionFacet.js";
import type { ParsedCodexJsonlSession } from "./codexJsonlSessionParser.js";

const execFileAsync = promisify(execFile);
const parserSchemaVersion = "codex-jsonl-v1";
const promptVersion = "facet-v1";

export interface ExtractSessionFacetsOptions {
  llmFacets?: boolean;
  noLlm?: boolean;
  dryRun?: boolean;
  cacheDir?: string;
  model?: string;
}

export interface ExtractSessionFacetsResult {
  facets: SessionFacet[];
  dataQuality: DataQuality[];
}

export async function extractSessionFacets(
  sessions: ParsedCodexJsonlSession[],
  options: ExtractSessionFacetsOptions = {}
): Promise<ExtractSessionFacetsResult> {
  const dataQuality: DataQuality[] = [];
  const facets: SessionFacet[] = [];

  if (options.dryRun || options.noLlm || !options.llmFacets) {
    return {
      facets: sessions.map((session) => createHeuristicFacet(session)),
      dataQuality: [
        createDataQualityRecord({
          source: "session-facets",
          status: "partial",
          reason: "LLM facet extraction was not run; heuristic facets were used.",
          attemptedSources: ["Codex session metadata", "transcript snippets"]
        })
      ]
    };
  }

  for (const session of sessions) {
    const cached = await readCachedFacet(session, options.cacheDir);
    if (cached) {
      facets.push(cached);
      continue;
    }
    try {
      const facet = await extractFacetWithCodexExec(session, options.model);
      await writeCachedFacet(session, facet, options.cacheDir);
      facets.push(facet);
    } catch (error) {
      dataQuality.push(
        createDataQualityRecord({
          source: "session-facets",
          status: "partial",
          reason: `codex exec facet extraction failed: ${error instanceof Error ? error.message : String(error)}`,
          attemptedSources: ["codex exec", session.filePath]
        })
      );
      facets.push(createHeuristicFacet(session));
    }
  }

  return { facets, dataQuality };
}

export function facetCacheKey(sessionId: string): string {
  return `${sessionId}_${parserSchemaVersion}_${promptVersion}.json`;
}

function createHeuristicFacet(session: ParsedCodexJsonlSession): SessionFacet {
  const text = `${session.userPrompts.join("\n")}\n${session.assistantMessages.join("\n")}`.toLowerCase();
  const goalCategories: Record<string, number> = {};
  if (/test|spec|coverage/.test(text)) goalCategories.write_tests = 1;
  if (/fix|bug|error|failed/.test(text)) goalCategories.fix_bug = 1;
  if (/implement|add|build|create/.test(text)) goalCategories.implement_feature = 1;
  if (/refactor/.test(text)) goalCategories.refactor_code = 1;
  if (/explain|understand|what is|how does/.test(text)) goalCategories.understand_codebase = 1;
  if (Object.keys(goalCategories).length === 0) goalCategories.understand_codebase = 1;

  const failedCommands = session.commands.filter((command) => (command.exitCode ?? 0) !== 0 || /error|failed/i.test(command.outputSnippet ?? "")).length;
  const frictionCounts = {
    wrong_approach: 0,
    buggy_code: 0,
    misunderstood_request: 0,
    excessive_changes: 0,
    incomplete_implementation: 0,
    environment_issue: failedCommands,
    user_rejected_action: session.toolCalls.filter((tool) => tool.rejected).length
  };

  return {
    sessionId: session.sessionId,
    underlyingGoal: session.userPrompts[0]?.slice(0, 180) ?? "unclear from transcript",
    goalCategories,
    outcome: failedCommands > 0 ? "partially_achieved" : "unclear_from_transcript",
    userSatisfactionCounts: {
      frustrated: /\b(frustrated|angry|broken)\b/i.test(text) ? 1 : 0,
      dissatisfied: /\b(not right|wrong|bad)\b/i.test(text) ? 1 : 0,
      neutral: 0,
      likely_satisfied: /\b(ok|继续|next)\b/i.test(text) ? 1 : 0,
      satisfied: /\b(thanks|works|good)\b/i.test(text) ? 1 : 0,
      happy: /\b(great|perfect|yay|nice)\b/i.test(text) ? 1 : 0,
      no_explicit_feedback: 1
    },
    assistantHelpfulness: session.toolCalls.length > 0 ? "moderately_helpful" : "unclear",
    sessionType: session.userPrompts.length <= 1 ? "single_task" : session.userPrompts.length > 4 ? "multi_task" : "iterative_refinement",
    frictionCounts,
    frictionDetail: failedCommands > 0 ? `${failedCommands} failed command evidence entries were found.` : "No explicit friction evidence found in structured metadata.",
    primarySuccess: session.fileEdits.length > 1 ? "multi_file_changes" : session.fileEdits.length === 1 ? "correct_code_edits" : "good_explanations",
    briefSummary: session.userPrompts[0]?.slice(0, 220) ?? "Session summary unavailable.",
    sourceSessionIds: [session.sessionId],
    confidence: "medium"
  };
}

async function extractFacetWithCodexExec(
  session: ParsedCodexJsonlSession,
  model?: string
): Promise<SessionFacet> {
  const prompt = `Extract a Codex Insights session facet as JSON only.

Return keys: sessionId, underlyingGoal, goalCategories, outcome, userSatisfactionCounts, assistantHelpfulness, sessionType, frictionCounts, frictionDetail, primarySuccess, briefSummary, sourceSessionIds, confidence.

Session ID: ${session.sessionId}
Project: ${session.projectName ?? "unknown"}
Transcript:
${session.transcriptSnippet ?? session.userPrompts.join("\n")}
`;
  const args = ["exec", prompt, "--skip-git-repo-check", "-s", "read-only"];
  if (model) {
    args.push("-m", model);
  }
  const { stdout } = await execFileAsync("codex", args, {
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 8
  });
  const match = stdout.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("codex exec did not return JSON");
  }
  const parsed = JSON.parse(match[0]) as SessionFacet;
  return {
    ...parsed,
    sessionId: parsed.sessionId || session.sessionId,
    sourceSessionIds: parsed.sourceSessionIds?.length ? parsed.sourceSessionIds : [session.sessionId]
  };
}

async function readCachedFacet(
  session: ParsedCodexJsonlSession,
  cacheDir = ".codex-insights/cache/facets"
): Promise<SessionFacet | undefined> {
  const path = join(cacheDir, facetCacheKey(session.sessionId));
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(await readFile(path, "utf8")) as SessionFacet;
  } catch {
    return undefined;
  }
}

async function writeCachedFacet(
  session: ParsedCodexJsonlSession,
  facet: SessionFacet,
  cacheDir = ".codex-insights/cache/facets"
): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(join(cacheDir, facetCacheKey(session.sessionId)), `${JSON.stringify(facet, null, 2)}\n`, "utf8");
}
