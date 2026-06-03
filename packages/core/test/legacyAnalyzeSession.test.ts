import { describe, expect, it } from "vitest";
import { analyzeSession, type SessionInsightInput } from "../src/index.js";

describe("legacy analyzeSession", () => {
  it("is retained only as a deprecated compatibility helper", () => {
    const input: SessionInsightInput = {
      sessionId: "legacy",
      repository: { root: "/repo", name: "repo" },
      generatedAt: "2026-06-03T00:00:00.000Z",
      locale: "en-US",
      toolCalls: ["exec"],
      filesTouched: ["src/a.ts"],
      testsRun: 1,
      warnings: ["legacy compatibility fixture warning"]
    };

    const report = analyzeSession(input);

    expect(report.schemaVersion).toBe("3.0");
    expect(report.scanSummary.mode).toBe("session");
    expect(report.productInsights?.atAGlance.length).toBeGreaterThan(0);
  });
});
