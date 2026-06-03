import type { AgentRuleSuggestion } from "../model/agentRuleSuggestion.js";
import type { DataQuality } from "../model/dataQuality.js";
import { createDataQualityRecord } from "../model/dataQuality.js";
import type { Evidence } from "../model/evidence.js";
import type { SessionFacet } from "../model/sessionFacet.js";
import type { UsageAnalytics } from "../model/usageAnalytics.js";
import { tx } from "../i18n/index.js";
import type { ParsedCodexJsonlSession } from "./codexJsonlSessionParser.js";

export interface InsightSections {
  atAGlance: string[];
  whatYouWorkOn: string[];
  howYouUseCodex: string[];
  impressiveThings: string[];
  whereThingsGoWrong: string[];
  featuresToTry: string[];
  suggestedAgentsAdditions: string[];
  newWaysToUseCodex: string[];
  onTheHorizon: string[];
}

export function buildUsageAnalytics(
  sessions: ParsedCodexJsonlSession[],
  qualifyingSessions = sessions
): { usageAnalytics: UsageAnalytics; dataQuality: DataQuality[] } {
  const dataQuality: DataQuality[] = [];
  const activeDays = new Set(qualifyingSessions.map((session) => datePart(session.startedAt)).filter(Boolean));
  const totalMessages = sum(qualifyingSessions.map((session) => session.userPrompts.length + session.assistantMessages.length));
  const userMessages = sum(qualifyingSessions.map((session) => session.userPrompts.length));
  const assistantMessages = sum(qualifyingSessions.map((session) => session.assistantMessages.length));
  const toolCalls = sum(qualifyingSessions.map((session) => session.toolCalls.length));
  const commands = sum(qualifyingSessions.map((session) => session.commands.length));
  const filesModified = countDistinct(qualifyingSessions.flatMap((session) => session.fileEdits.map((edit) => `${session.sessionId}:${edit.path}`)));
  const linesAdded = sumKnown(qualifyingSessions.map((session) => session.linesAdded));
  const linesRemoved = sumKnown(qualifyingSessions.map((session) => session.linesRemoved));
  const commitsCreated = sumKnown(qualifyingSessions.map((session) => session.commitsCreated));
  const pullRequestsCreated = sumKnown(qualifyingSessions.map((session) => session.pullRequestsCreated));

  addUnknownIfAllMissing(dataQuality, "linesAdded", qualifyingSessions.map((session) => session.linesAdded));
  addUnknownIfAllMissing(dataQuality, "linesRemoved", qualifyingSessions.map((session) => session.linesRemoved));
  addUnknownIfAllMissing(dataQuality, "commitsCreated", qualifyingSessions.map((session) => session.commitsCreated));
  addUnknownIfAllMissing(dataQuality, "pullRequestsCreated", qualifyingSessions.map((session) => session.pullRequestsCreated));
  addUnknownIfAllMissing(dataQuality, "acceptedRejectedActions", qualifyingSessions.flatMap((session) => session.toolCalls.map((tool) => tool.accepted ?? tool.rejected ? 1 : undefined)));

  return {
    usageAnalytics: {
      activeDays: activeDays.size,
      totalSessions: sessions.length,
      qualifyingSessions: qualifyingSessions.length,
      totalMessages,
      userMessages,
      assistantMessages,
      toolCalls,
      commands,
      linesAdded,
      linesRemoved,
      filesModified,
      commitsCreated,
      pullRequestsCreated,
      toolActionStats: buildToolActionStats(qualifyingSessions),
      commandStats: buildCommandStats(qualifyingSessions),
      modelBreakdown: buildModelBreakdown(qualifyingSessions),
      projectBreakdown: buildProjectBreakdown(qualifyingSessions),
      dailyTrend: buildDailyTrend(qualifyingSessions)
    },
    dataQuality
  };
}

