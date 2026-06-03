import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCodexJsonlSessionFile } from "../src/index.js";

const fixture = (path: string) => fileURLToPath(new URL(`./fixtures/codex-sessions/${path}`, import.meta.url));

describe("codex JSONL session parser", () => {
  it("parses old rollout format", async () => {
    const result = await parseCodexJsonlSessionFile(fixture("old-format/rollout-old-1.jsonl"));

    expect(result.session).toMatchObject({
      sessionId: "old-session-1",
      projectName: "legacy-app",
      gitBranch: "main"
    });
    expect(result.session?.userPrompts).toContain("Fix the failing tests and explain the issue.");
    expect(result.session?.commands[0]).toMatchObject({ command: "npm test", exitCode: 1 });
    expect(result.session?.fileEdits[0]).toMatchObject({ path: "src/legacy.ts" });
    expect(result.session?.linesAdded).toBe(2);
    expect(result.session?.linesRemoved).toBe(1);
  });

  it("parses new rollout format with model, tool calls, edits, and token usage", async () => {
    const result = await parseCodexJsonlSessionFile(fixture("new-format/rollout-new-1.jsonl"));

    expect(result.session).toMatchObject({
      sessionId: "new-session-1",
      projectName: "rag-platform",
      model: "gpt-5",
      cliVersion: "0.50.0",
      inputTokens: 1200,
      outputTokens: 400,
      cacheReadTokens: 300,
      cacheCreationTokens: 100
    });
    expect(result.session?.toolCalls).toHaveLength(2);
    expect(result.session?.commands[0]).toMatchObject({ command: "npm run test", exitCode: 0 });
    expect(result.session?.fileEdits[0]).toMatchObject({ path: "src/evaluation.ts" });
  });

  it("records invalid JSONL through dataQuality without crashing", async () => {
    const result = await parseCodexJsonlSessionFile(fixture("invalid/rollout-invalid.jsonl"));

    expect(result.dataQuality[0]).toMatchObject({
      source: "codex-jsonl-parser",
      status: "partial"
    });
  });
});
