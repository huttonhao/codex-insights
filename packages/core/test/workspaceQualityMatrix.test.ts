import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateInsightsReport } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("workspace quality matrix", () => {
  it("adds per-project quality summaries and workspace quality totals", async () => {
    const report = await generateInsightsReport({
      mode: "workspace",
      locale: "zh-CN",
      workspacePath,
      deep: true,
      topics: ["rag"],
      save: false
    });

    const production = report.projects.find((project) => project.name === "rag-production-like");
    expect(production?.qualitySummary).toMatchObject({
      hasTestScript: true,
      hasCi: true,
      hasTestFiles: true,
      hasBuildConfig: true,
      testsRunKnown: false
    });
    expect(report.workspaceQuality).toMatchObject({
      projectsWithTestScript: 2,
      projectsWithCi: 1,
      projectsWithTestFiles: 1,
      projectsWithBuildConfig: 1
    });
    expect(report.metrics.workspaceQuality?.projectsWithCi).toBe(1);
  });
});
