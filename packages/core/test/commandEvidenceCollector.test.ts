import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectCodexSession, collectCommandEvidence } from "../src/index.js";

const fixturesDir = fileURLToPath(new URL("./fixtures/", import.meta.url));

describe("collectCommandEvidence", () => {
  it("classifies test and build commands from a session file", async () => {
    const session = await collectCodexSession({
      sessionFile: `${fixturesDir}session-with-tools.json`
    });
    const evidence = await collectCommandEvidence({
      session: session.session
    });

    expect(evidence.testsRunKnown).toBe(true);
    expect(evidence.testsRunCount).toBe(1);
    expect(evidence.testCommands.map((command) => command.command)).toContain("npm test");
    expect(evidence.buildCommands.map((command) => command.command)).toContain("npm run build");
    expect(evidence.dataQuality.every((item) => item.status !== "unavailable")).toBe(true);
  });

  it("discovers package scripts without claiming they were executed", async () => {
    const evidence = await collectCommandEvidence({
      repoPath: fileURLToPath(new URL("./fixtures/workspace-rag/rag-partial/", import.meta.url))
    });

    expect(evidence.testsRunKnown).toBe(false);
    expect(evidence.testsRunCount).toBeUndefined();
    expect(evidence.testCommands).toContainEqual(
      expect.objectContaining({
        command: "npm run test",
        source: "package.json"
      })
    );
    expect(evidence.unknownReason).toContain("No executed test command");
  });

  it("records failed test commands as known evidence", async () => {
    const session = await collectCodexSession({
      sessionFile: `${fixturesDir}session-with-failures.json`
    });
    const evidence = await collectCommandEvidence({
      session: session.session
    });

    expect(evidence.testsRunKnown).toBe(true);
    expect(evidence.testsRunCount).toBe(1);
    expect(evidence.testCommands[0]).toMatchObject({
      command: "pnpm test",
      exitCode: 1
    });
  });
});
