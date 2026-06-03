import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateInsightsReport } from "../src/index.js";

const workspacePath = resolve(
  fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url))
);

describe("report contract", () => {
  it("generates a stable schema 2 workspace report with deep RAG analysis", async () => {
    const report = await generateInsightsReport({
      mode: "workspace",
      locale: "zh-CN",
      workspacePath,
      deep: true,
      topics: ["rag"],
      save: false,
      now: "2026-06-02T12:00:00.000Z"
    });

    expect(report.schemaVersion).toBe("3.0");
    expect(report.dataQuality).toEqual(expect.any(Array));
    expect(report.scanSummary).toMatchObject({
      mode: "workspace",
      workspacePath,
      projectsScanned: 5
    });
    expect(report.metrics.testsRunKnown).toBe(false);
    expect(report.metrics.testsRunCount).toBeUndefined();
    expect(report.deepTopics[0]).toMatchObject({
      topic: "rag",
      projectMaturity: expect.any(Array),
      recommendedArchitecture: expect.any(Object),
      platformizationRecommendation: expect.any(Object)
    });
  });
});
