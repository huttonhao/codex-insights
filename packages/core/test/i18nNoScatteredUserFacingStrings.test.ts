import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot } from "./testUtils.js";

const checkedFiles = [
  "packages/core/src/insights/analyzer.ts",
  "packages/core/src/insights/reportNarrativeBuilder.ts",
  "packages/core/src/i18n/outputRenderer.ts",
  "packages/cli/src/main.ts",
  "packages/mcp-server/src/server.ts",
  "packages/mcp-server/src/tools.ts"
];

const chineseText = /[\p{Script=Han}]/u;
const scatteredHeadings =
  /At a Glance|Where Things Go Wrong|Workspace Quality Matrix|Deep Topic Reports|Data Quality|Suggested AGENTS\.md Additions|总览|使用指标|深度专题|数据质量|工作区质量证据矩阵/;

describe("i18n user-facing copy placement", () => {
  it("keeps report copy out of analyzers, renderer fallback, CLI, and MCP", () => {
    const offenders = checkedFiles.flatMap((relative) => {
      const file = join(repoRoot, relative);
      const content = readFileSync(file, "utf8");
      const reasons = [
        chineseText.test(content) ? "contains Chinese text" : "",
        scatteredHeadings.test(content) ? "contains hardcoded report heading" : ""
      ].filter(Boolean);
      return reasons.map((reason) => `${relative}: ${reason}`);
    });

    expect(offenders).toEqual([]);
  });
});
