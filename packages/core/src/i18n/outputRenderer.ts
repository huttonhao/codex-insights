import type { InsightMetrics, InsightReport } from "../insights/reportModel.js";
import type { SupportedLocale } from "./localeResolver.js";
import { getMessageCatalog } from "./messageCatalog.js";

const metricOrder: Array<keyof InsightMetrics> = [
  "toolCalls",
  "filesTouched",
  "testsRun",
  "warnings"
];

export function renderInsightsReport(
  report: InsightReport,
  locale: SupportedLocale = report.locale
): string {
  const catalog = getMessageCatalog(locale);
  const htmlLang = locale;

  return `<!doctype html>
<html lang="${htmlLang}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(catalog.title)} - ${escapeHtml(report.repository.name)}</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="bg-slate-50 text-slate-950 antialiased">
    <main class="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-8 sm:px-8 lg:px-10">
      <header class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="text-sm font-medium uppercase tracking-wide text-cyan-700">${escapeHtml(report.repository.name)}</p>
            <h1 class="mt-2 text-3xl font-semibold text-slate-950">${escapeHtml(catalog.title)}</h1>
            <h2 class="mt-5 text-lg font-semibold text-slate-950">${escapeHtml(catalog.sections.summary)}</h2>
            <p class="mt-3 max-w-3xl text-base leading-7 text-slate-600">${escapeHtml(report.summary.narrative)}</p>
          </div>
          <dl class="grid gap-2 text-sm text-slate-600">
            <div><dt class="inline font-medium text-slate-900">Session</dt><dd class="inline"> ${escapeHtml(report.sessionId)}</dd></div>
            <div><dt class="inline font-medium text-slate-900">Generated</dt><dd class="inline"> ${escapeHtml(report.generatedAt)}</dd></div>
          </dl>
        </div>
      </header>

      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" class="text-xl font-semibold text-slate-950">${escapeHtml(catalog.sections.metrics)}</h2>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          ${renderMetrics(report.metrics, catalog)}
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-950">${escapeHtml(catalog.sections.trend)}</h2>
          <div class="mt-4 text-sm leading-6 text-slate-700">${renderTrend(report, catalog)}</div>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-xl font-semibold text-slate-950">${escapeHtml(catalog.sections.recommendations)}</h2>
          ${renderRecommendations(report, catalog)}
        </article>
      </section>
    </main>
  </body>
</html>`;
}

function renderMetrics(
  metrics: InsightMetrics,
  catalog: ReturnType<typeof getMessageCatalog>
): string {
  return metricOrder
    .map(
      (key) => `<article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">${escapeHtml(catalog.metrics[key])}</p>
            <p class="mt-3 text-3xl font-semibold text-slate-950">${metrics[key]}</p>
          </article>`
    )
    .join("\n");
}

function renderTrend(
  report: InsightReport,
  catalog: ReturnType<typeof getMessageCatalog>
): string {
  if (report.trend.kind === "baseline") {
    return `<p>${escapeHtml(catalog.trend.baseline)}</p>`;
  }

  const deltas = Object.entries(report.trend.deltas);
  if (deltas.length === 0) {
    return `<p>${escapeHtml(catalog.trend.comparison)}</p>`;
  }

  return [
    `<p>${escapeHtml(catalog.trend.comparison)}</p>`,
    '<ul class="mt-3 space-y-2">',
    ...deltas.map(([key, value]) => {
      const metricKey = key as keyof InsightMetrics;
      const signedValue = Number(value) >= 0 ? `+${value}` : `${value}`;
      return `<li class="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2"><span>${escapeHtml(catalog.metrics[metricKey])}</span><span class="font-semibold text-slate-950">${signedValue}</span></li>`;
    }),
    "</ul>"
  ].join("\n");
}

function renderRecommendations(
  report: InsightReport,
  catalog: ReturnType<typeof getMessageCatalog>
): string {
  const items =
    report.recommendations.length > 0
      ? report.recommendations
      : [catalog.emptyRecommendations];

  return `<ul class="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            ${items
              .map(
                (item) =>
                  `<li class="rounded-lg bg-slate-50 px-3 py-2">${escapeHtml(item)}</li>`
              )
              .join("\n")}
          </ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
