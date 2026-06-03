import type { InsightReport } from "../insights/reportModel.js";
import type { DeepTopicReport } from "../model/topic.js";
import type { SupportedLocale } from "./localeResolver.js";
import { getMessageCatalog } from "./messageCatalog.js";
import { createI18n } from "./locale.js";
import { formatBoolean, formatMaturity, formatPriority } from "./format.js";
import { t, type MessageKey } from "./t.js";

export function renderInsightsReport(
  report: InsightReport,
  locale: SupportedLocale = report.locale
): string {
  return renderInsightsHtml(report, locale);
}

export function renderInsightsHtml(
  report: InsightReport,
  locale: SupportedLocale = report.locale
): string {
  if (report.fullNarrative) {
    return renderFullInsightsHtml(report, locale);
  }
  const catalog = getMessageCatalog(locale);
  const ctx = createI18n(locale);
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(catalog.title)} - ${escapeHtml(report.repository.name)}</title>
    <style>
      :root { color-scheme: light; --bg:#f7f8fa; --card:#fff; --text:#111827; --muted:#5b6472; --line:#d9dee8; --accent:#0f766e; --warn:#b45309; --ok:#047857; }
      * { box-sizing: border-box; }
      body { margin:0; background:var(--bg); color:var(--text); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height:1.55; }
      main { width:min(1180px, calc(100vw - 32px)); margin:0 auto; padding:32px 0 56px; }
      header, section { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:22px; margin-bottom:18px; box-shadow:0 1px 2px rgba(15, 23, 42, .04); }
      h1 { margin:0; font-size:32px; letter-spacing:0; }
      h2 { margin:0 0 12px; font-size:20px; letter-spacing:0; }
      h3 { margin:18px 0 8px; font-size:16px; letter-spacing:0; }
      p { margin:8px 0; color:var(--muted); }
      .meta, .grid { display:grid; gap:12px; }
      .meta { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top:18px; }
      .grid { grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); }
      .metric { border:1px solid var(--line); border-radius:8px; padding:14px; background:#fbfcfe; }
      .metric strong { display:block; font-size:26px; color:var(--accent); }
      ul { margin:8px 0 0; padding-left:20px; }
      li { margin:5px 0; }
      table { width:100%; border-collapse:collapse; font-size:14px; }
      th, td { border-top:1px solid var(--line); padding:8px; text-align:left; vertical-align:top; }
      th { color:#374151; background:#f9fafb; }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      pre { white-space:pre-wrap; border:1px solid var(--line); border-radius:8px; padding:12px; background:#f9fafb; }
      .pill { display:inline-block; border:1px solid var(--line); border-radius:999px; padding:2px 8px; color:var(--muted); margin:2px 4px 2px 0; }
      .warn { color:var(--warn); }
      .ok { color:var(--ok); }
      .copy { border:1px dashed var(--line); border-radius:8px; padding:12px; margin:10px 0; background:#fcfcfd; }
      @media (max-width: 640px) { main { width:min(100vw - 20px, 1180px); padding-top:16px; } h1 { font-size:26px; } table { font-size:13px; } }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p>${escapeHtml(report.repository.name)} · ${escapeHtml(report.generatedAt)}</p>
        <h1>${escapeHtml(catalog.title)}</h1>
        <p>${escapeHtml(report.summary.narrative)}</p>
        <div class="meta">
          ${metric(t(ctx, "report.schema"), report.schemaVersion)}
          ${metric(t(ctx, "report.mode"), report.scanSummary.mode)}
          ${metric(t(ctx, "report.projectsScanned"), String(report.scanSummary.projectsScanned))}
          ${metric(t(ctx, "report.testsRun"), report.metrics.testsRunKnown ? String(report.metrics.testsRunCount ?? 0) : t(ctx, "report.render.insufficientTestEvidence"))}
        </div>
      </header>
      ${renderSection(t(ctx, "report.section.executiveSummary"), report.productInsights?.atAGlance, ctx)}
      ${renderUsageMetrics(report, locale)}
      ${renderSection(t(ctx, "report.section.recentWork"), report.productInsights?.whatYouWorkOn, ctx)}
      ${renderSection(t(ctx, "report.section.codexUsage"), report.productInsights?.howYouUseCodex, ctx)}
      ${renderProjectBreakdown(report, locale)}
      ${renderToolUsage(report, locale)}
      ${renderCommandAnalysis(report, locale)}
      ${renderWorkspaceQualityMatrix(report, locale)}
      ${renderDeepTopics(report, locale)}
      ${rag ? renderRagDeepDive(rag, locale) : ""}
      ${renderSection(t(ctx, "report.section.problemPatterns"), report.productInsights?.whereThingsGoWrong, ctx)}
      ${renderSection(t(ctx, "report.section.strengths"), report.productInsights?.impressiveThings, ctx)}
      ${renderAgentRules(report, locale)}
      ${renderSection(t(ctx, "report.section.nextCodexPrompts"), report.productInsights?.featuresToTry, ctx)}
      ${renderSection(t(ctx, "report.section.nextCodexPrompts"), report.productInsights?.newWaysToUseCodex, ctx)}
      ${renderSection(t(ctx, "report.section.trend"), report.productInsights?.onTheHorizon, ctx)}
      ${renderDataQuality(report, locale)}
      ${renderTrend(report, locale)}
    </main>
  </body>
</html>`;
}

export function renderInsightsMarkdown(
  report: InsightReport,
  locale: SupportedLocale = report.locale
): string {
  if (report.fullNarrative) {
    return renderFullInsightsMarkdown(report, locale);
  }
  const ctx = createI18n(locale);
  const lines: string[] = [
    `# ${t(ctx, "report.title")}`,
    "",
    `- Schema: ${report.schemaVersion}`,
    `- Mode: ${report.scanSummary.mode}`,
    `- Generated: ${report.generatedAt}`,
    `- Projects scanned: ${report.scanSummary.projectsScanned}`,
    `- Files scanned: ${report.scanSummary.filesScanned}`,
    `- Tests run: ${report.metrics.testsRunKnown ? report.metrics.testsRunCount ?? 0 : t(ctx, "report.render.insufficientTestEvidence")}`,
    "",
    ...markdownSection(t(ctx, "report.section.executiveSummary"), report.productInsights?.atAGlance, ctx),
    ...markdownUsageMetrics(report, locale),
    ...markdownSection(t(ctx, "report.section.recentWork"), report.productInsights?.whatYouWorkOn, ctx),
    ...markdownSection(t(ctx, "report.section.codexUsage"), report.productInsights?.howYouUseCodex, ctx),
    ...markdownProjectBreakdown(report, locale),
    ...markdownToolUsage(report, locale),
    ...markdownCommandAnalysis(report, locale),
    ...markdownWorkspaceQuality(report, locale),
    ...markdownDeepTopics(report, locale),
    ...markdownRag(report, locale),
    ...markdownSection(t(ctx, "report.section.problemPatterns"), report.productInsights?.whereThingsGoWrong, ctx),
    ...markdownSection(t(ctx, "report.section.strengths"), report.productInsights?.impressiveThings, ctx),
    ...markdownAgentRules(report, locale),
    ...markdownSection(t(ctx, "report.section.nextCodexPrompts"), report.productInsights?.featuresToTry, ctx),
    ...markdownSection(t(ctx, "report.section.nextCodexPrompts"), report.productInsights?.newWaysToUseCodex, ctx),
    ...markdownSection(t(ctx, "report.section.trend"), report.productInsights?.onTheHorizon, ctx),
    ...markdownDataQuality(report, locale),
    ...markdownTrend(report, locale)
  ];
  return `${lines.join("\n")}\n`;
}

function renderFullInsightsMarkdown(
  report: InsightReport,
  locale: SupportedLocale
): string {
  const ctx = createI18n(locale);
  const narrative = report.fullNarrative;
  if (!narrative) {
    return "";
  }
  const lines: string[] = [
    `# ${t(ctx, "report.title.full")}`,
    "",
    `- ${t(ctx, "report.schema")}: ${report.schemaVersion}`,
    `- ${t(ctx, "report.mode")}: ${report.scanSummary.mode}`,
    `- ${t(ctx, "report.generated", { time: report.generatedAt })}`,
    "",
    `## ${t(ctx, "report.section.executiveSummary")}`,
    "",
    ...markdownInsightTable(narrative.executiveSummary, ctx),
    "",
    `## ${t(ctx, "report.section.coverage")}`,
    "",
    `- ${narrative.coverage.sessionCount}`,
    `- ${narrative.coverage.projectCount}`,
    `- ${narrative.coverage.fileCount}`,
    `- ${narrative.coverage.topicCount}`,
    `- ${t(ctx, "report.coverage.confidence", { confidence: narrative.coverage.confidence })}`,
    `- ${narrative.coverage.confidenceReason}`,
    "",
    ...markdownListBlock(narrative.coverage.dataGaps, t(ctx, "report.render.dataGaps"), ctx),
    "",
    `## ${t(ctx, "report.section.highRisks")}`,
    "",
    ...markdownInsightTable(
      narrative.executiveSummary
        .filter((item) => item.priority === "P0" || item.priority === "P1")
        .concat(narrative.anomalies.map((item) => ({
          conclusion: item.title,
          evidence: [`${item.metric}=${item.value}`],
          explanation: item.explanation,
          risk: item.impact,
          nextAction: item.nextAction,
          priority: item.severity === "critical" ? "P0" as const : "P1" as const,
          projects: [],
          dataQualityNote: item.metric
        }))),
      ctx
    ),
    "",
    `## ${t(ctx, "report.section.recentWork")}`,
    "",
    ...markdownInsightTable(narrative.recentWork, ctx),
    "",
    `## ${t(ctx, "report.section.codexUsage")}`,
    "",
    ...markdownInsightTable(narrative.codexUsage, ctx),
    "",
    `## ${t(ctx, "report.section.projectRadar")}`,
    "",
    ...markdownProjectRadar(narrative.projectRadar),
    "",
    `## ${t(ctx, "report.section.workspaceQuality")}`,
    "",
    ...markdownInsightTable(narrative.workspaceQuality.findings, ctx),
    "",
    ...markdownListBlock(narrative.workspaceQuality.priorityOrder, t(ctx, "report.render.priorityOrder"), ctx),
    "",
    ...markdownListBlock(narrative.workspaceQuality.commandSuggestions, t(ctx, "report.render.suggestedCommands"), ctx),
    "",
    ...markdownWorkspaceQuality(report, locale),
    "",
    `## ${t(ctx, "report.section.topicOverview")}`,
    "",
    ...markdownTopicOverview(narrative.topicOverview, ctx),
    "",
    `## ${t(ctx, "report.section.ragDeepDive")}`,
    "",
    ...markdownRagFull(narrative.rag, ctx),
    "",
    `## ${t(ctx, "report.section.agentDeepDive")}`,
    "",
    ...markdownTopicDimensionTable(narrative.agentLlmGateway.agent),
    "",
    `## ${t(ctx, "report.section.llmGatewayDeepDive")}`,
    "",
    ...markdownTopicDimensionTable(narrative.agentLlmGateway.llmGateway),
    "",
    `## ${t(ctx, "report.section.qualityEngineering")}`,
    "",
    ...markdownTopicFocused(report, ["quality", "testing"], ctx),
    "",
    `## ${t(ctx, "report.section.observability")}`,
    "",
    ...markdownTopicFocused(report, ["observability"], ctx),
    "",
    `## ${t(ctx, "report.section.security")}`,
    "",
    ...markdownTopicFocused(report, ["security"], ctx),
    "",
    `## ${t(ctx, "report.section.problemPatterns")}`,
    "",
    ...markdownProblemTable(narrative.problems, ctx),
    "",
    `## ${t(ctx, "report.section.strengths")}`,
    "",
    ...markdownInsightTable(narrative.strengths, ctx),
    "",
    `## ${t(ctx, "report.section.agentRules")}`,
    "",
    ...markdownAgentRulesFull(narrative.agentRules, ctx),
    "",
    `## ${t(ctx, "report.section.nextCodexPrompts")}`,
    "",
    ...markdownNextPrompts(narrative.nextPrompts, ctx),
    "",
    `## ${t(ctx, "report.section.dataQuality")}`,
    "",
    `- ${t(ctx, "report.coverage.confidence", { confidence: narrative.dataQuality.confidence })}`,
    ...markdownListBlock(narrative.dataQuality.sources, t(ctx, "report.render.sources"), ctx),
    ...markdownListBlock(narrative.dataQuality.unknowns, t(ctx, "report.render.unknowns"), ctx),
    ...markdownListBlock(
      narrative.dataQuality.suspiciousMetrics.length
        ? narrative.dataQuality.suspiciousMetrics
        : [t(ctx, "dataQuality.caveat.noAnomaly")],
      t(ctx, "report.render.suspiciousMetrics"),
      ctx
    ),
    ...markdownListBlock(narrative.dataQuality.caveats, t(ctx, "report.render.caveats"), ctx),
    "",
    `## ${t(ctx, "report.section.trend")}`,
    "",
    ...markdownList(narrative.trend, t(ctx, "report.trend.baseline")),
    "",
    `## ${t(ctx, "report.section.evidenceIndex")}`,
    "",
    ...markdownEvidenceIndex(narrative.evidenceIndex)
  ];
  return `${lines.join("\n")}\n`;
}

function renderFullInsightsHtml(report: InsightReport, locale: SupportedLocale): string {
  const markdown = renderFullInsightsMarkdown(report, locale);
  const body = markdownToHtml(markdown);
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(report.fullNarrative?.title ?? report.summary.title)}</title>
    <style>
      :root { color-scheme: light; --bg:#f6f7f9; --panel:#fff; --text:#172033; --muted:#5f6b7a; --line:#d8dde7; --accent:#0f766e; --risk:#b42318; --code:#f8fafc; }
      * { box-sizing:border-box; }
      body { margin:0; background:var(--bg); color:var(--text); font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height:1.55; }
      main { width:min(1280px, calc(100vw - 32px)); margin:0 auto; padding:28px 0 56px; }
      h1 { margin:0 0 16px; font-size:30px; letter-spacing:0; }
      h2 { margin:24px 0 10px; border-top:1px solid var(--line); padding-top:20px; font-size:21px; letter-spacing:0; }
      h3 { margin:18px 0 8px; font-size:16px; letter-spacing:0; }
      p, li { color:var(--muted); }
      table { width:100%; border-collapse:collapse; margin:10px 0 16px; background:var(--panel); border:1px solid var(--line); }
      th, td { border-top:1px solid var(--line); padding:8px 10px; text-align:left; vertical-align:top; font-size:13px; }
      th { background:#eef2f7; color:#344054; font-weight:650; }
      code { background:var(--code); border:1px solid var(--line); border-radius:4px; padding:1px 4px; }
      pre { white-space:pre-wrap; background:var(--code); border:1px solid var(--line); border-radius:6px; padding:12px; overflow:auto; }
      section { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:18px; margin:14px 0; }
      .report { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:22px; }
      @media (max-width: 720px) { main { width:min(100vw - 20px, 1280px); } table { display:block; overflow-x:auto; } h1 { font-size:25px; } }
    </style>
  </head>
  <body><main><article class="report">${body}</article></main></body>
</html>`;
}

function markdownInsightTable(
  insights: Array<{
    conclusion: string;
    evidence: string[];
    explanation: string;
    risk: string;
    nextAction: string;
    priority: "P0" | "P1" | "P2" | "P3";
    projects: string[];
    dataQualityNote: string;
  }>,
  ctx: ReturnType<typeof createI18n>
): string[] {
  if (!insights.length) return [`- ${t(ctx, "report.render.emptySection")}`];
  return [
    "| Priority | Conclusion | Evidence | Explanation | Risk | Next action | Projects | Data quality |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...insights.map((item) =>
      `| ${escapeMd(formatPriority(ctx, item.priority))} | ${escapeMd(item.conclusion)} | ${escapeMd(compactList(item.evidence))} | ${escapeMd(item.explanation)} | ${escapeMd(item.risk)} | ${escapeMd(item.nextAction)} | ${escapeMd(compactList(item.projects))} | ${escapeMd(item.dataQualityNote)} |`
    )
  ];
}

function markdownProjectRadar(items: Array<{
  project: string;
  role: string;
  topics: string[];
  judgment: string;
  evidence: string[];
  risk: string;
  nextAction: string;
  priority: string;
}>): string[] {
  if (!items.length) return ["- No project radar evidence."];
  return [
    "| Project | Role | Topics | Judgment | Evidence | Risk | Next action | Priority |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...items.map((item) =>
      `| ${escapeMd(item.project)} | ${escapeMd(item.role)} | ${escapeMd(compactList(item.topics))} | ${escapeMd(item.judgment)} | ${escapeMd(compactList(item.evidence))} | ${escapeMd(item.risk)} | ${escapeMd(item.nextAction)} | ${escapeMd(item.priority)} |`
    )
  ];
}

function markdownTopicOverview(items: Array<{
  topic: string;
  involvedProjects: string[];
  maturitySummary: string;
  strongestProject: string;
  biggestGap: string;
  platformization: string;
  nextAction: string;
  priority: "P0" | "P1" | "P2" | "P3";
  evidence: string[];
}>, ctx: ReturnType<typeof createI18n>): string[] {
  if (!items.length) return [`- ${t(ctx, "report.render.emptySection")}`];
  return [
    "| Topic | Projects | Maturity | Strongest project | Biggest gap | Platformization | Next action | Priority | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...items.map((item) =>
      `| ${escapeMd(item.topic)} | ${escapeMd(compactList(item.involvedProjects))} | ${escapeMd(item.maturitySummary)} | ${escapeMd(item.strongestProject)} | ${escapeMd(item.biggestGap)} | ${escapeMd(item.platformization)} | ${escapeMd(item.nextAction)} | ${escapeMd(formatPriority(ctx, item.priority))} | ${escapeMd(compactList(item.evidence))} |`
    )
  ];
}

function markdownRagFull(
  rag: NonNullable<InsightReport["fullNarrative"]>["rag"],
  ctx: ReturnType<typeof createI18n>
): string[] {
  return [
    `### ${t(ctx, "report.section.ragProjectMaturity")}`,
    "",
    "| Project | Maturity | Evidence files | Implemented dimensions | Missing critical dimensions | Risk | Next action |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rag.projects.map((item) =>
      `| ${escapeMd(item.project)} | ${escapeMd(String(item.maturity))} | ${escapeMd(compactList(item.evidenceFiles))} | ${escapeMd(compactList(item.implementedDimensions))} | ${escapeMd(compactList(item.missingCriticalDimensions))} | ${escapeMd(item.risk)} | ${escapeMd(item.nextAction)} |`
    ),
    "",
    `### ${t(ctx, "report.section.ragArchitectureGaps")}`,
    "",
    "| Dimension | Projects with evidence | Missing projects | Evidence | Platformize | Interpretation |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rag.dimensions.map((item) =>
      `| ${escapeMd(item.dimension)} | ${escapeMd(compactList(item.projectsWithEvidence, ctx))} | ${escapeMd(compactList(item.projectsMissing, ctx))} | ${escapeMd(compactList(item.evidence, ctx))} | ${item.platformize ? t(ctx, "report.render.yes") : t(ctx, "report.render.no")} | ${escapeMd(item.interpretation)} |`
    ),
    "",
    `### ${t(ctx, "report.section.ragRoadmap")}`,
    "",
    `- ${t(ctx, "report.render.referenceProject", { project: rag.roadmap.referenceProject })}`,
    `- ${t(ctx, "report.render.rejectedReferences", { items: compactList(rag.roadmap.rejectedReferences, ctx) })}`,
    `- ${t(ctx, "report.render.sharedModules", { items: compactList(rag.roadmap.sharedModules, ctx) })}`,
    `- ${t(ctx, "report.render.businessBoundaries", { items: compactList(rag.roadmap.businessBoundaries, ctx) })}`,
    "",
    ...markdownListBlock(rag.roadmap.phaseOne, t(ctx, "report.render.phaseOne"), ctx),
    ...markdownListBlock(rag.roadmap.phaseTwo, t(ctx, "report.render.phaseTwo"), ctx),
    ...markdownListBlock(rag.roadmap.phaseThree, t(ctx, "report.render.phaseThree"), ctx),
    ...markdownListBlock(rag.roadmap.defer, t(ctx, "report.render.doNotDoYet"), ctx)
  ];
}

