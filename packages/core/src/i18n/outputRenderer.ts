import type { InsightReport } from "../insights/reportModel.js";
import type { DeepTopicReport } from "../model/topic.js";
import type { SupportedLocale } from "./localeResolver.js";
import { getMessageCatalog } from "./messageCatalog.js";
import { createI18n } from "./locale.js";
import { formatBoolean, formatMaturity, formatPriority } from "./format.js";
import { t } from "./t.js";

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
  const labels = sectionLabels(locale);
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
          ${metric(labels.schema, report.schemaVersion)}
          ${metric(labels.mode, report.scanSummary.mode)}
          ${metric(labels.projectsScanned, String(report.scanSummary.projectsScanned))}
          ${metric(labels.testsRun, report.metrics.testsRunKnown ? String(report.metrics.testsRunCount ?? 0) : "unknown")}
        </div>
      </header>
      ${renderSection(labels.atAGlance, report.productInsights?.atAGlance)}
      ${renderUsageMetrics(report, locale)}
      ${renderSection(labels.whatYouWorkOn, report.productInsights?.whatYouWorkOn)}
      ${renderSection(labels.howYouUseCodex, report.productInsights?.howYouUseCodex)}
      ${renderProjectBreakdown(report, locale)}
      ${renderToolUsage(report, locale)}
      ${renderCommandAnalysis(report, locale)}
      ${renderWorkspaceQualityMatrix(report, locale)}
      ${renderDeepTopics(report, locale)}
      ${rag ? renderRagDeepDive(rag, locale) : ""}
      ${renderSection(labels.whereThingsGoWrong, report.productInsights?.whereThingsGoWrong)}
      ${renderSection(labels.impressiveThings, report.productInsights?.impressiveThings)}
      ${renderAgentRules(report, locale)}
      ${renderSection(labels.featuresToTry, report.productInsights?.featuresToTry)}
      ${renderSection(labels.newWaysToUseCodex, report.productInsights?.newWaysToUseCodex)}
      ${renderSection(labels.onTheHorizon, report.productInsights?.onTheHorizon)}
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
  const labels = sectionLabels(locale);
  const lines: string[] = [
    `# ${locale === "zh-CN" ? "Codex 洞察分析" : "Codex Insights"}`,
    "",
    `- Schema: ${report.schemaVersion}`,
    `- Mode: ${report.scanSummary.mode}`,
    `- Generated: ${report.generatedAt}`,
    `- Projects scanned: ${report.scanSummary.projectsScanned}`,
    `- Files scanned: ${report.scanSummary.filesScanned}`,
    `- Tests run: ${report.metrics.testsRunKnown ? report.metrics.testsRunCount ?? 0 : "unknown"}`,
    "",
    ...markdownSection(labels.atAGlance, report.productInsights?.atAGlance),
    ...markdownUsageMetrics(report, locale),
    ...markdownSection(labels.whatYouWorkOn, report.productInsights?.whatYouWorkOn),
    ...markdownSection(labels.howYouUseCodex, report.productInsights?.howYouUseCodex),
    ...markdownProjectBreakdown(report, locale),
    ...markdownToolUsage(report, locale),
    ...markdownCommandAnalysis(report, locale),
    ...markdownWorkspaceQuality(report, locale),
    ...markdownDeepTopics(report, locale),
    ...markdownRag(report, locale),
    ...markdownSection(labels.whereThingsGoWrong, report.productInsights?.whereThingsGoWrong),
    ...markdownSection(labels.impressiveThings, report.productInsights?.impressiveThings),
    ...markdownAgentRules(report, locale),
    ...markdownSection(labels.featuresToTry, report.productInsights?.featuresToTry),
    ...markdownSection(labels.newWaysToUseCodex, report.productInsights?.newWaysToUseCodex),
    ...markdownSection(labels.onTheHorizon, report.productInsights?.onTheHorizon),
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
    ...markdownListBlock(narrative.coverage.dataGaps, "Data gaps"),
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
    ...markdownListBlock(narrative.workspaceQuality.priorityOrder, "Priority order"),
    "",
    ...markdownListBlock(narrative.workspaceQuality.commandSuggestions, "Suggested commands"),
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
    ...markdownProblemTable(narrative.problems),
    "",
    `## ${t(ctx, "report.section.strengths")}`,
    "",
    ...markdownInsightTable(narrative.strengths, ctx),
    "",
    `## ${t(ctx, "report.section.agentRules")}`,
    "",
    ...markdownAgentRulesFull(narrative.agentRules),
    "",
    `## ${t(ctx, "report.section.nextCodexPrompts")}`,
    "",
    ...markdownNextPrompts(narrative.nextPrompts, ctx),
    "",
    `## ${t(ctx, "report.section.dataQuality")}`,
    "",
    `- ${t(ctx, "report.coverage.confidence", { confidence: narrative.dataQuality.confidence })}`,
    ...markdownListBlock(narrative.dataQuality.sources, "Sources"),
    ...markdownListBlock(narrative.dataQuality.unknowns, "Unknowns"),
    ...markdownListBlock(
      narrative.dataQuality.suspiciousMetrics.length
        ? narrative.dataQuality.suspiciousMetrics
        : [t(ctx, "dataQuality.caveat.noAnomaly")],
      "Suspicious metrics"
    ),
    ...markdownListBlock(narrative.dataQuality.caveats, "Caveats"),
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
      `| ${escapeMd(item.dimension)} | ${escapeMd(compactList(item.projectsWithEvidence))} | ${escapeMd(compactList(item.projectsMissing))} | ${escapeMd(compactList(item.evidence))} | ${item.platformize ? "yes" : "no"} | ${escapeMd(item.interpretation)} |`
    ),
    "",
    `### ${t(ctx, "report.section.ragRoadmap")}`,
    "",
    `- Reference project: ${rag.roadmap.referenceProject}`,
    `- Not recommended as reference: ${compactList(rag.roadmap.rejectedReferences)}`,
    `- Shared modules: ${compactList(rag.roadmap.sharedModules)}`,
    `- Business boundaries: ${compactList(rag.roadmap.businessBoundaries)}`,
    "",
    ...markdownListBlock(rag.roadmap.phaseOne, "Phase 1"),
    ...markdownListBlock(rag.roadmap.phaseTwo, "Phase 2"),
    ...markdownListBlock(rag.roadmap.phaseThree, "Phase 3"),
    ...markdownListBlock(rag.roadmap.defer, "Do not do yet")
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
      `| ${escapeMd(item.projectName)} | ${escapeMd(formatMaturity(ctx, item.maturity))} | ${escapeMd(compactList(item.implementedDimensions))} | ${escapeMd(compactList(item.missingDimensions))} | ${escapeMd(compactList(item.risks))} | ${escapeMd(compactList(item.recommendedNextActions))} | ${escapeMd(compactList(item.evidence.map((evidence) => evidence.snippet).slice(0, 3)))} |`
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
}>): string[] {
  return [
    "| Category | Count | Projects | Snippet | Root cause | Fix strategy | AGENTS.md rule needed |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...items.map((item) =>
      `| ${escapeMd(item.category)} | ${item.count} | ${escapeMd(compactList(item.projects))} | ${escapeMd(item.snippet)} | ${escapeMd(item.rootCause)} | ${escapeMd(item.fixStrategy)} | ${item.needsAgentRule ? "yes" : "no"} |`
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
}>): string[] {
  if (!items.length) return ["- No AGENTS.md suggestions."];
  return items.flatMap((item, index) => [
    `### ${index + 1}. ${item.title}`,
    "",
    `- Target: ${item.target}`,
    `- Severity: ${item.severity}`,
    `- Applies to: ${item.appliesTo}`,
    `- Reason: ${item.reason}`,
    "",
    "```text",
    item.ruleText,
    "```",
    "",
    ...markdownListBlock(item.evidence, "Evidence")
  ]);
}

