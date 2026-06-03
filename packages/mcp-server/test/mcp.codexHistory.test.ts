import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getCodexHistoryInsights } from "../src/tools.js";

const sessionsDir = fileURLToPath(
  new URL("../../core/test/fixtures/codex-sessions/", import.meta.url)
);

describe("MCP Codex history insights", () => {
  it("returns report, dataQuality, markdown, and dry-run summary", async () => {
    const result = await getCodexHistoryInsights({
      locale: "zh-CN",
      sessionsDir,
      dryRun: true,
      noLlm: true,
      save: false,
      format: "markdown"
    });

    expect(result.report.schemaVersion).toBe("3.0");
    expect(result.report.codexHistory?.scannedFiles).toBeGreaterThanOrEqual(4);
    expect(result.dataQuality.length).toBeGreaterThan(0);
    expect(result.markdownSummary).toContain("## 总览");
    expect(result.dryRunSummary?.scannedFiles).toBeGreaterThanOrEqual(4);
  });
});
