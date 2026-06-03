import { describe, expect, it } from "vitest";
import { createI18n, t } from "../src/i18n/index.js";

describe("i18n report section titles", () => {
  it("renders full report section titles from catalog", () => {
    const zh = createI18n("zh-CN");
    const en = createI18n("en-US");

    expect(t(zh, "report.section.executiveSummary")).toBe("0. 执行摘要");
    expect(t(zh, "report.section.evidenceIndex")).toBe("20. 附录：证据索引");
    expect(t(en, "report.section.executiveSummary")).toBe("0. Executive Summary");
    expect(t(en, "report.section.evidenceIndex")).toBe("20. Appendix: Evidence Index");
  });
});
