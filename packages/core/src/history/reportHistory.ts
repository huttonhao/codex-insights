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
}

export const defaultReportsDir = ".codex-insights/reports";

export function createReportFileBase(report: InsightReport): string {
  const timestamp = report.generatedAt
    .replace(/\.\d{3}Z$/, "")
    .replace(/:/g, "-");
  const scope =
    report.scanSummary.workspacePath ??
    report.scanSummary.repoPath ??
    report.repository.root ??
    report.id;
  return `${timestamp}_${sanitizeFilePart(report.scanSummary.mode)}_${sanitizeFilePart(scope)}_${report.locale}`;
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

  await writeFile(jsonPath, `${JSON.stringify(input.report, null, 2)}\n`, "utf8");
  if (input.html && htmlPath) {
    await writeFile(htmlPath, input.html, "utf8");
  }
  if (input.markdown && markdownPath) {
    await writeFile(markdownPath, input.markdown, "utf8");
  }

  return { jsonPath, htmlPath, markdownPath };
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
    return parsed.schemaVersion === "2.0" ? parsed : undefined;
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
