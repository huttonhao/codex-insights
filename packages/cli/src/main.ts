#!/usr/bin/env node
import { Command } from "commander";
import {
  compareReportTrends,
  generateInsightsReport,
  loadLatestComparableReport,
  renderInsightsHtml,
  renderInsightsMarkdown,
  resolveLocale,
  runDoctor,
  saveReportSnapshot,
  supportedLocales,
  type SupportedLocale
} from "../../core/src/index.js";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

type ReportFormat = "html" | "json" | "markdown" | "all";
type ReportScope = "full" | "repo" | "workspace" | "codex-history" | "session";

export async function runCli(argv: string[]): Promise<CliResult> {
  let stdout = "";
  let stderr = "";

  const program = new Command()
    .name("codex-insights")
    .description("Generate localized Codex insight reports.")
    .exitOverride()
    .configureOutput({
      writeOut: (value) => {
        stdout += value;
      },
      writeErr: (value) => {
        stderr += value;
      }
    });

  program
    .command("locales")
    .description("List supported output locales.")
    .action(() => {
      stdout += `${supportedLocales.join("\n")}\n`;
    });

  program
    .command("doctor")
    .description("Check whether Codex Insights can run.")
    .action(async () => {
      const result = await runDoctor({ cwd: process.cwd() });
      stdout += result.checks
        .map((check) => `${check.name}: ${check.ok ? "ok" : "warn"} - ${check.message}`)
        .join("\n");
      stdout += "\n";
    });

  program
    .command("report")
    .description("Generate an insight report.")
    .option("--locale <locale>", "Output locale.", "en-US")
    .option("--format <format>", "Output format: html, json, markdown, or all.", "all")
    .option("--scope <scope>", "Report scope: full, repo, workspace, codex-history, or session.")
    .option("--save", "Save report files.", true)
    .option("--no-save", "Do not save report files.")
    .option("--deep", "Run deep topic analysis.", false)
    .option("--workspace <path>", "Scan a workspace containing multiple projects.")
    .option("--repo <path>", "Analyze one repository.")
    .option("--codex-history", "Analyze Codex JSONL session history.", false)
    .option("--sessions-dir <path>", "Codex sessions directory.")
    .option("--limit <count>", "Maximum session files to parse.", parseInteger)
    .option("--min-user-messages <count>", "Minimum user messages for a qualifying session.", parseInteger)
    .option("--min-duration-minutes <minutes>", "Minimum duration for a qualifying session.", parseNumber)
    .option("--dry-run", "Parse session history without LLM facet extraction.", false)
    .option("--no-llm", "Disable LLM facet extraction.")
    .option("--llm-facets", "Use codex exec to extract session facets.", false)
    .option("--redact", "Redact secrets in transcript snippets.", true)
    .option("--no-transcript-snippets", "Do not include transcript snippets.")
    .option("--session-file <path>", "Read a Codex session JSON file.")
    .option("--session-json <json>", "Read Codex session JSON from an argument.")
    .option("--topics <topics>", "Comma-separated deep topics.")
    .option("--max-projects <count>", "Maximum projects to scan.", parseInteger)
    .option("--max-files-per-project <count>", "Maximum files per project.", parseInteger)
    .option("--max-file-bytes <bytes>", "Maximum bytes per file.", parseInteger)
    .option("--include <patterns>", "Comma-separated include substrings.")
    .option("--exclude <patterns>", "Comma-separated exclude substrings.")
    .action(async (options: {
      locale: string;
      format: string;
      scope?: string;
      save: boolean;
      deep: boolean;
      workspace?: string;
      repo?: string;
      codexHistory?: boolean;
      sessionsDir?: string;
      limit?: number;
      minUserMessages?: number;
      minDurationMinutes?: number;
      dryRun?: boolean;
      llm?: boolean;
      llmFacets?: boolean;
      redact?: boolean;
      transcriptSnippets?: boolean;
      sessionFile?: string;
      sessionJson?: string;
      topics?: string;
      maxProjects?: number;
      maxFilesPerProject?: number;
      maxFileBytes?: number;
      include?: string;
      exclude?: string;
    }) => {
      const format = parseFormat(options.format);
      const scope = parseScope(options.scope ?? inferScope(options));
      const resolved = resolveLocale({
        requestedLocale: options.locale,
        envLocale: options.locale === "auto" ? process.env.LANG : undefined
      });
      const mode = scope;
      const report = await generateInsightsReport({
        mode,
        locale: resolved.locale,
        repoPath: options.repo,
        workspacePath: options.workspace ?? (scope === "full" ? process.env.CODEX_INSIGHTS_WORKSPACE : undefined),
        codexHistory: options.codexHistory || scope === "codex-history" || scope === "full",
        sessionsDir: options.sessionsDir,
        limit: options.limit,
        minUserMessages: options.minUserMessages,
        minDurationMinutes: options.minDurationMinutes,
        dryRun: options.dryRun,
        noLlm: options.llm === false,
        llmFacets: options.llmFacets,
        redact: options.redact,
        includeTranscriptSnippets: options.transcriptSnippets !== false,
        sessionFile: options.sessionFile,
        sessionJson: options.sessionJson,
        deep: options.deep || scope === "full" || scope === "workspace",
        topics: splitCsv(options.topics),
        maxProjects: options.maxProjects,
        maxFilesPerProject: options.maxFilesPerProject,
        maxFileBytes: options.maxFileBytes,
        include: splitCsv(options.include),
        exclude: splitCsv(options.exclude)
      });
      const previous = await loadLatestComparableReport(report);
      if (previous) {
        report.trend = compareReportTrends(previous, report);
      }

      const html = format === "html" || format === "all" || options.save
        ? renderInsightsHtml(report, resolved.locale)
        : undefined;
      const markdown =
        format === "markdown" || format === "all" || options.save
          ? renderInsightsMarkdown(report, resolved.locale)
          : undefined;

      if (options.save) {
        const saved = await saveReportSnapshot({
          report,
          html: format === "json" ? undefined : html,
          markdown: format === "json" || format === "html" ? undefined : markdown
        });
        stdout += [
          `Codex Insights ${scope} report generated.`,
          saved.htmlPath ? `HTML: ${saved.htmlPath}` : undefined,
          saved.markdownPath ? `Markdown: ${saved.markdownPath}` : undefined,
          `JSON: ${saved.jsonPath}`,
          saved.latestHtmlPath ? `Latest HTML: ${saved.latestHtmlPath}` : undefined,
          saved.latestMarkdownPath ? `Latest Markdown: ${saved.latestMarkdownPath}` : undefined,
          `Latest JSON: ${saved.latestJsonPath}`,
          `Mode: ${report.scanSummary.mode}`,
          `Locale: ${resolved.locale}`,
          `Projects scanned: ${report.scanSummary.projectsScanned}`,
          `Sessions parsed: ${report.codexHistory?.parsedSessions ?? 0}`,
          `Deep topics: ${report.deepTopics.map((topic) => topic.topic).join(", ") || "none"}`,
          `Warnings: ${report.dataQuality.length + (report.anomalies?.length ?? 0)}`
        ].filter(Boolean).join("\n");
        stdout += "\n";
        return;
      }

      if (format === "json") {
        stdout += `${JSON.stringify(report, null, 2)}\n`;
        return;
      }
      if (format === "markdown") {
        stdout += markdown ?? renderInsightsMarkdown(report, resolved.locale);
        return;
      }
      if (format === "all") {
        stdout += [
          `Codex Insights ${scope} report generated.`,
          `Mode: ${report.scanSummary.mode}`,
          `Locale: ${resolved.locale}`,
          `Projects scanned: ${report.scanSummary.projectsScanned}`,
          `Sessions parsed: ${report.codexHistory?.parsedSessions ?? 0}`,
          `Deep topics: ${report.deepTopics.map((topic) => topic.topic).join(", ") || "none"}`,
          `Warnings: ${report.dataQuality.length + (report.anomalies?.length ?? 0)}`
        ].join("\n");
        stdout += "\n";
        return;
      }
      stdout += html ?? renderInsightsHtml(report, resolved.locale);
    });

  try {
    await program.parseAsync(argv, { from: "user" });
    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exitCode: 1, stdout, stderr: stderr || `${message}\n` };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runCli(process.argv.slice(2));
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exitCode = result.exitCode;
}

function parseInteger(value: string): number {
  return Number.parseInt(value, 10);
}

function parseNumber(value: string): number {
  return Number.parseFloat(value);
}

function parseFormat(value: string): ReportFormat {
  if (value === "html" || value === "json" || value === "markdown" || value === "all") {
    return value;
  }
  throw new Error(`Unsupported format: ${value}`);
}

function parseScope(value: string): ReportScope {
  if (
    value === "full" ||
    value === "repo" ||
    value === "workspace" ||
    value === "codex-history" ||
    value === "session"
  ) {
    return value;
  }
  throw new Error(`Unsupported scope: ${value}`);
}

function inferScope(options: {
  workspace?: string;
  repo?: string;
  codexHistory?: boolean;
  sessionFile?: string;
  sessionJson?: string;
}): ReportScope {
  if (options.sessionFile || options.sessionJson) return "session";
  if (options.repo) return "repo";
  if (options.codexHistory) return "codex-history";
  if (options.workspace) return "workspace";
  return "full";
}

function splitCsv(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export type { SupportedLocale };
