import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectCodexSession } from "../src/index.js";

const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url));

describe("collectCodexSession", () => {
  it("loads a session file with commands, tools, edits, and warnings", async () => {
    const result = await collectCodexSession({
      sessionFile: `${fixturesDir}session-with-tools.json`
    });

    expect(result.session?.sessionId).toBe("session-with-tools");
    expect(result.session?.commands.map((command) => command.command)).toContain("npm test");
    expect(result.session?.toolCalls[0]?.name).toBe("exec_command");
    expect(result.session?.fileEdits[0]?.path).toContain("outputRenderer");
    expect(result.dataQuality.every((item) => item.status !== "missing")).toBe(true);
  });

  it("accepts inline session JSON", async () => {
    const result = await collectCodexSession({
      sessionJson: JSON.stringify({
        sessionId: "inline-session",
        startedAt: "2026-06-02T08:00:00.000Z",
        userPrompts: ["inspect"],
        assistantActions: [],
        toolCalls: Array.from([]),
        commands: Array.from([]),
        fileEdits: Array.from([]),
        warnings: Array.from([])
      })
    });

    expect(result.session?.sessionId).toBe("inline-session");
  });

  it("marks session data as missing when no source is readable", async () => {
    const result = await collectCodexSession({
      candidateEnv: {},
      commonSearchRoots: []
    });

    expect(result.session).toBeUndefined();
    expect(result.dataQuality).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "codex-session",
          status: "missing"
        })
      ])
    );
  });
});
