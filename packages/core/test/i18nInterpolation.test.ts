import { describe, expect, it } from "vitest";
import { createI18n, t } from "../src/i18n/index.js";

describe("i18n interpolation", () => {
  it("interpolates catalog parameters without string concatenation at call sites", () => {
    const zh = createI18n("zh-CN");
    const en = createI18n("en-US");

    expect(t(zh, "report.coverage.projects", { count: 12 })).toContain("12");
    expect(t(en, "report.coverage.projects", { count: 12 })).toBe("Workspace projects: 12");
  });
});
