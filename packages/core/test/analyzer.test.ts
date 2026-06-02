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
        testsRun: 5,
        warnings: 1
      },
      trend: {
        kind: "baseline"
      }
    });
    expect(report.summary.narrative).toContain("3 tool calls");
    expect(report.recommendations).toContain(
      "Review warnings before treating this session as complete."
    );
  });

  it("recommends adding tests when no tests were run", () => {
    const report = analyzeSession({
      sessionId: "session-2",
      repository: {
        root: "/repo",
        name: "codex-insights"
      },
      generatedAt: "2026-06-02T09:00:00.000Z",
      locale: "en-US",
      toolCalls: [],
      filesTouched: [],
      testsRun: 0,
      warnings: []
    });

    expect(report.recommendations).toContain(
      "Run a focused verification command before closing the work."
    );
  });
});
