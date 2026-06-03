import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildUsageAnalytics, parseCodexJsonlSessionFile } from "../src/index.js";
import type { ParsedCodexJsonlSession } from "../src/index.js";

const fixture = (path: string) => fileURLToPath(new URL(`./fixtures/codex-sessions/${path}`, import.meta.url));

describe("usage analytics", () => {
  it("aggregates session, command, model, project, line, and daily metrics without inventing unknowns", async () => {
    const oldSession = (await parseCodexJsonlSessionFile(fixture("old-format/rollout-old-1.jsonl"))).session;
    const newSession = (await parseCodexJsonlSessionFile(fixture("new-format/rollout-new-1.jsonl"))).session;
    const sessions = [oldSession, newSession].filter(
      (session): session is ParsedCodexJsonlSession => session !== undefined
    );
    const result = buildUsageAnalytics(sessions);

    expect(result.usageAnalytics.totalSessions).toBe(2);
    expect(result.usageAnalytics.activeDays).toBe(2);
    expect(result.usageAnalytics.totalMessages).toBeGreaterThan(0);
    expect(result.usageAnalytics.linesAdded).toBe(12);
    expect(result.usageAnalytics.linesRemoved).toBe(4);
    expect(result.usageAnalytics.commandStats?.failedCommands).toBe(1);
    expect(result.usageAnalytics.modelBreakdown?.some((item) => item.model === "gpt-5")).toBe(true);
  });
});
