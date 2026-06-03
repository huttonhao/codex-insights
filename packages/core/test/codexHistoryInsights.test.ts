import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectCodexSessionHistory, generateInsightsReport } from "../src/index.js";

const sessionsDir = fileURLToPath(new URL("./fixtures/codex-sessions/", import.meta.url));

describe("codex history insights", () => {
  it("collects, filters, aggregates, and keeps dry-run free of LLM dependency", async () => {
    const result = await collectCodexSessionHistory({
      sessionsDir,
      locale: "zh-CN",
      minUserMessages: 1,
      minDurationMinutes: 10,
      dryRun: true,
      noLlm: true
    });

    expect(result.codexHistory.scannedFiles).toBeGreaterThanOrEqual(4);
    expect(result.codexHistory.parsedSessions).toBeGreaterThanOrEqual(3);
    expect(result.codexHistory.qualifyingSessions).toBe(1);
    expect(result.sessionFacets[0]?.sourceSessionIds).toContain("new-session-1");
  });

  it("generates a schema 3 report with codexHistory and usageAnalytics", async () => {
    const report = await generateInsightsReport({
      mode: "codex-history",
      codexHistory: true,
      locale: "zh-CN",
      sessionsDir,
      dryRun: true,
      noLlm: true,
      save: false,
      now: "2026-06-03T09:00:00.000Z"
    });

    expect(report.schemaVersion).toBe("3.0");
    expect(report.codexHistory).toMatchObject({
      dryRun: true
    });
    expect(report.usageAnalytics?.totalSessions).toBeGreaterThan(0);
    expect(report.productInsights?.atAGlance[0]).toContain("Codex session");
  });
});
