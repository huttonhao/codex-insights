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

    expect(html).toContain("At a Glance");
    expect(html).toContain("What You Work On");
    expect(html).toContain("How You Use Codex");
    expect(html).toContain("Where Things Go Wrong");
    expect(html).toContain("Suggested AGENTS.md Additions");
    expect(html).toContain("Workspace Quality Matrix");
    expect(html).toContain("Deep Topic Reports");
    expect(html).toContain("Data Quality");
    expect(html).not.toContain("https://cdn.tailwindcss.com");

    const zh = renderInsightsHtml({ ...report, locale: "zh-CN" }, "zh-CN");
    expect(zh).toContain("总览");
    expect(zh).toContain("工作区质量证据矩阵");
  });
});
