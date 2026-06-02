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
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(catalog.title)} - ${escapeHtml(report.repository.name)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-zinc-50 text-zinc-950 antialiased">
    <main class="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <header class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p class="text-sm font-medium uppercase text-cyan-700">${escapeHtml(report.repository.name)}</p>
        <h1 class="mt-2 text-3xl font-semibold">${escapeHtml(catalog.title)}</h1>
        <h2 class="mt-5 text-lg font-semibold">${escapeHtml(catalog.sections.summary)}</h2>
        <p class="mt-3 max-w-4xl text-base leading-7 text-zinc-650">${escapeHtml(report.summary.narrative)}</p>
        <div class="mt-5 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-4">
          <div><span class="font-medium text-zinc-950">Mode</span> ${escapeHtml(report.scanSummary.mode)}</div>
          <div><span class="font-medium text-zinc-950">Generated</span> ${escapeHtml(report.generatedAt)}</div>
          <div><span class="font-medium text-zinc-950">Schema</span> ${escapeHtml(report.schemaVersion)}</div>
          <div><span class="font-medium text-zinc-950">Locale</span> ${escapeHtml(report.locale)}</div>
        </div>
      </header>

      <section>
        <h2 class="text-xl font-semibold">${escapeHtml(catalog.sections.metrics)}</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          ${metricCard(catalog.metrics.projectsScanned, String(report.scanSummary.projectsScanned))}
          ${metricCard(catalog.metrics.filesScanned, String(report.scanSummary.filesScanned))}
          ${metricCard(catalog.metrics.testsRun, report.metrics.testsRunKnown ? String(report.metrics.testsRunCount ?? 0) : "unknown")}
          ${metricCard(catalog.metrics.warnings, String(report.dataQuality.length + report.metrics.warnings))}
        </div>
      </section>

      ${renderDataQuality(report, locale)}
      ${renderTopicOverview(report, locale)}
      ${rag ? renderRagDeepDive(rag, locale) : ""}
      ${renderTrend(report, locale)}
      ${renderRecommendations(report, locale)}
    </main>
  </body>
</html>`;
}

export function renderInsightsMarkdown(
  report: InsightReport,
  locale: SupportedLocale = report.locale
): string {
  const rag = report.deepTopics.find((topic) => topic.topic === "rag");
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
    `## ${locale === "zh-CN" ? "摘要" : "Summary"}`,
    "",
    report.summary.narrative,
    "",
    `## ${locale === "zh-CN" ? "数据质量" : "Data Quality"}`,
    "",
    ...renderMarkdownList(
      report.dataQuality.map(
        (item) => `${item.source}: ${item.status} - ${item.reason}`
      ),
      locale === "zh-CN" ? "没有数据质量警告。" : "No data quality warnings."
    ),
    "",
    `## ${locale === "zh-CN" ? "专题概览" : "Topic Overview"}`,
    "",
    ...renderMarkdownList(
      report.deepTopics.map(
        (topic) =>
          `${topic.topic}: ${topic.mentionedProjects}/${topic.totalProjects} projects`
      ),
      locale === "zh-CN" ? "没有专题洞察。" : "No deep topic reports."
    )
  ];

  if (rag) {
    lines.push(
      "",
      `## ${locale === "zh-CN" ? "RAG 深度分析" : "RAG Deep Dive"}`,
      "",
      locale === "zh-CN"
        ? `在扫描的 ${rag.totalProjects} 个项目中，有 ${rag.mentionedProjects} 个项目出现 RAG 证据。当前最大风险不是“没有 RAG”，而是多个项目各自实现半套 RAG，容易造成重复建设、评估口径不一致、向量索引不可迁移、权限边界不清晰。`
        : `Mentioned projects: ${rag.mentionedProjects}/${rag.totalProjects}`,
      "",
      locale === "zh-CN" ? "### 成熟度分布" : "### Maturity Distribution",
      "",
      ...Object.entries(rag.maturityDistribution).map(
        ([key, value]) => `- ${key}: ${value}`
      ),
      "",
      locale === "zh-CN" ? "### 项目成熟度" : "### Project Maturity",
      "",
      ...rag.projectMaturity.map(
        (project) =>
          locale === "zh-CN"
            ? `- ${project.projectName}: ${project.maturity}; 已实现 ${project.implementedDimensions.length} 个维度；缺失 ${project.missingDimensions.length} 个维度`
            : `- ${project.projectName}: ${project.maturity}; implemented ${project.implementedDimensions.length} dimensions; missing ${project.missingDimensions.length}`
      ),
      "",
      locale === "zh-CN" ? "### 推荐架构" : "### Recommended Architecture",
      "",
      rag.recommendedArchitecture.stages.join(" -> "),
      "",
      locale === "zh-CN" ? "### 平台化建议" : "### Platformization",
      "",
      locale === "zh-CN"
        ? `${rag.platformizationRecommendation.shouldPlatformize ? "建议平台化" : "暂不建议平台化"} - 建议以 ${rag.recommendedReferenceProjects[0] ?? "成熟度最高的项目"} 作为 reference implementation，优先抽公共 ingestion、chunking、embedding、index、retrieval、rerank、citation、evaluation、observability 和 tenant isolation 模块。`
        : `${rag.platformizationRecommendation.shouldPlatformize ? "Yes" : "No"} - ${rag.platformizationRecommendation.reason}`
    );
  }

  lines.push(
    "",
    `## ${locale === "zh-CN" ? "建议" : "Recommendations"}`,
    "",
    ...renderMarkdownList(report.recommendations, "No recommendations.")
  );

  return `${lines.join("\n")}\n`;
}

