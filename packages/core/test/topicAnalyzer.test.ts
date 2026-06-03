import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { analyzeProjectTopics, scanWorkspace, type ScannedFile } from "../src/index.js";

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

  it("uses topic-specific maturity rubrics for non-RAG topics", () => {
    expect(topicMaturity("agent", [
      file("src/agent.ts", "export async function runAgentLoop() { return planner.toolCall(memory); }"),
      file("tests/agent.test.ts", "it('runs tools', () => {})")
    ], { test: "vitest run" })).toBe("partial");

    expect(topicMaturity("llm-gateway", [
      file("docs/gateway.md", "Architecture design for model router, provider adapter, fallback, rate limit, and cost budget.")
    ])).toBe("design_only");

    expect(topicMaturity("auth", [
      file("src/auth.ts", "export function authMiddleware(jwt: string) { return rbacPermission(jwt); }"),
      file("tests/auth.test.ts", "it('rejects unauthorized users', () => {})")
    ], { test: "vitest run", build: "tsc -p tsconfig.json" })).toBe("production_ready");

    expect(topicMaturity("billing", [
      file("README.md", "Billing is a future idea.")
    ])).toBe("mention_only");

    expect(topicMaturity("observability", [
      file("src/telemetry.ts", "export function recordTrace(span: string) { metricsCounter(span); logger.info(span); }")
    ])).toBe("partial");

    expect(topicMaturity("security", [
      file("src/security.ts", "export function encryptSecret(secret: string) { auditPermission(secret); }")
    ])).toBe("prototype");

    expect(topicMaturity("i18n", [
      file("src/i18n.ts", "export const messageCatalog = { locale: 'zh-CN', fallbackLocale: 'en-US', translations: {} };")
    ], { test: "vitest run" })).toBe("partial");

    expect(topicMaturity("workflow", [
      file("src/workflow.ts", "export function runWorkflow() { return stateMachine.retry(orchestrator.queue); }"),
      file("tests/workflow.test.ts", "it('retries failed steps', () => {})")
    ], { test: "vitest run", build: "tsc -p tsconfig.json" })).toBe("production_ready");
  });
});

function topicMaturity(
  topic: string,
  files: ScannedFile[],
  packageScripts: Record<string, string> = {}
) {
  return analyzeProjectTopics({
    projectName: `${topic}-project`,
    files,
    topics: [topic],
    packageScripts
  })[0]?.maturity;
}

function file(relativePath: string, content: string): ScannedFile {
  return {
    relativePath,
    absolutePath: `/tmp/${relativePath}`,
    sizeBytes: content.length,
    content
  };
}
