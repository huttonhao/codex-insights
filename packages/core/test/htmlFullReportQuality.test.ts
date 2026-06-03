import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateInsightsReport, renderInsightsHtml } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("HTML full report quality", () => {
  it("renders a self-contained operational report with full report sections", async () => {
    const report = await generateInsightsReport({
      mode: "full",
      locale: "zh-CN",
      workspacePath,
      noLlm: true,
      deep: true
    });
    const html = renderInsightsHtml(report, "zh-CN");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Codex Insights 全量洞察报告");
    expect(html).toContain("8. RAG 深度分析");
    expect(html).toContain("16. 建议加入 AGENTS.md 的规则");
    expect(html).toContain("20. 附录：证据索引");
    expect(html).not.toContain("https://cdn.tailwindcss.com");
  });
});