function markdownTopicDimensionTable(items: Array<{
  dimension: string;
  currentState: string;
  evidence: string[];
  risk: string;
  nextAction: string;
}>): string[] {
  if (!items.length) return ["- No dimension evidence."];
  return [
    "| Dimension | Current state | Evidence | Risk | Next action |",
    "| --- | --- | --- | --- | --- |",
    ...items.map((item) =>
      `| ${escapeMd(item.dimension)} | ${escapeMd(item.currentState)} | ${escapeMd(compactList(item.evidence))} | ${escapeMd(item.risk)} | ${escapeMd(item.nextAction)} |`
    )
  ];
}

function markdownTopicFocused(
  report: InsightReport,
  topicNames: string[],
  ctx: ReturnType<typeof createI18n>
): string[] {
  const topics = report.deepTopics.filter((topic) => topicNames.includes(topic.topic));
  if (!topics.length) return [`- ${t(ctx, "report.render.emptySection")}`];
  return topics.flatMap((topic) => [
    `### ${topic.topic}`,
    "",
    ...markdownList(topic.crossProjectFindings, t(ctx, "report.render.emptySection")),
    "",
    "| Project | Maturity | Implemented dimensions | Missing dimensions | Risks | Next action | Evidence |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...topic.projectMaturity.map((item) =>
      `| ${escapeMd(item.projectName)} | ${escapeMd(formatMaturity(ctx, item.maturity))} | ${escapeMd(compactList(item.implementedDimensions, ctx))} | ${escapeMd(compactList(item.missingDimensions, ctx))} | ${escapeMd(compactList(item.risks, ctx))} | ${escapeMd(compactList(item.recommendedNextActions, ctx))} | ${escapeMd(compactList(item.evidence.map((evidence) => evidence.snippet).slice(0, 3), ctx))} |`
    ),
    ""
  ]);
}

