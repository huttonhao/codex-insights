import { describe, expect, it } from "vitest";
import { analyzeSession, type SessionInsightInput } from "../src/index.js";

describe("analyzeSession", () => {
  it("turns session metadata into a baseline insight report", () => {
    const input: SessionInsightInput = {
      sessionId: "session-1",
      repository: {
        root: "/repo",
        name: "codex-insights"
      },
      generatedAt: "2026-06-02T08:00:00.000Z",
      locale: "zh-CN",
      toolCalls: ["exec_command", "apply_patch", "exec_command"],
      filesTouched: ["package.json", "packages/core/src/index.ts"],
      testsRun: 5,
      warnings: ["One warning"]
    };

    const report = analyzeSession(input);

    expect(report).toMatchObject({
      id: "session-1-2026-06-02T08:00:00.000Z",
      sessionId: "session-1",
      locale: "zh-CN",
      metrics: {
        toolCalls: 3,
        filesTouched: 2,
        testsRunKnown: true,
        testsRunCount: 5,
        warnings: 1
      },
      trend: {
        kind: "baseline"
      }
    });
    expect(report.schemaVersion).toBe("2.0");
    expect(report.summary.narrative).toContain("3 tool calls");
    expect(report.recommendations).toContain(
      "Keep saving reports to build a useful trend history."
    );
  });

  it("records unknown test evidence when command evidence is absent", () => {
    const report = analyzeSession({
      sessionId: "session-2",
      repository: {
        root: "/repo",
        name: "codex-insights"
      },
      generatedAt: "2026-06-02T09:00:00.000Z",
      locale: "en-US",
      toolCalls: Array.from([]),
      filesTouched: Array.from([]),
      warnings: Array.from([])
    });

    expect(report.metrics.testsRunKnown).toBe(false);
    expect(report.metrics.testsRunCount).toBeUndefined();
    expect(report.dataQuality).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "test-evidence",
          status: "unavailable"
        })
      ])
    );
    expect(report.recommendations).toContain(
      "Capture session command evidence so future reports can distinguish unknown test execution from no test execution."
    );
  });
});
