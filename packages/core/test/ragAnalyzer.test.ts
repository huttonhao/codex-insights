import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeRagProjects, scanWorkspace } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("analyzeRagProjects", () => {
  it("classifies RAG maturity from evidence and dimensions", async () => {
    const scan = await scanWorkspace({
      workspacePath,
      topics: ["rag"]
    });
    const report = analyzeRagProjects(scan.projects);

    expect(report.topic).toBe("rag");
    expect(report.totalProjects).toBe(5);
    expect(report.mentionedProjects).toBe(5);
    expect(report.maturityDistribution).toMatchObject({
      mention_only: 1,
      design_only: 1,
      prototype: 1,
      partial: 1,
      production_ready: 1
    });
    expect(project(report, "rag-mention-only")?.maturity).toBe("mention_only");
    expect(project(report, "rag-design-only")?.maturity).toBe("design_only");
    expect(project(report, "rag-prototype")?.maturity).toBe("prototype");
    expect(project(report, "rag-prototype")?.maturity).not.toBe("partial");
    expect(project(report, "rag-prototype")?.maturity).not.toBe("production_ready");
    expect(project(report, "rag-partial")?.implementedDimensions).toEqual(
      expect.arrayContaining([
        "source connectors / document ingestion",
        "chunking strategy",
        "embedding provider / embedding model",
        "retrieval API"
      ])
    );
    expect(project(report, "rag-production-like")?.implementedDimensions).toEqual(
      expect.arrayContaining([
        "tests / CI",
        "evaluation dataset",
        "retrieval metrics",
        "observability / tracing"
      ])
    );
    expect(project(report, "rag-production-like")?.implementedDimensions.length).toBeGreaterThanOrEqual(12);
    expect(project(report, "rag-production-like")?.missingDimensions.length).toBeLessThan(8);
    expect(project(report, "rag-production-like")?.evidence[0]).toMatchObject({
      projectName: "rag-production-like",
      filePath: expect.any(String),
      snippet: expect.any(String),
      confidence: expect.stringMatching(/low|medium|high/)
    });
  });

  it("produces cross-project architecture, platformization guidance, and reference projects", async () => {
    const scan = await scanWorkspace({
      workspacePath,
      topics: ["rag"]
    });
    const report = analyzeRagProjects(scan.projects);

    expect(report.recommendedArchitecture.stages).toEqual([
      "Source Connector",
      "Document Normalizer",
      "Chunker",
      "Metadata Extractor",
      "Embedding Adapter",
      "Vector Index",
      "Retriever",
      "Hybrid Search",
      "Reranker",
      "Context Packer",
      "Grounded Generator",
      "Citation Verifier",
      "Evaluation Harness",
      "Observability & Cost Dashboard",
      "Access Control / Tenant Isolation"
    ]);
    expect(report.platformizationRecommendation.shouldPlatformize).toBe(true);
    expect(report.platformizationRecommendation.proposedModules).toContain("Embedding Adapter");
    expect(report.recommendedReferenceProjects).toContain("rag-production-like");
    expect(report.duplicationRisks.length).toBeGreaterThan(0);
  });

  it("localizes deep RAG findings, risks, actions, and platformization text for zh-CN", async () => {
    const scan = await scanWorkspace({
      workspacePath,
      topics: ["rag"]
    });
    const report = analyzeRagProjects(scan.projects, "zh-CN");

    expect(report.crossProjectFindings[0]).toContain("在扫描的");
    expect(report.duplicationRisks[0]).toContain("重复建设");
    expect(project(report, "rag-mention-only")?.risks[0]).toContain("只停留");
    expect(project(report, "rag-design-only")?.recommendedNextActions[0]).toContain("最小闭环");
    expect(report.platformizationRecommendation.reason).toContain("多个项目");
    expect(report.platformizationRecommendation.migrationPlan[0]).toContain("参考实现");
  });
});

function project(report: ReturnType<typeof analyzeRagProjects>, name: string) {
  return report.projectMaturity.find((item) => item.projectName === name);
}
