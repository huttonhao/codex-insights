import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { repoRoot, walkFiles } from "./testUtils.js";

const forbidden =
  /locale\s*(?:===|!==)\s*["']zh-CN["']|["']zh-CN["']\s*(?:===|!==)\s*locale|isLocale\([^)]*["']zh-CN["']/;

describe("i18n locale branching", () => {
  it("does not branch on zh-CN outside the i18n layer", () => {
    const files = walkFiles(join(repoRoot, "packages"))
      .filter((file) => file.endsWith(".ts"))
      .filter((file) => !file.includes("/test/"))
      .filter((file) => !file.includes("/src/i18n/"))
      .filter((file) => !file.includes("/dist/"));

    const offenders = files.filter((file) => forbidden.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
});