function renderDataQuality(report: InsightReport, locale: SupportedLocale): string {
  const title = locale === "zh-CN" ? "数据质量" : "Data Quality";
  const empty = locale === "zh-CN" ? "没有数据质量警告。" : "No data quality warnings.";
  const items = report.dataQuality.length
    ? report.dataQuality
        .map(
          (item) => `<li class="rounded-lg bg-amber-50 px-3 py-2"><span class="font-medium">${escapeHtml(item.source)}:</span> ${escapeHtml(item.status)} - ${escapeHtml(item.reason)}</li>`
        )
        .join("\n")
    : `<li class="rounded-lg bg-emerald-50 px-3 py-2">${escapeHtml(empty)}</li>`;
  return `<section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
    <h2 class="text-xl font-semibold">${escapeHtml(title)}</h2>
    <ul class="mt-4 space-y-2 text-sm leading-6 text-zinc-700">${items}</ul>
  </section>`;
}

function renderTopicOverview(report: InsightReport, locale: SupportedLocale): string {
  const title = locale === "zh-CN" ? "专题概览" : "Topic Overview";
  const rows = report.deepTopics
    .map(
      (topic) => `<tr class="border-t border-zinc-200"><td class="px-3 py-2 font-medium">${escapeHtml(topic.topic)}</td><td class="px-3 py-2">${topic.mentionedProjects}/${topic.totalProjects}</td><td class="px-3 py-2">${escapeHtml(JSON.stringify(topic.maturityDistribution))}</td></tr>`
    )
    .join("\n");
  return `<section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
    <h2 class="text-xl font-semibold">${escapeHtml(title)}</h2>
    <div class="mt-4 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead><tr><th class="px-3 py-2">Topic</th><th class="px-3 py-2">Mentions</th><th class="px-3 py-2">Maturity</th></tr></thead>
        <tbody>${rows || `<tr><td class="px-3 py-2" colspan="3">No deep topic reports.</td></tr>`}</tbody>
      </table>
    </div>
  </section>`;
}

function renderRagDeepDive(topic: DeepTopicReport, locale: SupportedLocale): string {
  const title = locale === "zh-CN" ? "RAG 深度分析" : "RAG Deep Dive";
  const projectRows = topic.projectMaturity
    .map(
      (project) => `<tr class="border-t border-zinc-200 align-top">
        <td class="px-3 py-2 font-medium">${escapeHtml(project.projectName)}</td>
        <td class="px-3 py-2">${escapeHtml(project.maturity)}</td>
        <td class="px-3 py-2">${project.implementedDimensions.length}</td>
        <td class="px-3 py-2">${escapeHtml(project.missingDimensions.slice(0, 5).join(", "))}</td>
      </tr>`
    )
    .join("\n");
  const evidence = topic.projectMaturity
    .flatMap((project) => project.evidence.slice(0, 4))
    .map(
      (item) => `<li class="rounded-lg bg-zinc-50 px-3 py-2"><span class="font-medium">${escapeHtml(item.projectName)} / ${escapeHtml(item.filePath)}</span><br><span class="text-zinc-600">${escapeHtml(item.snippet)}</span></li>`
    )
    .join("\n");

  return `<section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
    <h2 class="text-xl font-semibold">${escapeHtml(title)}</h2>
    <p class="mt-3 text-sm leading-6 text-zinc-700">${topic.mentionedProjects} of ${topic.totalProjects} projects contain RAG evidence.</p>
    <div class="mt-5 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead><tr><th class="px-3 py-2">Project</th><th class="px-3 py-2">Maturity</th><th class="px-3 py-2">Dimensions</th><th class="px-3 py-2">Missing</th></tr></thead>
        <tbody>${projectRows}</tbody>
      </table>
    </div>
    <h3 class="mt-6 text-lg font-semibold">Recommended Architecture</h3>
    <p class="mt-2 text-sm leading-6 text-zinc-700">${escapeHtml(topic.recommendedArchitecture.stages.join(" -> "))}</p>
    <h3 class="mt-6 text-lg font-semibold">Evidence</h3>
    <ul class="mt-3 space-y-2 text-sm leading-6">${evidence}</ul>
  </section>`;
}

function renderTrend(report: InsightReport, locale: SupportedLocale): string {
  const title = locale === "zh-CN" ? "趋势" : "Trend";
  return `<section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
    <h2 class="text-xl font-semibold">${escapeHtml(title)}</h2>
    <p class="mt-3 text-sm leading-6 text-zinc-700">${escapeHtml(report.trend.message)}</p>
  </section>`;
}

function renderRecommendations(report: InsightReport, locale: SupportedLocale): string {
  const title = locale === "zh-CN" ? "建议" : "Recommendations";
  return `<section class="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
    <h2 class="text-xl font-semibold">${escapeHtml(title)}</h2>
    <ul class="mt-4 space-y-2 text-sm leading-6 text-zinc-700">
      ${report.recommendations.map((item) => `<li class="rounded-lg bg-zinc-50 px-3 py-2">${escapeHtml(item)}</li>`).join("\n")}
    </ul>
  </section>`;
}

function metricCard(label: string, value: string): string {
  return `<article class="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
    <p class="text-sm font-medium text-zinc-500">${escapeHtml(label)}</p>
    <p class="mt-3 text-3xl font-semibold text-zinc-950">${escapeHtml(value)}</p>
  </article>`;
}

function renderMarkdownList(items: string[], empty: string): string[] {
  return items.length ? items.map((item) => `- ${item}`) : [`- ${empty}`];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