export function buildInsightSections(input: {
  sessions: ParsedCodexJsonlSession[];
  facets: SessionFacet[];
  usageAnalytics: UsageAnalytics;
  locale: "en-US" | "zh-CN";
}): InsightSections {
  const { sessions, facets, usageAnalytics, locale } = input;
  const topProjects = usageAnalytics.projectBreakdown?.slice(0, 3).map((project) => displayProjectName(project.projectName, locale)) ?? [];
  const topModels = usageAnalytics.modelBreakdown?.slice(0, 3).map((model) => model.model) ?? [];
  const friction = aggregateFacetCounts(facets.flatMap((facet) => Object.entries(facet.frictionCounts)));
  const goals = aggregateFacetCounts(facets.flatMap((facet) => Object.entries(facet.goalCategories)));
  const successes = aggregateFacetCounts(facets.map((facet) => [facet.primarySuccess, 1]));
  const failedCommands = usageAnalytics.commandStats?.failedCommands ?? 0;

  return {
    atAGlance: [
      tx(locale, "report.history.atAGlance.sessions", {
        sessions: usageAnalytics.qualifyingSessions ?? sessions.length,
        days: usageAnalytics.activeDays ?? 0
      }),
      tx(locale, "report.history.atAGlance.activity", {
        messages: usageAnalytics.totalMessages ?? 0,
        toolCalls: usageAnalytics.toolCalls ?? 0,
        commands: usageAnalytics.commands ?? 0
      })
    ],
    whatYouWorkOn: [
      topProjects.length
        ? tx(locale, "report.history.work.projects", { projects: joinItems(topProjects) })
        : tx(locale, "report.history.work.noProjects"),
      goals.length
        ? tx(locale, "report.history.work.goals", { goals: joinItems(formatCountPairs(goals, 5)) })
        : tx(locale, "report.history.work.noGoals")
    ],
    howYouUseCodex: [
      topModels.length
        ? tx(locale, "report.history.usage.models", { models: joinItems(topModels) })
        : tx(locale, "report.history.usage.noModels"),
      usageAnalytics.toolCalls
        ? tx(locale, "report.history.usage.toolWork")
        : tx(locale, "report.history.usage.noToolWork")
    ],
    impressiveThings: [
      successes.length
        ? tx(locale, "report.history.strength.success", { patterns: joinItems(formatCountPairs(successes, 4)) })
        : tx(locale, "report.history.strength.noSuccess"),
      (usageAnalytics.filesModified ?? 0) > 0
        ? tx(locale, "report.history.strength.files", { count: usageAnalytics.filesModified ?? 0 })
        : tx(locale, "report.history.strength.noFiles")
    ],
    whereThingsGoWrong: [
      failedCommands > 0
        ? tx(locale, "report.history.problems.failed", { count: failedCommands })
        : tx(locale, "report.history.problems.noFailed"),
      friction.length
        ? tx(locale, "report.history.problems.friction", { items: joinItems(formatCountPairs(friction, 5)) })
        : tx(locale, "report.history.problems.noFriction")
    ],
    featuresToTry: [
      tx(locale, "report.history.features.staticRules"),
      tx(locale, "report.history.features.mcp")
    ],
    suggestedAgentsAdditions: [
      tx(locale, "report.history.agents.staticFirst"),
      tx(locale, "report.history.agents.noZero")
    ],
    newWaysToUseCodex: [
      tx(locale, "report.history.newWays.workspace"),
      tx(locale, "report.history.newWays.retrospective")
    ],
    onTheHorizon: [
      tx(locale, "report.history.horizon.quality"),
      tx(locale, "report.history.horizon.platform")
    ]
  };
}

export function buildAgentRuleSuggestions(input: {
  sessions: ParsedCodexJsonlSession[];
  locale: "en-US" | "zh-CN";
}): AgentRuleSuggestion[] {
  const evidence = commandFailureEvidence(input.sessions);
  const suggestions: AgentRuleSuggestion[] = [];

  suggestions.push({
    id: "static-checks-before-build",
    title: tx(input.locale, "agentsRules.staticFirst.title"),
    ruleText: tx(input.locale, "agentsRules.staticFirst.text"),
    reason: tx(input.locale, "agentsRules.staticFirst.reason"),
    evidence: evidence.slice(0, 5),
    appliesTo: {},
    severity: evidence.length ? "strongly_recommended" : "recommended"
  });

  if (evidence.length > 0) {
    suggestions.push({
      id: "record-command-failures",
      title: tx(input.locale, "agentsRules.commandFailure.title"),
      ruleText: tx(input.locale, "agentsRules.commandFailure.text"),
      reason: tx(input.locale, "agentsRules.commandFailure.reason"),
      evidence: evidence.slice(0, 5),
      appliesTo: {},
      severity: "strongly_recommended"
    });
  }

  return suggestions;
}

