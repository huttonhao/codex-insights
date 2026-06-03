import type { AgentRuleSuggestion } from "../model/agentRuleSuggestion.js";
import type { DataQuality } from "../model/dataQuality.js";
import { createDataQualityRecord } from "../model/dataQuality.js";
import type { Evidence } from "../model/evidence.js";
import type { SessionFacet } from "../model/sessionFacet.js";
import type { UsageAnalytics } from "../model/usageAnalytics.js";
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
  const topProjects = usageAnalytics.projectBreakdown?.slice(0, 3).map((project) => project.projectName) ?? [];
  const topModels = usageAnalytics.modelBreakdown?.slice(0, 3).map((model) => model.model) ?? [];
  const friction = aggregateFacetCounts(facets.flatMap((facet) => Object.entries(facet.frictionCounts)));
  const goals = aggregateFacetCounts(facets.flatMap((facet) => Object.entries(facet.goalCategories)));
  const successes = aggregateFacetCounts(facets.map((facet) => [facet.primarySuccess, 1]));
  const failedCommands = usageAnalytics.commandStats?.failedCommands ?? 0;

  if (locale === "zh-CN") {
    return {
      atAGlance: [
        `共解析 ${usageAnalytics.qualifyingSessions ?? sessions.length} 个有效 Codex session，覆盖 ${usageAnalytics.activeDays ?? 0} 个活跃日期。`,
        `记录到 ${usageAnalytics.totalMessages ?? 0} 条消息、${usageAnalytics.toolCalls ?? 0} 次工具调用和 ${usageAnalytics.commands ?? 0} 条命令证据。`
      ],
      whatYouWorkOn: [
        topProjects.length
          ? `投入最多的项目是：${topProjects.join("、")}。`
          : "没有足够的项目路径证据来判断投入分布。",
        goals.length ? `常见目标包括：${goals.slice(0, 5).map(([name, count]) => `${name}(${count})`).join("、")}。` : "没有运行 LLM facets 时，只能基于结构化 session 元数据判断工作内容。"
      ],
      howYouUseCodex: [
        topModels.length ? `主要使用模型：${topModels.join("、")}。` : "session 中没有稳定的模型字段。",
        usageAnalytics.toolCalls ? "你明显不是只问答，而是在让 Codex 执行搜索、命令和代码编辑等工程动作。" : "没有找到工具调用证据。"
      ],
      impressiveThings: [
        successes.length ? `较强的成功模式：${successes.slice(0, 4).map(([name, count]) => `${name}(${count})`).join("、")}。` : "结构化数据中尚未看到可归纳的成功模式。",
        (usageAnalytics.filesModified ?? 0) > 0 ? `session 涉及 ${usageAnalytics.filesModified} 个文件改动证据。` : "没有足够证据判断文件改动规模。"
      ],
      whereThingsGoWrong: [
        failedCommands > 0 ? `发现 ${failedCommands} 条失败命令，需要优先沉淀静态检查和测试规则。` : "没有发现失败命令证据。",
        friction.length ? `主要摩擦包括：${friction.slice(0, 5).map(([name, count]) => `${name}(${count})`).join("、")}。` : "没有 LLM facets 或显式用户反馈时，摩擦只能从失败命令和工具错误推断。"
      ],
      featuresToTry: [
        "把重复的静态检查命令写入 AGENTS.md，并让 Codex 在改代码前后主动执行。",
        "为高频项目配置 MCP tools、skills 或子代理，用于固定的质量门禁和专题分析。"
      ],
      suggestedAgentsAdditions: [
        "在验收代码改动时，优先运行静态检查命令，例如 find、grep、git diff、git show，再运行对应语言的 test/build。",
        "当数据源缺失时，必须在报告或回复里标记 unknown，不允许把未知写成 0。"
      ],
      newWaysToUseCodex: [
        "让 Codex 定期扫描 workspace，输出跨项目技术雷达和重复建设风险。",
        "把 Codex session history 作为个人工程复盘输入，识别高摩擦 prompt 和可沉淀规则。"
      ],
      onTheHorizon: [
        "优先补齐 session history、workspace quality matrix 和 deep topic 的趋势对比。",
        "对高频 topic 建立 reference implementation 和平台化迁移路线。"
      ]
    };
  }

  return {
    atAGlance: [
      `Parsed ${usageAnalytics.qualifyingSessions ?? sessions.length} qualifying Codex sessions across ${usageAnalytics.activeDays ?? 0} active days.`,
      `Recorded ${usageAnalytics.totalMessages ?? 0} messages, ${usageAnalytics.toolCalls ?? 0} tool calls, and ${usageAnalytics.commands ?? 0} command evidence entries.`
    ],
    whatYouWorkOn: [
      topProjects.length ? `Most active projects: ${topProjects.join(", ")}.` : "Project-path evidence is unavailable.",
      goals.length ? `Common goals: ${goals.slice(0, 5).map(([name, count]) => `${name}(${count})`).join(", ")}.` : "Without LLM facets, work categories come from structured metadata only."
    ],
    howYouUseCodex: [
      topModels.length ? `Models used most often: ${topModels.join(", ")}.` : "Model evidence is unavailable.",
      usageAnalytics.toolCalls ? "Usage includes engineering actions such as search, commands, and edits." : "No tool-call evidence was found."
    ],
    impressiveThings: [
      successes.length ? `Strong success patterns: ${successes.slice(0, 4).map(([name, count]) => `${name}(${count})`).join(", ")}.` : "No success pattern is inferable yet.",
      (usageAnalytics.filesModified ?? 0) > 0 ? `${usageAnalytics.filesModified} file-modification evidence entries were found.` : "File-modification scope is unavailable."
    ],
    whereThingsGoWrong: [
      failedCommands > 0 ? `${failedCommands} failed commands were found.` : "No failed command evidence was found.",
      friction.length ? `Main friction areas: ${friction.slice(0, 5).map(([name, count]) => `${name}(${count})`).join(", ")}.` : "Friction is inferred only from command and tool evidence when facets are unavailable."
    ],
    featuresToTry: [
      "Move repeated static checks into AGENTS.md and ask Codex to run them before and after edits.",
      "Use MCP tools, skills, or subagents for repeated project quality gates and topic analysis."
    ],
    suggestedAgentsAdditions: [
      "When validating code changes, run static inspection commands first, such as find, grep, git diff, and git show, then run language-specific test/build commands.",
      "When evidence is missing, mark it as unknown and do not convert it to zero."
    ],
    newWaysToUseCodex: [
      "Run recurring workspace scans to produce a cross-project technology radar.",
      "Use Codex session history for personal engineering retrospectives."
    ],
    onTheHorizon: [
      "Prioritize session history, workspace quality matrix, and deep-topic trend comparison.",
      "Create reference implementations and platform migration paths for high-frequency topics."
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
    title: input.locale === "zh-CN" ? "先做静态检查，再运行测试和构建" : "Run static checks before test and build",
    ruleText:
      input.locale === "zh-CN"
        ? "验收代码改动时，先运行静态检查命令：find、grep、git diff、git show。静态检查通过后，再运行项目对应的 test/build 命令。"
        : "When validating code changes, run static inspection first: find, grep, git diff, and git show. After static checks pass, run the relevant project test/build commands.",
      reason:
        input.locale === "zh-CN"
          ? "这种顺序更容易先发现误改、缺文件、残留占位和不符合规则的文本，再进入成本更高的测试构建。"
          : "This catches wrong files, incomplete stubs, and policy mismatches before more expensive test/build runs.",
    evidence: evidence.slice(0, 5),
    appliesTo: {},
    severity: evidence.length ? "strongly_recommended" : "recommended"
  });

  if (evidence.length > 0) {
    suggestions.push({
      id: "record-command-failures",
      title: input.locale === "zh-CN" ? "失败命令必须记录修复动作" : "Record remediation for failed commands",
      ruleText:
        input.locale === "zh-CN"
          ? "如果命令失败，必须记录失败命令、错误分类、修复动作和复跑结果；不能只说已修复。"
          : "When a command fails, record the command, error category, remediation, and rerun result; do not only say it was fixed.",
      reason:
        input.locale === "zh-CN"
          ? "session history 已出现失败命令证据，规则化记录能减少重复排查。"
          : "Session history contains failed-command evidence, so structured remediation reduces repeated investigation.",
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
