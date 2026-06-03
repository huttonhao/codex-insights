import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateInsightsReport, renderInsightsMarkdown } from "../src/index.js";

const workspacePath = fileURLToPath(new URL("./fixtures/workspace-rag/", import.meta.url));
const sessionsDir = fileURLToPath(new URL("./fixtures/codex-sessions/", import.meta.url));

describe("full report depth quality", () => {
  it("builds a full narrative with evidence, risks, actions, and unknown-resolution prompts", async () => {
    const report = await generateInsightsReport({
      mode: "full",
      locale: "zh-CN",
      workspacePath,
      sessionsDir,
      limit: 4,
      noLlm: true,
      deep: true
    });
    const markdown = renderInsightsMarkdown(report, "zh-CN");

    expect(report.fullNarrative?.executiveSummary.length).toBeGreaterThanOrEqual(3);
    expect(markdown).toContain("## 8. RAG 深度分析");
    expect(markdown).toContain("项目级 RAG");
    expect(markdown).toContain("诊断并修复报告 unknown");
    expect(markdown).toContain("不要猜测缺失指标");
    expect(markdown).not.toMatch(/^- unknown$/m);
    expect(markdown).not.toMatch(/^- \[ \] unknown/m);
  });
});