function markdownProblemTable(items: Array<{
  category: string;
  count: number;
  projects: string[];
  snippet: string;
  rootCause: string;
  fixStrategy: string;
  needsAgentRule: boolean;
}>, ctx: ReturnType<typeof createI18n>): string[] {
  return [
    "| Category | Count | Projects | Snippet | Root cause | Fix strategy | AGENTS.md rule needed |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...items.map((item) =>
      `| ${escapeMd(item.category)} | ${item.count} | ${escapeMd(compactList(item.projects, ctx))} | ${escapeMd(item.snippet)} | ${escapeMd(item.rootCause)} | ${escapeMd(item.fixStrategy)} | ${item.needsAgentRule ? t(ctx, "report.render.yes") : t(ctx, "report.render.no")} |`
    )
  ];
}

function markdownAgentRulesFull(items: Array<{
  title: string;
  ruleText: string;
  reason: string;
  evidence: string[];
  appliesTo: string;
  severity: string;
  target: string;
}>, ctx?: ReturnType<typeof createI18n>): string[] {
  if (!items.length) return [`- ${ctx ? t(ctx, "report.render.noAgentRules") : "No AGENTS.md suggestions."}`];
  return items.flatMap((item, index) => [
    `### ${index + 1}. ${item.title}`,
    "",
    `- ${ctx ? t(ctx, "report.render.target", { target: item.target }) : `Target: ${item.target}`}`,
    `- ${ctx ? t(ctx, "report.render.severity", { severity: item.severity }) : `Severity: ${item.severity}`}`,
    `- ${ctx ? t(ctx, "report.render.appliesTo", { scope: item.appliesTo }) : `Applies to: ${item.appliesTo}`}`,
    `- ${ctx ? t(ctx, "report.render.reason", { reason: item.reason }) : `Reason: ${item.reason}`}`,
    "",
    "```text",
    item.ruleText,
    "```",
    "",
    ...markdownListBlock(item.evidence, ctx ? t(ctx, "report.render.evidence") : "Evidence", ctx)
  ]);
}

