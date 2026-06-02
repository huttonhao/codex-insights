import { describe, expect, it } from "vitest";
import { resolveLocale } from "../src/index.js";

describe("resolveLocale", () => {
  it("uses an explicit supported locale before any inferred language", () => {
    expect(
      resolveLocale({
        requestedLocale: "zh-CN",
        userInput: "show session insights",
        envLocale: "en_US.UTF-8"
      })
    ).toEqual({
      locale: "zh-CN",
      requestedLocale: "zh-CN",
      fallbackLocale: "en-US",
      usedFallback: false
    });
  });

  it("infers Chinese output from Chinese input", () => {
    expect(resolveLocale({ userInput: "生成本次 Codex 会话洞察" }).locale).toBe(
      "zh-CN"
    );
  });

  it("infers English output from English input", () => {
    expect(resolveLocale({ userInput: "generate session insights" }).locale).toBe(
      "en-US"
    );
  });

  it("normalizes locale-like environment values", () => {
    expect(resolveLocale({ envLocale: "zh_CN.UTF-8" }).locale).toBe("zh-CN");
  });

  it("falls back to English for unsupported explicit locales", () => {
    expect(resolveLocale({ requestedLocale: "fr-FR" })).toEqual({
      locale: "en-US",
      requestedLocale: "fr-FR",
      fallbackLocale: "en-US",
      usedFallback: true
    });
  });
});
