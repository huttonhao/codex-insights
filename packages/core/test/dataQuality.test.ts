import { describe, expect, it } from "vitest";
import {
  createDataQualityRecord,
  hasUnavailableData,
  mergeDataQuality
} from "../src/index.js";

describe("data quality", () => {
  it("records missing data with attempted sources and a reason", () => {
    const record = createDataQualityRecord({
      source: "codex-session",
      status: "missing",
      reason: "No session file was provided and no environment candidate was readable.",
      attemptedSources: ["CODEX_SESSION_FILE", "CODEX_INSIGHTS_SESSION_FILE"]
    });

    expect(record).toMatchObject({
      source: "codex-session",
      status: "missing",
      attemptedSources: ["CODEX_SESSION_FILE", "CODEX_INSIGHTS_SESSION_FILE"]
    });
    expect(record.reason).toContain("No session file");
  });

  it("preserves unavailable data instead of converting unknown values into numeric zero", () => {
    const records = mergeDataQuality([
      createDataQualityRecord({
        source: "test-evidence",
        status: "unavailable",
        reason: "No command history or session file is available.",
        attemptedSources: ["session.commands", "package.json scripts"]
      })
    ]);

    expect(hasUnavailableData(records)).toBe(true);
    expect(records[0]).not.toHaveProperty("testsRunCount");
  });
});
