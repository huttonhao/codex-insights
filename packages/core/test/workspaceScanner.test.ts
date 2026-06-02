import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanWorkspace } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("scanWorkspace", () => {
  it("discovers multiple projects and profiles languages, package managers, topics, and evidence", async () => {
    const result = await scanWorkspace({
      workspacePath,
      topics: ["rag"],
      maxProjects: 10,
      maxFilesPerProject: 100,
      maxFileBytes: 20_000
    });

    expect(result.projects.map((project) => project.name).sort()).toEqual([
      "rag-design-only",
      "rag-mention-only",
      "rag-partial",
      "rag-production-like",
      "rag-prototype"
    ]);
    expect(result.summary.projectsScanned).toBe(5);
    expect(result.summary.filesScanned).toBeGreaterThan(10);
    expect(result.projects.find((project) => project.name === "rag-production-like")?.languages).toContain("TypeScript");
    expect(result.projects.find((project) => project.name === "rag-production-like")?.packageManagers).toContain("npm");
    expect(result.projects.find((project) => project.name === "rag-production-like")?.aiProviders).toContain("OpenAI");
    expect(result.projects.find((project) => project.name === "rag-production-like")?.topics[0]?.topic).toBe("rag");
    expect(result.projects.flatMap((project) => project.evidence).every((item) => item.projectName)).toBe(true);
  });

  it("honors project and file scan limits with data-quality records", async () => {
    const result = await scanWorkspace({
      workspacePath,
      topics: ["rag"],
      maxProjects: 2,
      maxFilesPerProject: 1,
      maxFileBytes: 100
    });

    expect(result.summary.projectsScanned).toBe(2);
    expect(result.summary.skippedFiles).toBeGreaterThan(0);
    expect(result.dataQuality.some((item) => item.status === "partial")).toBe(true);
  });
});
