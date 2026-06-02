import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { InsightReport } from "../insights/reportModel.js";

export interface SaveReportSnapshotInput {
  report: InsightReport;
  html: string;
  reportsDir?: string;
}

export interface SavedReportSnapshot {
  jsonPath: string;
  htmlPath: string;
}

export const defaultReportsDir = ".codex-insights/reports";

export function createReportFileBase(report: InsightReport): string {
  const timestamp = report.generatedAt
    .replace(/\.\d{3}Z$/, "")
    .replace(/:/g, "-");
  return `${timestamp}_${sanitizeFilePart(report.sessionId)}_${report.locale}`;
}

export async function saveReportSnapshot(
  input: SaveReportSnapshotInput
): Promise<SavedReportSnapshot> {
  const reportsDir = input.reportsDir ?? defaultReportsDir;
  await mkdir(reportsDir, { recursive: true });

  const fileBase = createReportFileBase(input.report);
  const jsonPath = join(reportsDir, `${fileBase}.json`);
  const htmlPath = join(reportsDir, `${fileBase}.html`);

  await writeFile(jsonPath, `${JSON.stringify(input.report, null, 2)}\n`, "utf8");
  await writeFile(htmlPath, input.html, "utf8");

  return { jsonPath, htmlPath };
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
    .filter((report) => report.repository.root === current.repository.root)
    .filter((report) => report.generatedAt < current.generatedAt)
    .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt))[0];
}

async function readReportJson(path: string): Promise<InsightReport | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as InsightReport;
  } catch {
    return undefined;
  }
}

function sanitizeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}
