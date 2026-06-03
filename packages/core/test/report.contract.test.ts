import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { generateInsightsReport } from "../src/index.js";

const workspacePath = resolve(
  fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url))
);

describe("report.contract", () => {
  it("keeps schema 2 workspace reports stable and includes per-project command evidence", async () => {
    const report = await generateInsightsReport({
      mode: "workspace",
      locale: "zh-CN",
      workspacePath,
      deep: true,
      topics: ["rag"],
      save: false,
      now: "2026-06-03T08:00:00.000Z"
    });

    expect(report.schemaVersion).toBe("2.0");
    expect(report.scanSummary).toMatchObject({
      mode: "workspace",
      workspacePath,
      projectsScanned: 5
    });
    expect(report.metrics.testsRunKnown).toBe(false);
    expect(report.metrics.testCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: "npm run test",
          source: "package.json"
        }),
        expect.objectContaining({
          command: "test file: tests/rag.test.ts",
          source: "test-file"
        })
      ])
    );
    expect(report.projects.find((project) => project.name === "rag-production-like")?.commandEvidence?.testCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "ci" }),
        expect.objectContaining({ source: "test-file" })
      ])
    );
    expect(report.deepTopics[0]).toMatchObject({
      topic: "rag",
      maturityDistribution: {
        mention_only: 1,
        design_only: 1,
        prototype: 1,
        partial: 1,
        production_ready: 1
      },
      platformizationRecommendation: {
        shouldPlatformize: true
      }
    });
    expect(report.deepTopics[0]?.crossProjectFindings[0]).toContain("在扫描的");
  });
});
