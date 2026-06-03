import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateInsightsReport } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("report contract v3", () => {
  it("locks the schema 3 report shape for workspace reports", async () => {
    const report = await generateInsightsReport({
      mode: "workspace",
      locale: "zh-CN",
      workspacePath,
      deep: true,
      topics: ["rag", "agent", "llm-gateway"],
      save: false,
      now: "2026-06-03T10:00:00.000Z"
    });

    expect(report.schemaVersion).toBe("3.0");
    expect(report).toHaveProperty("dataQuality");
    expect(report).toHaveProperty("scanSummary");
    expect(report).toHaveProperty("metrics");
    expect(report).toHaveProperty("deepTopics");
    expect(report).toHaveProperty("workspaceQuality");
    expect(report).toHaveProperty("productInsights");
    expect(report.deepTopics.map((topic) => topic.topic)).toEqual(["rag", "agent", "llm-gateway"]);
    expect(report.deepTopics[0]).toHaveProperty("projectMaturity");
    expect(report.deepTopics[0]).toHaveProperty("recommendedArchitecture");
    expect(report.deepTopics[0]).toHaveProperty("platformizationRecommendation");
  });
});
