import type { InsightReport } from "../insights/reportModel.js";
import type { DeepTopicReport } from "../model/topic.js";
import type { SupportedLocale } from "./localeResolver.js";
import { getMessageCatalog } from "./messageCatalog.js";

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
