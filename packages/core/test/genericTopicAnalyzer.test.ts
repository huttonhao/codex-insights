import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  analyzeGenericTopicProjects,
  generateInsightsReport,
  scanWorkspace
} from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-generic/", import.meta.url));

describe("generic topic analyzer", () => {
  it("returns a deep report for each requested non-RAG topic", async () => {
    const report = await generateInsightsReport({
      mode: "workspace",
      locale: "zh-CN",
      workspacePath,
      deep: true,
      topics: ["agent", "llm-gateway"],
      save: false
    });

    expect(report.deepTopics.map((topic) => topic.topic)).toEqual(["agent", "llm-gateway"]);
    expect(report.deepTopics[0]?.mentionedProjects).toBe(5);
    expect(report.deepTopics[0]?.maturityDistribution).toMatchObject({
      mention_only: 1,
      design_only: 1,
      prototype: 1,
      partial: 1,
      production_ready: 1
    });
    expect(report.deepTopics[0]?.crossProjectFindings[0]).toContain("在扫描的");
  });

  it("includes evidence, reference projects, and platformization recommendation", async () => {
    const scan = await scanWorkspace({ workspacePath, topics: ["agent"] });
    const topic = analyzeGenericTopicProjects(scan.projects, "agent", "zh-CN");

    expect(topic.projectMaturity[0]?.evidence.length).toBeGreaterThan(0);
    expect(topic.recommendedReferenceProjects).toContain("agent-production-like");
    expect(topic.platformizationRecommendation.shouldPlatformize).toBe(true);
  });
});
