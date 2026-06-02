import { describe, expect, it } from "vitest";
import { runCli } from "../src/main.js";

describe("codex-insights CLI", () => {
  it("prints supported locales", async () => {
    const result = await runCli(["locales"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("en-US");
    expect(result.stdout).toContain("zh-CN");
  });

  it("prints a localized HTML report without saving", async () => {
    const result = await runCli(["report", "--locale", "zh-CN", "--no-save"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("<!doctype html>");
    expect(result.stdout).toContain("Codex 洞察分析");
    expect(result.stdout).toContain("https://cdn.tailwindcss.com");
    expect(result.stderr).toBe("");
  });
});
