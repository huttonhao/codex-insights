import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { scanWorkspace } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("topic analyzer", () => {
  it("does not treat a README-only RAG mention as implementation", async () => {
    const result = await scanWorkspace({
      workspacePath,
      topics: ["rag"]
    });

    const mentionOnly = result.projects.find((project) => project.name === "rag-mention-only");

    expect(mentionOnly?.maturityByTopic.rag).toBe("mention_only");
    expect(mentionOnly?.evidence[0]).toMatchObject({
      projectName: "rag-mention-only",
      filePath: "README.md",
      confidence: expect.stringMatching(/low|medium|high/)
    });
  });

  it("recognizes dependency and source-code signals as stronger evidence", async () => {
    const result = await scanWorkspace({
      workspacePath,
      topics: ["rag"]
    });

    const prototype = result.projects.find((project) => project.name === "rag-prototype");

    expect(prototype?.maturityByTopic.rag).toBe("prototype");
    expect(prototype?.topics.find((topic) => topic.topic === "rag")?.signals).toContain("dependency:@langchain/core");
    expect(prototype?.evidence.some((item) => item.filePath === "src/retriever.ts")).toBe(true);
  });
});