function markdownNextPrompts(
  prompts: Array<{ title: string; prompt: string; evidence: string[]; priority: "P0" | "P1" | "P2" | "P3" }>,
  ctx: ReturnType<typeof createI18n>
): string[] {
  return prompts.flatMap((item, index) => [
    `### ${index + 1}. ${item.title}`,
    "",
    `- Priority: ${formatPriority(ctx, item.priority)}`,
    "",
    "```text",
    item.prompt,
    "```",
    "",
    ...markdownListBlock(item.evidence, "Evidence")
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

function markdownListBlock(items: string[], title: string): string[] {
  return [`### ${title}`, "", ...markdownList(items, "none"), ""];
}

function compactList(items: string[] | undefined): string {
  const cleaned = (items ?? []).filter(Boolean);
  return cleaned.length ? cleaned.slice(0, 8).join("; ") : "not available";
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

function sectionLabels(locale: SupportedLocale): Record<string, string> {
  return locale === "zh-CN"
    ? {
        schema: "Schema",
        mode: "Mode",
        projectsScanned: "扫描项目",
        testsRun: "测试执行",
        atAGlance: "总览",
        usageMetrics: "使用指标",
        whatYouWorkOn: "你主要在做什么",
        howYouUseCodex: "你如何使用 Codex",
        projectBreakdown: "项目分布",
        toolUsage: "工具使用",
        commandAnalysis: "命令与错误分析",
        workspaceQuality: "工作区质量证据矩阵",
        deepTopics: "深度专题报告",
        ragDeepDive: "RAG 深挖",
        whereThingsGoWrong: "问题经常出在哪里",
        impressiveThings: "做得不错的地方",
        agentRules: "建议加入 AGENTS.md 的规则",
        featuresToTry: "建议尝试的能力和工作流",
        newWaysToUseCodex: "Codex 的新用法",
        onTheHorizon: "下一阶段机会",
        dataQuality: "数据质量说明",
        trend: "趋势对比"
      }
    : {
        schema: "Schema",
        mode: "Mode",
        projectsScanned: "Projects scanned",
        testsRun: "Tests run",
        atAGlance: "At a Glance",
        usageMetrics: "Usage Metrics",
        whatYouWorkOn: "What You Work On",
        howYouUseCodex: "How You Use Codex",
        projectBreakdown: "Project Breakdown",
        toolUsage: "Tool Usage",
        commandAnalysis: "Command & Error Analysis",
        workspaceQuality: "Workspace Quality Matrix",
        deepTopics: "Deep Topic Reports",
        ragDeepDive: "RAG Deep Dive",
        whereThingsGoWrong: "Where Things Go Wrong",
        impressiveThings: "Impressive Things You Did",
        agentRules: "Suggested AGENTS.md Additions",
        featuresToTry: "Features / Workflows to Try",
        newWaysToUseCodex: "New Ways to Use Codex",
        onTheHorizon: "On the Horizon",
        dataQuality: "Data Quality",
        trend: "Trend Comparison"
      };
}

function renderUsageMetrics(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const usage = report.usageAnalytics;
  return `<section><h2>${escapeHtml(labels.usageMetrics)}</h2><div class="grid">
    ${metric("Sessions", valueOrUnknown(usage?.qualifyingSessions ?? usage?.totalSessions))}
    ${metric("Active days", valueOrUnknown(usage?.activeDays))}
    ${metric("Messages", valueOrUnknown(usage?.totalMessages))}
    ${metric("Tool calls", valueOrUnknown(usage?.toolCalls ?? report.metrics.toolCalls))}
    ${metric("Files modified", valueOrUnknown(usage?.filesModified ?? report.metrics.filesTouched))}
    ${metric("Lines + / -", `${valueOrUnknown(usage?.linesAdded)} / ${valueOrUnknown(usage?.linesRemoved)}`)}
  </div></section>`;
}

function renderProjectBreakdown(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const rows = report.usageAnalytics?.projectBreakdown?.length
    ? report.usageAnalytics.projectBreakdown
        .map((project) => `<tr><td>${escapeHtml(project.projectName)}</td><td>${project.sessions}</td><td>${project.messages}</td><td>${project.toolCalls}</td><td>${valueOrUnknown(project.filesModified)}</td></tr>`)
        .join("")
    : report.projects
        .map((project) => `<tr><td>${escapeHtml(project.name)}</td><td>1</td><td>unknown</td><td>unknown</td><td>${valueOrUnknown(project.evidence.length)}</td></tr>`)
        .join("");
  return `<section><h2>${escapeHtml(labels.projectBreakdown)}</h2><table><thead><tr><th>project</th><th>sessions</th><th>messages</th><th>tool calls</th><th>evidence/files</th></tr></thead><tbody>${rows || emptyRow(5)}</tbody></table></section>`;
}

function renderToolUsage(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const stats = report.usageAnalytics?.toolActionStats ?? {};
  const rows = Object.entries(stats)
    .map(([name, stat]) => `<tr><td>${escapeHtml(name)}</td><td>${stat.total}</td><td>${valueOrUnknown(stat.accepted)}</td><td>${valueOrUnknown(stat.rejected)}</td><td>${valueOrUnknown(stat.errorCount)}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(labels.toolUsage)}</h2><table><thead><tr><th>tool</th><th>total</th><th>accepted</th><th>rejected</th><th>errors</th></tr></thead><tbody>${rows || emptyRow(5)}</tbody></table></section>`;
}

function renderCommandAnalysis(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const stats = report.usageAnalytics?.commandStats;
  const failures = Object.entries(stats?.failureCategories ?? {}).map(([name, count]) => `${name}: ${count}`);
  return `<section><h2>${escapeHtml(labels.commandAnalysis)}</h2><ul>
    <li>Total commands: ${valueOrUnknown(stats?.totalCommands ?? report.metrics.testCommands.length + report.metrics.buildCommands.length)}</li>
    <li>Failed commands: ${valueOrUnknown(stats?.failedCommands)}</li>
    <li>Failure categories: ${escapeHtml(failures.join(", ") || "unknown")}</li>
  </ul></section>`;
}

function renderWorkspaceQualityMatrix(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const rows = report.projects
    .map((project) => {
      const summary = project.qualitySummary;
      return `<tr><td>${escapeHtml(project.name)}</td><td>${yesNo(summary?.hasTestScript)}</td><td>${yesNo(summary?.hasCi)}</td><td>${yesNo(summary?.hasTestFiles)}</td><td>${yesNo(summary?.hasBuildConfig)}</td><td>${yesNo(summary?.hasExecutedTestEvidence)}</td><td>${yesNo(summary?.hasLint)}</td><td>${yesNo(summary?.hasTypecheck)}</td><td>${yesNo(summary?.hasDocker)}</td><td>${escapeHtml(summary?.unknownReason ?? "")}</td></tr>`;
    })
    .join("");
  return `<section><h2>${escapeHtml(labels.workspaceQuality)}</h2><table><thead><tr><th>project</th><th>test script</th><th>CI</th><th>test files</th><th>build config</th><th>executed test evidence</th><th>lint</th><th>typecheck</th><th>docker</th><th>unknown reason</th></tr></thead><tbody>${rows || emptyRow(10)}</tbody></table></section>`;
}

function renderDeepTopics(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const rows = report.deepTopics
    .map((topic) => `<tr><td>${escapeHtml(topic.topic)}</td><td>${topic.mentionedProjects}/${topic.totalProjects}</td><td>${escapeHtml(JSON.stringify(topic.maturityDistribution))}</td><td>${escapeHtml(topic.recommendedReferenceProjects.join(", ") || "unknown")}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(labels.deepTopics)}</h2><table><thead><tr><th>topic</th><th>mentions</th><th>maturity</th><th>reference</th></tr></thead><tbody>${rows || emptyRow(4)}</tbody></table></section>`;
}

function renderRagDeepDive(topic: DeepTopicReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const projectRows = topic.projectMaturity
    .map((project) => `<tr><td>${escapeHtml(project.projectName)}</td><td>${escapeHtml(project.maturity)}</td><td>${project.implementedDimensions.length}</td><td>${escapeHtml(project.missingDimensions.slice(0, 5).join(", "))}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(labels.ragDeepDive)}</h2>
    <p>${escapeHtml(topic.crossProjectFindings.join(" "))}</p>
    <h3>${locale === "zh-CN" ? "成熟度分布" : "Maturity Distribution"}</h3>
    <p>${escapeHtml(JSON.stringify(topic.maturityDistribution))}</p>
    <h3>${locale === "zh-CN" ? "项目成熟度" : "Project Maturity"}</h3>
    <table><thead><tr><th>project</th><th>maturity</th><th>dimensions</th><th>missing</th></tr></thead><tbody>${projectRows}</tbody></table>
    <h3>${locale === "zh-CN" ? "推荐架构" : "Recommended Architecture"}</h3>
    <p>${escapeHtml(topic.recommendedArchitecture.stages.join(" -> "))}</p>
    <h3>${locale === "zh-CN" ? "平台化建议" : "Platformization"}</h3>
    <p>${escapeHtml(topic.platformizationRecommendation.reason)}</p>
  </section>`;
}

function renderAgentRules(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const rules = report.agentRuleSuggestions ?? [];
  const html = rules
    .map((rule) => `<div class="copy"><label><input type="checkbox"> <strong>${escapeHtml(rule.title)}</strong></label><p>${escapeHtml(rule.reason)}</p><pre>${escapeHtml(rule.ruleText)}</pre></div>`)
    .join("");
  return `<section><h2>${escapeHtml(labels.agentRules)}</h2><p>${locale === "zh-CN" ? "单条 copy：复制任一规则文本。Copy all：复制本节所有规则文本。" : "Single copy: copy any rule text. Copy all: copy every rule in this section."}</p>${html || `<p>${locale === "zh-CN" ? "没有 AGENTS.md 建议。" : "No AGENTS.md suggestions."}</p>`}</section>`;
}

function renderDataQuality(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  const rows = report.dataQuality
    .map((item) => `<tr><td>${escapeHtml(item.source)}</td><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.reason)}</td><td>${escapeHtml(item.attemptedSources.join(", "))}</td></tr>`)
    .join("");
  return `<section><h2>${escapeHtml(labels.dataQuality)}</h2><table><thead><tr><th>source</th><th>status</th><th>reason</th><th>attempted</th></tr></thead><tbody>${rows || emptyRow(4)}</tbody></table></section>`;
}

function renderTrend(report: InsightReport, locale: SupportedLocale): string {
  const labels = sectionLabels(locale);
  return `<section><h2>${escapeHtml(labels.trend)}</h2><p>${escapeHtml(report.trend.message)}</p><pre>${escapeHtml(JSON.stringify(report.trend.deltas, null, 2))}</pre></section>`;
}

function renderSection(title: string, items?: string[]): string {
  return `<section><h2>${escapeHtml(title)}</h2>${renderList(items)}</section>`;
}

function renderList(items?: string[]): string {
  return items?.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "<p>unknown</p>";
}

function metric(label: string, value: string): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function markdownSection(title: string, items?: string[]): string[] {
  return ["", `## ${title}`, "", ...markdownList(items, "unknown")];
}

function markdownUsageMetrics(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  const usage = report.usageAnalytics;
  return [
    "",
    `## ${labels.usageMetrics}`,
    "",
    `- Sessions: ${valueOrUnknown(usage?.qualifyingSessions ?? usage?.totalSessions)}`,
    `- Active days: ${valueOrUnknown(usage?.activeDays)}`,
    `- Messages: ${valueOrUnknown(usage?.totalMessages)}`,
    `- Tool calls: ${valueOrUnknown(usage?.toolCalls ?? report.metrics.toolCalls)}`,
    `- Files modified: ${valueOrUnknown(usage?.filesModified ?? report.metrics.filesTouched)}`,
    `- Lines added / removed: ${valueOrUnknown(usage?.linesAdded)} / ${valueOrUnknown(usage?.linesRemoved)}`
  ];
}

function markdownProjectBreakdown(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  const rows = report.usageAnalytics?.projectBreakdown?.length
    ? report.usageAnalytics.projectBreakdown.map((project) => `| ${project.projectName} | ${project.sessions} | ${project.messages} | ${project.toolCalls} | ${valueOrUnknown(project.filesModified)} |`)
    : report.projects.map((project) => `| ${project.name} | 1 | unknown | unknown | ${project.evidence.length} |`);
  return ["", `## ${labels.projectBreakdown}`, "", "| project | sessions | messages | tool calls | files/evidence |", "|---|---:|---:|---:|---:|", ...(rows.length ? rows : ["| unknown | unknown | unknown | unknown | unknown |"])];
}

function markdownToolUsage(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  const rows = Object.entries(report.usageAnalytics?.toolActionStats ?? {}).map(([name, stat]) => `| ${name} | ${stat.total} | ${valueOrUnknown(stat.accepted)} | ${valueOrUnknown(stat.rejected)} | ${valueOrUnknown(stat.errorCount)} |`);
  return ["", `## ${labels.toolUsage}`, "", "| tool | total | accepted | rejected | errors |", "|---|---:|---:|---:|---:|", ...(rows.length ? rows : ["| unknown | unknown | unknown | unknown | unknown |"])];
}

function markdownCommandAnalysis(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  const stats = report.usageAnalytics?.commandStats;
  return ["", `## ${labels.commandAnalysis}`, "", `- Total commands: ${valueOrUnknown(stats?.totalCommands ?? report.metrics.testCommands.length + report.metrics.buildCommands.length)}`, `- Failed commands: ${valueOrUnknown(stats?.failedCommands)}`, `- Failure categories: ${JSON.stringify(stats?.failureCategories ?? {})}`];
}

function markdownWorkspaceQuality(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  const rows = report.projects.map((project) => {
    const summary = project.qualitySummary;
    return `| ${project.name} | ${yesNo(summary?.hasTestScript)} | ${yesNo(summary?.hasCi)} | ${yesNo(summary?.hasTestFiles)} | ${yesNo(summary?.hasBuildConfig)} | ${yesNo(summary?.hasExecutedTestEvidence)} | ${yesNo(summary?.hasLint)} | ${yesNo(summary?.hasTypecheck)} | ${yesNo(summary?.hasDocker)} | ${summary?.unknownReason ?? ""} |`;
  });
  return ["", `## ${labels.workspaceQuality}`, "", "| project | test script | CI | test files | build config | executed test evidence | lint | typecheck | docker | unknown reason |", "|---|---|---|---|---|---|---|---|---|---|", ...(rows.length ? rows : ["| unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown |"])];
}

function markdownDeepTopics(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  const rows = report.deepTopics.map((topic) => `| ${topic.topic} | ${topic.mentionedProjects}/${topic.totalProjects} | ${JSON.stringify(topic.maturityDistribution)} | ${topic.recommendedReferenceProjects.join(", ") || "unknown"} |`);
  return ["", `## ${labels.deepTopics}`, "", "| topic | mentions | maturity | reference |", "|---|---:|---|---|", ...(rows.length ? rows : ["| unknown | unknown | unknown | unknown |"])];
}

function markdownRag(report: InsightReport, locale: SupportedLocale): string[] {
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");
  if (!rag) return [];
  const labels = sectionLabels(locale);
  return ["", `## ${labels.ragDeepDive}`, "", ...markdownList(rag.crossProjectFindings, "unknown"), "", `### ${locale === "zh-CN" ? "推荐架构" : "Recommended Architecture"}`, "", rag.recommendedArchitecture.stages.join(" -> "), "", `### ${locale === "zh-CN" ? "平台化建议" : "Platformization"}`, "", rag.platformizationRecommendation.reason];
}

function markdownAgentRules(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  const rules = report.agentRuleSuggestions ?? [];
  return [
    "",
    `## ${labels.agentRules}`,
    "",
    locale === "zh-CN" ? "单条 copy：复制任一规则文本。Copy all：复制本节所有规则文本。" : "Single copy: copy any rule text. Copy all: copy every rule in this section.",
    "",
    ...(rules.length
      ? rules.flatMap((rule) => [`- [ ] ${rule.title} (${rule.severity})`, "", "```text", rule.ruleText, "```", "", `Reason: ${rule.reason}`, ""])
      : ["- unknown"])
  ];
}

function markdownDataQuality(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  return ["", `## ${labels.dataQuality}`, "", ...markdownList(report.dataQuality.map((item) => `${item.source}: ${item.status} - ${item.reason}`), "No data quality warnings.")];
}

function markdownTrend(report: InsightReport, locale: SupportedLocale): string[] {
  const labels = sectionLabels(locale);
  return ["", `## ${labels.trend}`, "", report.trend.message, "", "```json", JSON.stringify(report.trend.deltas, null, 2), "```"];
}

function markdownList(items: string[] | undefined, empty: string): string[] {
  return items?.length ? items.map((item) => `- ${item}`) : [`- ${empty}`];
}

function valueOrUnknown(value: number | string | undefined): string {
  return value === undefined ? "unknown" : String(value);
}

function yesNo(value: boolean | undefined): string {
  if (value === undefined) return "unknown";
  return value ? "yes" : "no";
}

function emptyRow(columns: number): string {
  return `<tr><td colspan="${columns}">unknown</td></tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
