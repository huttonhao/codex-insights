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

type ReportFormat = "html" | "json" | "markdown";

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
    .option("--locale <locale>", "Output locale.", "auto")
    .option("--format <format>", "Output format: html, json, or markdown.", "html")
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
      const resolved = resolveLocale({
        requestedLocale: options.locale,
        envLocale: process.env.LANG
      });
      const mode = options.workspace
        ? "workspace"
        : options.codexHistory
          ? "codex-history"
        : options.sessionFile || options.sessionJson
          ? "session"
          : "repo";
      const report = await generateInsightsReport({
        mode,
        locale: resolved.locale,
        repoPath: options.repo,
        workspacePath: options.workspace,
        codexHistory: options.codexHistory,
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
        deep: options.deep,
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

      const html = format === "html" || options.save ? renderInsightsHtml(report, resolved.locale) : undefined;
      const markdown =
        format === "markdown" ? renderInsightsMarkdown(report, resolved.locale) : undefined;

      if (options.save) {
        await saveReportSnapshot({ report, html, markdown });
      }

      if (format === "json") {
        stdout += `${JSON.stringify(report, null, 2)}\n`;
        return;
      }
      if (format === "markdown") {
        stdout += markdown ?? renderInsightsMarkdown(report, resolved.locale);
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
  if (value === "html" || value === "json" || value === "markdown") {
    return value;
  }
  throw new Error(`Unsupported format: ${value}`);
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
