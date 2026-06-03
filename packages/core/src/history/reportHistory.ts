import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { InsightReport } from "../insights/reportModel.js";

export interface SaveReportSnapshotInput {
  report: InsightReport;
  html?: string;
  markdown?: string;
  reportsDir?: string;
}

export interface SavedReportSnapshot {
  jsonPath: string;
  htmlPath?: string;
  markdownPath?: string;
  latestJsonPath: string;
  latestHtmlPath?: string;
  latestMarkdownPath?: string;
}

export const defaultReportsDir = ".codex-insights/reports";

export function createReportFileBase(report: InsightReport): string {
  const timestamp = report.generatedAt
    .replace(/\.\d{3}Z$/, "")
    .replace(/:/g, "-");
  return `${timestamp}_${sanitizeFilePart(report.scanSummary.mode)}_${report.locale}`;
}

export async function saveReportSnapshot(
  input: SaveReportSnapshotInput
): Promise<SavedReportSnapshot> {
  const reportsDir = input.reportsDir ?? defaultReportsDir;
  await mkdir(reportsDir, { recursive: true });

  const fileBase = createReportFileBase(input.report);
  const jsonPath = join(reportsDir, `${fileBase}.json`);
  const htmlPath = input.html ? join(reportsDir, `${fileBase}.html`) : undefined;
  const markdownPath = input.markdown ? join(reportsDir, `${fileBase}.md`) : undefined;
  const latestJsonPath = join(reportsDir, `latest.${input.report.locale}.json`);
  const latestHtmlPath = input.html ? join(reportsDir, `latest.${input.report.locale}.html`) : undefined;
  const latestMarkdownPath = input.markdown ? join(reportsDir, `latest.${input.report.locale}.md`) : undefined;

  const json = `${JSON.stringify(input.report, null, 2)}\n`;
  await writeFile(jsonPath, json, "utf8");
  await writeFile(latestJsonPath, json, "utf8");
  if (input.html && htmlPath) {
    await writeFile(htmlPath, input.html, "utf8");
    if (latestHtmlPath) {
      await writeFile(latestHtmlPath, input.html, "utf8");
    }
  }
  if (input.markdown && markdownPath) {
    await writeFile(markdownPath, input.markdown, "utf8");
    if (latestMarkdownPath) {
      await writeFile(latestMarkdownPath, input.markdown, "utf8");
    }
  }

  return {
    jsonPath,
    htmlPath,
    markdownPath,
    latestJsonPath,
    latestHtmlPath,
    latestMarkdownPath
  };
}

export async function loadLatestComparableReport(
  current: InsightReport,
  reportsDir = defaultReportsDir
): Promise<InsightReport | undefined> {
  let entries: string[];

  try {
    entries = await readdir(reportsDir);
  } catch {
    return undefined;
  }

  const reports = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".json"))
      .map(async (entry) => readReportJson(join(reportsDir, entry)))
  );

  return reports
    .filter((report): report is InsightReport => report !== undefined)
    .filter((report) => isComparable(report, current))
    .filter((report) => report.generatedAt < current.generatedAt)
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))[0];
}

async function readReportJson(path: string): Promise<InsightReport | undefined> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as InsightReport;
    return parsed.schemaVersion === "3.0" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isComparable(left: InsightReport, right: InsightReport): boolean {
  return (
    left.locale === right.locale &&
    left.scanSummary.mode === right.scanSummary.mode &&
    comparablePath(left) === comparablePath(right)
  );
}

function comparablePath(report: InsightReport): string {
  return (
    report.scanSummary.workspacePath ??
    report.scanSummary.repoPath ??
    report.repository.root
  );
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
}
