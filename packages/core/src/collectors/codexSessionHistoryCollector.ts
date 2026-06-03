import {
  parseCodexJsonlSessionFile,
  type ParsedCodexJsonlSession
} from "./codexJsonlSessionParser.js";
import {
  scanCodexJsonlSessionFiles
} from "./codexJsonlSessionScanner.js";
import {
  extractSessionFacets
} from "./sessionFacetExtractor.js";
import {
  buildAgentRuleSuggestions,
  buildInsightSections,
  buildUsageAnalytics,
  type InsightSections
} from "./sessionHistoryAggregator.js";
import type { AgentRuleSuggestion } from "../model/agentRuleSuggestion.js";
import type { DataQuality } from "../model/dataQuality.js";
import type { SessionFacet } from "../model/sessionFacet.js";
import type { UsageAnalytics } from "../model/usageAnalytics.js";

export interface CollectCodexSessionHistoryOptions {
  sessionsDir?: string;
  limit?: number;
  minUserMessages?: number;
  minDurationMinutes?: number;
  dryRun?: boolean;
  noLlm?: boolean;
  llmFacets?: boolean;
  redact?: boolean;
  includeTranscriptSnippets?: boolean;
  locale: "en-US" | "zh-CN";
  cacheDir?: string;
}

export interface CodexHistorySummary {
  sessionsDir?: string;
  scannedFiles: number;
  parsedSessions: number;
  qualifyingSessions: number;
  skippedSessions: number;
  dryRun: boolean;
}

export interface CollectCodexSessionHistoryResult {
  sessions: ParsedCodexJsonlSession[];
  qualifyingSessions: ParsedCodexJsonlSession[];
  sessionFacets: SessionFacet[];
  usageAnalytics: UsageAnalytics;
  agentRuleSuggestions: AgentRuleSuggestion[];
  insightSections: InsightSections;
  codexHistory: CodexHistorySummary;
  dataQuality: DataQuality[];
}

export async function collectCodexSessionHistory(
  options: CollectCodexSessionHistoryOptions
): Promise<CollectCodexSessionHistoryResult> {
  const dataQuality: DataQuality[] = [];
  const scan = await scanCodexJsonlSessionFiles({
    sessionsDir: options.sessionsDir,
    limit: options.limit
  });
  dataQuality.push(...scan.dataQuality);

  const sessions: ParsedCodexJsonlSession[] = [];
  for (const file of scan.files) {
    const parsed = await parseCodexJsonlSessionFile(file, {
      redact: options.redact !== false,
      includeTranscriptSnippets: options.includeTranscriptSnippets !== false
    });
    dataQuality.push(...parsed.dataQuality);
    if (parsed.session) {
      sessions.push(parsed.session);
    }
  }

  const minUserMessages = options.minUserMessages ?? 1;
  const minDurationMinutes = options.minDurationMinutes ?? 0;
  const qualifyingSessions = sessions
    .filter((session) => session.userPrompts.length >= minUserMessages)
    .filter((session) => (session.durationMinutes ?? 0) >= minDurationMinutes)
    .sort((left, right) => (right.startedAt ?? "").localeCompare(left.startedAt ?? ""));
  const facetsResult = await extractSessionFacets(qualifyingSessions, {
    dryRun: options.dryRun,
    noLlm: options.noLlm,
    llmFacets: options.llmFacets,
    cacheDir: options.cacheDir
  });
  dataQuality.push(...facetsResult.dataQuality);

  const analytics = buildUsageAnalytics(sessions, qualifyingSessions);
  dataQuality.push(...analytics.dataQuality);
  const agentRuleSuggestions = buildAgentRuleSuggestions({
    sessions: qualifyingSessions,
    locale: options.locale
  });
  const insightSections = buildInsightSections({
    sessions: qualifyingSessions,
    facets: facetsResult.facets,
    usageAnalytics: analytics.usageAnalytics,
    locale: options.locale
  });

  return {
    sessions,
    qualifyingSessions,
    sessionFacets: facetsResult.facets,
    usageAnalytics: analytics.usageAnalytics,
    agentRuleSuggestions,
    insightSections,
    codexHistory: {
      sessionsDir: scan.sessionsDir,
      scannedFiles: scan.files.length,
      parsedSessions: sessions.length,
      qualifyingSessions: qualifyingSessions.length,
      skippedSessions: Math.max(0, sessions.length - qualifyingSessions.length),
      dryRun: options.dryRun === true
    },
    dataQuality
  };
}
