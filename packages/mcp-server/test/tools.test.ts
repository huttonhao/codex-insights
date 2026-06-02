import { describe, expect, it } from "vitest";
import { getSessionInsights, listSupportedLocales } from "../src/tools.js";

describe("MCP tool handlers", () => {
  it("lists supported locales", () => {
    expect(listSupportedLocales()).toEqual({
      locales: ["en-US", "zh-CN"],
      fallbackLocale: "en-US"
    });
  });

  it("generates a localized HTML session insight report", async () => {
    const result = await getSessionInsights({
      locale: "zh-CN",
      save: false,
      cwd: "/repo/codex-insights",
      now: "2026-06-02T08:00:00.000Z"
    });

    expect(result.locale).toBe("zh-CN");
    expect(result.format).toBe("html");
    expect(result.content).toContain("<!doctype html>");
    expect(result.content).toContain("Codex 洞察分析");
    expect(result.saved).toBeUndefined();
  });
});
