import {
  analyzeSession,
  renderInsightsReport,
  resolveLocale,
  saveReportSnapshot,
  supportedLocales,
  type SupportedLocale
} from "../../core/src/index.js";

export interface SessionInsightsArgs {
  locale?: string;
  save?: boolean;
  cwd?: string;
  now?: string;
}

export interface SessionInsightsResult {
  locale: SupportedLocale;
  format: "html";
  content: string;
  saved?: {
    jsonPath: string;
    htmlPath: string;
  };
}

export function listSupportedLocales(): {
  locales: SupportedLocale[];
  fallbackLocale: SupportedLocale;
} {
  return {
    locales: [...supportedLocales],
    fallbackLocale: "en-US"
  };
}

export async function getSessionInsights(
  args: SessionInsightsArgs = {}
): Promise<SessionInsightsResult> {
  const cwd = args.cwd ?? process.cwd();
  const resolved = resolveLocale({
    requestedLocale: args.locale ?? "auto",
    envLocale: process.env.LANG
  });
  const report = analyzeSession({
    sessionId: "current-session",
    repository: {
      root: cwd,
      name: cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? "workspace"
    },
    generatedAt: args.now ?? new Date().toISOString(),
    locale: resolved.locale,
    toolCalls: [],
    filesTouched: [],
    testsRun: 0,
    warnings: []
  });
  const content = renderInsightsReport(report, resolved.locale);
  const saved =
    args.save === false ? undefined : await saveReportSnapshot({ report, html: content });

  return {
    locale: resolved.locale,
    format: "html",
    content,
    saved
  };
}
