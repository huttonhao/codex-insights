import { describe, expect, it } from "vitest";
import { assertCompleteCatalog, listMissingTranslations } from "../src/i18n/index.js";

describe("i18n catalog completeness", () => {
  it("keeps zh-CN and en-US message keys aligned", () => {
    expect(listMissingTranslations("en-US")).toEqual([]);
    expect(listMissingTranslations("zh-CN")).toEqual([]);
    expect(() => assertCompleteCatalog("zh-CN")).not.toThrow();
  });
});