function buildToolActionStats(sessions: ParsedCodexJsonlSession[]): UsageAnalytics["toolActionStats"] {
  const stats: NonNullable<UsageAnalytics["toolActionStats"]> = {};
  for (const tool of sessions.flatMap((session) => session.toolCalls)) {
    const entry = stats[tool.name] ?? { total: 0 };
    entry.total += 1;
    if (tool.accepted === true) entry.accepted = (entry.accepted ?? 0) + 1;
    if (tool.rejected === true) entry.rejected = (entry.rejected ?? 0) + 1;
    if (/error|failed|exception/i.test(tool.outputSnippet ?? "")) {
      entry.errorCount = (entry.errorCount ?? 0) + 1;
    }
    if (entry.accepted !== undefined || entry.rejected !== undefined) {
      const decided = (entry.accepted ?? 0) + (entry.rejected ?? 0);
      if (decided > 0) entry.acceptanceRate = (entry.accepted ?? 0) / decided;
    }
    stats[tool.name] = entry;
  }
  return stats;
}

function buildCommandStats(sessions: ParsedCodexJsonlSession[]): NonNullable<UsageAnalytics["commandStats"]> {
  const commands = sessions.flatMap((session) => session.commands);
  const failureCategories: Record<string, number> = {};
  let failedCommands = 0;
  for (const command of commands) {
    if ((command.exitCode ?? 0) !== 0 || /error|failed|exception/i.test(command.outputSnippet ?? "")) {
      failedCommands += 1;
      const category = categorizeCommandFailure(command.command, command.outputSnippet);
      failureCategories[category] = (failureCategories[category] ?? 0) + 1;
    }
  }
  return {
    totalCommands: commands.length,
    failedCommands,
    failureCategories
  };
}

function buildModelBreakdown(sessions: ParsedCodexJsonlSession[]): NonNullable<UsageAnalytics["modelBreakdown"]> {
  const byModel = new Map<string, NonNullable<UsageAnalytics["modelBreakdown"]>[number]>();
  for (const session of sessions) {
    const model = session.model ?? "unknown";
    const entry = byModel.get(model) ?? { model };
    entry.inputTokens = sumOptional(entry.inputTokens, session.inputTokens);
    entry.outputTokens = sumOptional(entry.outputTokens, session.outputTokens);
    entry.cacheReadTokens = sumOptional(entry.cacheReadTokens, session.cacheReadTokens);
    entry.cacheCreationTokens = sumOptional(entry.cacheCreationTokens, session.cacheCreationTokens);
    byModel.set(model, entry);
  }
  return [...byModel.values()].sort((left, right) => (right.inputTokens ?? 0) - (left.inputTokens ?? 0));
}

function buildProjectBreakdown(sessions: ParsedCodexJsonlSession[]): NonNullable<UsageAnalytics["projectBreakdown"]> {
  const byProject = new Map<string, NonNullable<UsageAnalytics["projectBreakdown"]>[number]>();
  for (const session of sessions) {
    const projectName = session.projectName || "unknown";
    const entry = byProject.get(projectName) ?? {
      projectName,
      sessions: 0,
      messages: 0,
      toolCalls: 0
    };
    entry.sessions += 1;
    entry.messages += session.userPrompts.length + session.assistantMessages.length;
    entry.toolCalls += session.toolCalls.length;
    entry.linesAdded = sumOptional(entry.linesAdded, session.linesAdded);
    entry.linesRemoved = sumOptional(entry.linesRemoved, session.linesRemoved);
    entry.filesModified = sumOptional(entry.filesModified, session.fileEdits.length || undefined);
    entry.commitsCreated = sumOptional(entry.commitsCreated, session.commitsCreated);
    entry.toolErrors = sumOptional(entry.toolErrors, session.toolCalls.filter((tool) => /error|failed/i.test(tool.outputSnippet ?? "")).length || undefined);
    byProject.set(projectName, entry);
  }
  return [...byProject.values()].sort((left, right) => right.sessions - left.sessions);
}