function markdownNextPrompts(
  prompts: Array<{ title: string; prompt: string; evidence: string[]; priority: "P0" | "P1" | "P2" | "P3" }>,
  ctx: ReturnType<typeof createI18n>
): string[] {
  return prompts.flatMap((item, index) => [
    `### ${index + 1}. ${item.title}`,
    "",
    `- ${t(ctx, "report.render.priority", { priority: formatPriority(ctx, item.priority) })}`,
    "",
    "```text",
    item.prompt,
    "```",
    "",
    ...markdownListBlock(item.evidence, t(ctx, "report.render.evidence"), ctx)
  ]);
}

function markdownEvidenceIndex(items: Array<{
  project: string;
  filePath: string;
  snippet: string;
  signal: string;
  topic: string;
  confidence: string;
}>): string[] {
  if (!items.length) return ["- No evidence snippets were collected."];
  return [
    "| Project | File | Topic | Signal | Confidence | Snippet |",
    "| --- | --- | --- | --- | --- | --- |",
    ...items.slice(0, 200).map((item) =>
      `| ${escapeMd(item.project)} | ${escapeMd(item.filePath)} | ${escapeMd(item.topic)} | ${escapeMd(item.signal)} | ${escapeMd(item.confidence)} | ${escapeMd(item.snippet)} |`
    )
  ];
}

