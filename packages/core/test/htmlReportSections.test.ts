import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateInsightsReport, renderInsightsHtml } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("HTML report sections", () => {
  it("renders the required English and Chinese product sections without external CDN", async () => {
    const report = await generateInsightsReport({
      mode: "workspace",
      locale: "en-US",
      workspacePath,
      deep: true,
      topics: ["rag"],
      save: false
    });
    const html = renderInsightsHtml(report, "en-US");

    expect(html).toContain("0. Executive Summary");
    expect(html).toContain("How You Use Codex");
    expect(html).toContain("8. RAG Deep Analysis");
    expect(html).toContain("16. Suggested AGENTS.md Rules");
    expect(html).toContain("18. Data Quality And Confidence");
    expect(html).not.toContain("https://cdn.tailwindcss.com");

    const zh = renderInsightsHtml({ ...report, locale: "zh-CN" }, "zh-CN");
    expect(zh).toContain("0. 执行摘要");
    expect(zh).toContain("6. 工作区质量证据矩阵");
  });
});