function buildDailyTrend(sessions: ParsedCodexJsonlSession[]): NonNullable<UsageAnalytics["dailyTrend"]> {
  const byDate = new Map<string, NonNullable<UsageAnalytics["dailyTrend"]>[number]>();
  for (const session of sessions) {
    const date = datePart(session.startedAt);
    if (!date) continue;
    const entry = byDate.get(date) ?? {
      date,
      sessions: 0,
      messages: 0,
      toolCalls: 0
    };
    entry.sessions += 1;
    entry.messages += session.userPrompts.length + session.assistantMessages.length;
    entry.toolCalls += session.toolCalls.length;
    entry.linesAdded = sumOptional(entry.linesAdded, session.linesAdded);
    entry.linesRemoved = sumOptional(entry.linesRemoved, session.linesRemoved);
    byDate.set(date, entry);
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

function commandFailureEvidence(sessions: ParsedCodexJsonlSession[]): Evidence[] {
  return sessions.flatMap((session) =>
    session.commands
      .filter((command) => (command.exitCode ?? 0) !== 0 || /error|failed|exception/i.test(command.outputSnippet ?? ""))
      .map((command) => ({
        projectName: session.projectName ?? "unknown",
        filePath: session.filePath,
        signal: "command-failure",
        snippet: `${command.command}: ${command.outputSnippet ?? "failed"}`.slice(0, 500),
        confidence: "high" as const,
        source: "codex-history",
        command: command.command,
        path: session.filePath
      }))
  );
}

function categorizeCommandFailure(command: string, output?: string): string {
  const joined = `${command}\n${output ?? ""}`.toLowerCase();
  if (/type|tsc|typescript/.test(joined)) return "typecheck";
  if (/lint|eslint/.test(joined)) return "lint";
  if (/test|vitest|jest|pytest|go test/.test(joined)) return "test";
  if (/build|compile/.test(joined)) return "build";
  if (/permission|eacces/.test(joined)) return "permission";
  if (/not found|enoent/.test(joined)) return "missing-command";
  return "other";
}

function aggregateFacetCounts(entries: Array<[string, number]>): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const [name, count] of entries) {
    if (!name || count <= 0 || name === "none") continue;
    counts.set(name, (counts.get(name) ?? 0) + count);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function addUnknownIfAllMissing(
  dataQuality: DataQuality[],
  field: string,
  values: Array<number | undefined>
): void {
  if (values.length > 0 && values.every((value) => value === undefined)) {
    dataQuality.push(
      createDataQualityRecord({
        source: `usageAnalytics.${field}`,
        status: "unavailable",
        reason: `${field} is unavailable in parsed Codex session history.`,
        attemptedSources: ["Codex rollout JSONL", "tool outputs"]
      })
    );
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function sumKnown(values: Array<number | undefined>): number | undefined {
  const known = values.filter((value): value is number => typeof value === "number");
  return known.length ? sum(known) : undefined;
}

function joinItems(items: string[]): string {
  return items.filter(Boolean).join(", ");
}

function formatCountPairs(items: Array<[string, number]>, limit: number): string[] {
  return items.slice(0, limit).map(([name, count]) => `${name}(${count})`);
}

function displayProjectName(projectName: string, locale: "en-US" | "zh-CN"): string {
  return projectName === "unknown"
    ? tx(locale, "report.render.notRecognizedProject")
    : projectName;
}

function sumOptional(left: number | undefined, right: number | undefined): number | undefined {
  if (right === undefined) return left;
  return (left ?? 0) + right;
}

function countDistinct(values: string[]): number | undefined {
  return values.length ? new Set(values).size : undefined;
}

function datePart(value?: string): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}
