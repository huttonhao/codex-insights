import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateInsightsReport, renderInsightsMarkdown } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));

describe("Markdown full report quality", () => {
  it("contains the required deep sections and avoids shallow trend JSON dumps", async () => {
    const report = await generateInsightsReport({
      mode: "full",
      locale: "zh-CN",
      workspacePath,
      noLlm: true,
      deep: true
    });
    const markdown = renderInsightsMarkdown(report, "zh-CN");

    for (const heading of [
      "## 0. 执行摘要",
      "## 8. RAG 深度分析",
      "## 9. Agent 深度分析",
      "## 10. LLM Gateway 深度分析",
      "## 16. 建议加入 AGENTS.md 的规则",
      "## 17. 下一轮 Codex 执行建议",
      "## 20. 附录：证据索引"
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain("### 7.1 项目级 RAG 成熟度");
    expect(markdown).not.toMatch(/```json[\s\S]*趋势/m);
  });
});