function markdownListBlock(items: string[], title: string, ctx?: ReturnType<typeof createI18n>): string[] {
  return [`### ${title}`, "", ...markdownList(items, ctx ? t(ctx, "common.none") : "none"), ""];
}

function compactList(items: string[] | undefined, ctx?: ReturnType<typeof createI18n>): string {
  const cleaned = (items ?? []).filter(Boolean);
  return cleaned.length ? cleaned.slice(0, 8).join("; ") : ctx ? t(ctx, "report.render.notAvailable") : "not available";
}

function escapeMd(value: string): string {
  return String(value).replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

function markdownToHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inCode = false;
  let table: string[] = [];
  const flushTable = () => {
    if (!table.length) return;
    html.push(renderMarkdownTable(table));
    table = [];
  };
  for (const line of lines) {
    if (line.startsWith("```")) {
      flushTable();
      html.push(inCode ? "</pre>" : "<pre>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      html.push(escapeHtml(line));
      continue;
    }
    if (line.startsWith("|")) {
      table.push(line);
      continue;
    }
    flushTable();
    if (line.startsWith("# ")) html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    else if (line.startsWith("## ")) html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    else if (line.startsWith("### ")) html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    else if (line.startsWith("- ")) html.push(`<p>• ${escapeHtml(line.slice(2))}</p>`);
    else if (line.trim()) html.push(`<p>${escapeHtml(line)}</p>`);
  }
  flushTable();
  return html.join("\n");
}

function renderMarkdownTable(lines: string[]): string {
  const rows = lines
    .filter((line) => !/^\|\s*-/.test(line))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
  if (!rows.length) return "";
  const [header, ...body] = rows;
  return `<table><thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function renderUsageMetrics(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const usage = report.usageAnalytics;
  return `<section><h2>${escapeHtml(t(ctx, "report.section.coverage"))}</h2><div class="grid">
    ${metric("Sessions", valueOrUnavailable(usage?.qualifyingSessions ?? usage?.totalSessions, ctx))}
    ${metric("Active days", valueOrUnavailable(usage?.activeDays, ctx))}
    ${metric("Messages", valueOrUnavailable(usage?.totalMessages, ctx))}
    ${metric("Tool calls", valueOrUnavailable(usage?.toolCalls ?? report.metrics.toolCalls, ctx))}
    ${metric("Files modified", valueOrUnavailable(usage?.filesModified ?? report.metrics.filesTouched, ctx))}
    ${metric("Lines + / -", `${valueOrUnavailable(usage?.linesAdded, ctx)} / ${valueOrUnavailable(usage?.linesRemoved, ctx)}`)}
  </div></section>`;
}

function renderProjectBreakdown(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const rows = report.usageAnalytics?.projectBreakdown?.length
    ? report.usageAnalytics.projectBreakdown
        .map((project) => `<tr><td>${escapeHtml(project.projectName)}</td><td>${project.sessions}</td><td>${project.messages}</td><td>${project.toolCalls}</td><td>${valueOrUnavailable(project.filesModified, ctx)}</td></tr>`)
        .join("")
    : report.projects
        .map((project) => `<tr><td>${escapeHtml(project.name)}</td><td>1</td><td>${t(ctx, "report.render.notAvailable")}</td><td>${t(ctx, "report.render.notAvailable")}</td><td>${valueOrUnavailable(project.evidence.length, ctx)}</td></tr>`)
        .join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.projectRadar"))}</h2><table><thead><tr><th>project</th><th>sessions</th><th>messages</th><th>tool calls</th><th>evidence/files</th></tr></thead><tbody>${rows || emptyRow(5, ctx)}</tbody></table></section>`;
}

function renderToolUsage(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const stats = report.usageAnalytics?.toolActionStats ?? {};
  const rows = Object.entries(stats)
    .map(([name, stat]) => `<tr><td>${escapeHtml(name)}</td><td>${stat.total}</td><td>${valueOrUnavailable(stat.accepted, ctx)}</td><td>${valueOrUnavailable(stat.rejected, ctx)}</td><td>${valueOrUnavailable(stat.errorCount, ctx)}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.codexUsage"))}</h2><table><thead><tr><th>tool</th><th>total</th><th>accepted</th><th>rejected</th><th>errors</th></tr></thead><tbody>${rows || emptyRow(5, ctx)}</tbody></table></section>`;
}

function renderCommandAnalysis(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const stats = report.usageAnalytics?.commandStats;
  const failures = Object.entries(stats?.failureCategories ?? {}).map(([name, count]) => `${name}: ${count}`);
  return `<section><h2>${escapeHtml(t(ctx, "report.section.problemPatterns"))}</h2><ul>
    <li>Total commands: ${valueOrUnavailable(stats?.totalCommands ?? report.metrics.testCommands.length + report.metrics.buildCommands.length, ctx)}</li>
    <li>Failed commands: ${valueOrUnavailable(stats?.failedCommands, ctx)}</li>
    <li>Failure categories: ${escapeHtml(failures.join(", ") || t(ctx, "common.none"))}</li>
  </ul></section>`;
}

function renderWorkspaceQualityMatrix(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const rows = report.projects
    .map((project) => {
      const summary = project.qualitySummary;
      return `<tr><td>${escapeHtml(project.name)}</td><td>${yesNo(summary?.hasTestScript, ctx)}</td><td>${yesNo(summary?.hasCi, ctx)}</td><td>${yesNo(summary?.hasTestFiles, ctx)}</td><td>${yesNo(summary?.hasBuildConfig, ctx)}</td><td>${yesNo(summary?.hasExecutedTestEvidence, ctx)}</td><td>${yesNo(summary?.hasLint, ctx)}</td><td>${yesNo(summary?.hasTypecheck, ctx)}</td><td>${yesNo(summary?.hasDocker, ctx)}</td><td>${escapeHtml(summary?.unknownReason ?? "")}</td></tr>`;
    })
    .join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.workspaceQuality"))}</h2><table><thead><tr><th>project</th><th>test script</th><th>CI</th><th>test files</th><th>build config</th><th>executed test evidence</th><th>lint</th><th>typecheck</th><th>docker</th><th>unknown reason</th></tr></thead><tbody>${rows || emptyRow(10, ctx)}</tbody></table></section>`;
}

function renderDeepTopics(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const rows = report.deepTopics
    .map((topic) => `<tr><td>${escapeHtml(topic.topic)}</td><td>${topic.mentionedProjects}/${topic.totalProjects}</td><td>${escapeHtml(distributionSummary(topic))}</td><td>${escapeHtml(topic.recommendedReferenceProjects.join(", ") || t(ctx, "report.render.noReference"))}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.topicOverview"))}</h2><table><thead><tr><th>topic</th><th>mentions</th><th>maturity</th><th>reference</th></tr></thead><tbody>${rows || emptyRow(4, ctx)}</tbody></table></section>`;
}

function renderRagDeepDive(topic: DeepTopicReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const projectRows = topic.projectMaturity
    .map((project) => `<tr><td>${escapeHtml(project.projectName)}</td><td>${escapeHtml(project.maturity)}</td><td>${project.implementedDimensions.length}</td><td>${escapeHtml(project.missingDimensions.slice(0, 5).join(", "))}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.ragDeepDive"))}</h2>
    <p>${escapeHtml(topic.crossProjectFindings.join(" "))}</p>
    <h3>${escapeHtml(t(ctx, "report.section.ragArchitectureGaps"))}</h3>
    <p>${escapeHtml(distributionSummary(topic))}</p>
    <h3>${escapeHtml(t(ctx, "report.section.ragProjectMaturity"))}</h3>
    <table><thead><tr><th>project</th><th>maturity</th><th>dimensions</th><th>missing</th></tr></thead><tbody>${projectRows}</tbody></table>
    <h3>${escapeHtml(t(ctx, "report.section.ragRoadmap"))}</h3>
    <p>${escapeHtml(topic.recommendedArchitecture.stages.join(" -> "))}</p>
    <h3>${escapeHtml(t(ctx, "report.topic.platform.match"))}</h3>
    <p>${escapeHtml(topic.platformizationRecommendation.reason)}</p>
  </section>`;
}

function renderAgentRules(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const rules = report.agentRuleSuggestions ?? [];
  const html = rules
    .map((rule) => `<div class="copy"><label><input type="checkbox"> <strong>${escapeHtml(rule.title)}</strong></label><p>${escapeHtml(rule.reason)}</p><pre>${escapeHtml(rule.ruleText)}</pre></div>`)
    .join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.agentRules"))}</h2><p>${escapeHtml(t(ctx, "report.render.agentRulesCopy"))}</p>${html || `<p>${escapeHtml(t(ctx, "report.render.noAgentRules"))}</p>`}</section>`;
}

function renderDataQuality(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const rows = report.dataQuality
    .map((item) => `<tr><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(item.attemptedSources.join(", "))}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.dataQuality"))}</h2><table><thead><tr><th>source</th><th>status</th><th>reason</th><th>attempted</th></tr></thead><tbody>${rows || emptyRow(4, ctx)}</tbody></table></section>`;
}

function renderTrend(report: InsightReport, locale: SupportedLocale): string {
  const ctx = createI18n(locale);
  const deltas = trendDeltaLines(report, ctx).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `<section><h2>${escapeHtml(t(ctx, "report.section.trend"))}</h2><p>${escapeHtml(report.trend.message)}</p><ul>${deltas}</ul></section>`;
}

function renderSection(title: string, items: string[] | undefined, ctx: ReturnType<typeof createI18n>): string {
  return `<section><h2>${escapeHtml(title)}</h2>${renderList(items, ctx)}</section>`;
}

function renderList(items: string[] | undefined, ctx: ReturnType<typeof createI18n>): string {
  return items?.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : `<p>${escapeHtml(t(ctx, "report.render.emptySection"))}</p>`;
}

function metric(label: string, value: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function markdownSection(title: string, items: string[] | undefined, ctx: ReturnType<typeof createI18n>): string[] {
  return ["", `## ${title}`, "", ...markdownList(items, t(ctx, "report.render.emptySection"))];
}

function markdownUsageMetrics(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  const usage = report.usageAnalytics;
  return [
    "",
    `## ${t(ctx, "report.section.coverage")}`,
    "",
    `- Sessions: ${valueOrUnavailable(usage?.qualifyingSessions ?? usage?.totalSessions, ctx)}`,
    `- Active days: ${valueOrUnavailable(usage?.activeDays, ctx)}`,
    `- Messages: ${valueOrUnavailable(usage?.totalMessages, ctx)}`,
    `- Tool calls: ${valueOrUnavailable(usage?.toolCalls ?? report.metrics.toolCalls, ctx)}`,
    `- Files modified: ${valueOrUnavailable(usage?.filesModified ?? report.metrics.filesTouched, ctx)}`,
    `- Lines added / removed: ${valueOrUnavailable(usage?.linesAdded, ctx)} / ${valueOrUnavailable(usage?.linesRemoved, ctx)}`
  ];
}

function markdownProjectBreakdown(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  const rows = report.usageAnalytics?.projectBreakdown?.length
    ? report.usageAnalytics.projectBreakdown.map((project) => `| ${project.projectName} | ${project.sessions} | ${project.messages} | ${project.toolCalls} | ${valueOrUnavailable(project.filesModified, ctx)} |`)
    : report.projects.map((project) => `| ${project.name} | 1 | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${project.evidence.length} |`);
  return ["", `## ${t(ctx, "report.section.projectRadar")}`, "", "| project | sessions | messages | tool calls | files/evidence |", "|---|---:|---:|---:|---:|", ...(rows.length ? rows : [`| ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} |`])];
}

function markdownToolUsage(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  const rows = Object.entries(report.usageAnalytics?.toolActionStats ?? {}).map(([name, stat]) => `| ${name} | ${stat.total} | ${valueOrUnavailable(stat.accepted, ctx)} | ${valueOrUnavailable(stat.rejected, ctx)} | ${valueOrUnavailable(stat.errorCount, ctx)} |`);
  return ["", `## ${t(ctx, "report.section.codexUsage")}`, "", "| tool | total | accepted | rejected | errors |", "|---|---:|---:|---:|---:|", ...(rows.length ? rows : [`| ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} |`])];
}

function markdownCommandAnalysis(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  const stats = report.usageAnalytics?.commandStats;
  const failures = Object.entries(stats?.failureCategories ?? {}).map(([name, count]) => `${name}: ${count}`);
  return ["", `## ${t(ctx, "report.section.problemPatterns")}`, "", `- Total commands: ${valueOrUnavailable(stats?.totalCommands ?? report.metrics.testCommands.length + report.metrics.buildCommands.length, ctx)}`, `- Failed commands: ${valueOrUnavailable(stats?.failedCommands, ctx)}`, `- Failure categories: ${failures.join(", ") || t(ctx, "common.none")}`];
}

function markdownWorkspaceQuality(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  const rows = report.projects.map((project) => {
    const summary = project.qualitySummary;
    return `| ${project.name} | ${yesNo(summary?.hasTestScript, ctx)} | ${yesNo(summary?.hasCi, ctx)} | ${yesNo(summary?.hasTestFiles, ctx)} | ${yesNo(summary?.hasBuildConfig, ctx)} | ${yesNo(summary?.hasExecutedTestEvidence, ctx)} | ${yesNo(summary?.hasLint, ctx)} | ${yesNo(summary?.hasTypecheck, ctx)} | ${yesNo(summary?.hasDocker, ctx)} | ${summary?.unknownReason ?? ""} |`;
  });
  return ["", `## ${t(ctx, "report.section.workspaceQuality")}`, "", "| project | test script | CI | test files | build config | executed test evidence | lint | typecheck | docker | unknown reason |", "|---|---|---|---|---|---|---|---|---|---|", ...(rows.length ? rows : [`| ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} |`])];
}

function markdownDeepTopics(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  const rows = report.deepTopics.map((topic) => `| ${topic.topic} | ${topic.mentionedProjects}/${topic.totalProjects} | ${distributionSummary(topic)} | ${topic.recommendedReferenceProjects.join(", ") || t(ctx, "report.render.noReference")} |`);
  return ["", `## ${t(ctx, "report.section.topicOverview")}`, "", "| topic | mentions | maturity | reference |", "|---|---:|---|---|", ...(rows.length ? rows : [`| ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} | ${t(ctx, "report.render.notAvailable")} |`])];
}

function markdownRag(report: InsightReport, locale: SupportedLocale): string[] {
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");
  if (!rag) return [];
  const ctx = createI18n(locale);
  return ["", `## ${t(ctx, "report.section.ragDeepDive")}`, "", ...markdownList(rag.crossProjectFindings, t(ctx, "report.render.emptySection")), "", `### ${t(ctx, "report.section.ragRoadmap")}`, "", rag.recommendedArchitecture.stages.join(" -> "), "", `### ${t(ctx, "report.topic.platform.match")}`, "", rag.platformizationRecommendation.reason];
}

function markdownAgentRules(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  const rules = report.agentRuleSuggestions ?? [];
  return [
    "",
    `## ${t(ctx, "report.section.agentRules")}`,
    "",
    t(ctx, "report.render.agentRulesCopy"),
    "",
    ...(rules.length
      ? rules.flatMap((rule) => [`- [ ] ${rule.title} (${rule.severity})`, "", "```text", rule.ruleText, "```", "", `Reason: ${rule.reason}`, ""])
      : [`- ${t(ctx, "report.render.noAgentRules")}`])
  ];
}

function markdownDataQuality(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  return ["", `## ${t(ctx, "report.section.dataQuality")}`, "", ...markdownList(report.dataQuality.map((item) => `${item.source}: ${item.status} - ${item.reason}`), t(ctx, "dataQuality.summary.none"))];
}

function markdownTrend(report: InsightReport, locale: SupportedLocale): string[] {
  const ctx = createI18n(locale);
  return ["", `## ${t(ctx, "report.section.trend")}`, "", report.trend.message, "", ...markdownList(trendDeltaLines(report, ctx), t(ctx, "report.render.trendNoDeltas"))];
}

function markdownList(items: string[] | undefined, empty: string): string[] {
  return items?.length ? items.map((item) => `- ${item}`) : [`- ${empty}`];
}

function valueOrUnavailable(value: number | string | undefined, ctx: ReturnType<typeof createI18n>): string {
  return value === undefined ? t(ctx, "report.render.notAvailable") : String(value);
}

function yesNo(value: boolean | undefined, ctx: ReturnType<typeof createI18n>): string {
  if (value === undefined) return t(ctx, "common.notDetected");
  return value ? t(ctx, "common.yes") : t(ctx, "common.no");
}

function emptyRow(columns: number, ctx: ReturnType<typeof createI18n>): string {
  return `<tr><td colspan="${columns}">${escapeHtml(t(ctx, "report.render.notAvailable"))}</td></tr>`;
}

function distributionSummary(topic: DeepTopicReport): string {
  return Object.entries(topic.maturityDistribution)
    .filter(([, count]) => count > 0)
    .map(([maturity, count]) => `${maturity}:${count}`)
    .join(", ");
}

function trendDeltaLines(report: InsightReport, ctx: ReturnType<typeof createI18n>): string[] {
  const entries = Object.entries(report.trend.deltas ?? {}).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    return [t(ctx, "report.render.trendNoDeltas")];
  }
  return entries.map(([metricName, value]) =>
    t(ctx, "report.render.trendDelta", {
      metric: metricName,
      value: Array.isArray(value) ? value.length : String(value)
    })
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
