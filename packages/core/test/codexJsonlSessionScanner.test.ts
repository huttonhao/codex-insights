import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanCodexJsonlSessionFiles } from "../src/index.js";

const sessionsDir = fileURLToPath(new URL("./fixtures/codex-sessions/", import.meta.url));

describe("codex JSONL session scanner", () => {
  it("finds rollout JSONL files recursively and applies limit", async () => {
    const scan = await scanCodexJsonlSessionFiles({ sessionsDir, limit: 2 });

    expect(scan.files).toHaveLength(2);
    expect(scan.files.every((file) => /rollout-.*\.jsonl$/.test(file))).toBe(true);
    expect(scan.dataQuality).toEqual([]);
  });

  it("marks a missing sessions directory through dataQuality", async () => {
    const scan = await scanCodexJsonlSessionFiles({ sessionsDir: `${sessionsDir}/missing` });

    expect(scan.files).toEqual([]);
    expect(scan.dataQuality[0]).toMatchObject({
      source: "codex-history",
      status: "missing"
    });
  });
});
