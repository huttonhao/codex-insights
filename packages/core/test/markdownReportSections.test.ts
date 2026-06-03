import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateInsightsReport, renderInsightsMarkdown } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("Markdown report sections", () => {
  it("renders the required Markdown sections", async () => {
    const report = await generateInsightsReport({
      mode: "workspace",
      locale: "en-US",
      workspacePath,
      deep: true,
      topics: ["rag"],
      save: false
    });
    const markdown = renderInsightsMarkdown(report, "en-US");

    expect(markdown).toContain("## 0. Executive Summary");
    expect(markdown).toContain("## 4. How You Use Codex");
    expect(markdown).toContain("## 8. RAG Deep Analysis");
    expect(markdown).toContain("## 16. Suggested AGENTS.md Rules");
    expect(markdown).toContain("## 18. Data Quality And Confidence");

    const zh = renderInsightsMarkdown({ ...report, locale: "zh-CN" }, "zh-CN");
    expect(zh).toContain("## 0. 执行摘要");
    expect(zh).toContain("## 6. 工作区质量证据矩阵");
  });
});
