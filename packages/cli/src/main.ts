#!/usr/bin/env node
import { Command } from "commander";
import {
  analyzeSession,
  renderInsightsReport,
  resolveLocale,
  saveReportSnapshot,
  supportedLocales,
  type SupportedLocale
} from "../../core/src/index.js";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

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
    .action(() => {
      stdout += "Codex Insights CLI is installed.\n";
    });

  program
    .command("report")
    .description("Generate an insight report.")
    .option("--locale <locale>", "Output locale.", "auto")
    .option("--format <format>", "Output format: html or json.", "html")
    .option("--save", "Save report files.", true)
    .option("--no-save", "Do not save report files.")
    .action(async (options: { locale: string; format: string; save: boolean }) => {
      const resolved = resolveLocale({
        requestedLocale: options.locale,
        envLocale: process.env.LANG
      });
      const report = analyzeSession({
        sessionId: "current-session",
        repository: {
          root: process.cwd(),
          name: process.cwd().split(/[\\/]/).filter(Boolean).at(-1) ?? "workspace"
        },
        generatedAt: new Date().toISOString(),
        locale: resolved.locale,
        toolCalls: [],
        filesTouched: [],
        testsRun: 0,
        warnings: []
      });

      if (options.format === "json") {
        stdout += `${JSON.stringify(report, null, 2)}\n`;
        return;
      }

      const html = renderInsightsReport(report, resolved.locale);
      if (options.save) {
        await saveReportSnapshot({ report, html });
      }
      stdout += html;
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

export type { SupportedLocale };
