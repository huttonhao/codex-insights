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

    expect(markdown).toContain("## At a Glance");
    expect(markdown).toContain("## What You Work On");
    expect(markdown).toContain("## How You Use Codex");
    expect(markdown).toContain("## Where Things Go Wrong");
    expect(markdown).toContain("## Suggested AGENTS.md Additions");
    expect(markdown).toContain("## Workspace Quality Matrix");
    expect(markdown).toContain("## Deep Topic Reports");
    expect(markdown).toContain("## Data Quality");

    const zh = renderInsightsMarkdown({ ...report, locale: "zh-CN" }, "zh-CN");
    expect(zh).toContain("## 总览");
    expect(zh).toContain("## 工作区质量证据矩阵");
  });
});
