import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAgentRuleSuggestions, parseCodexJsonlSessionFile } from "../src/index.js";

const oldFile = fileURLToPath(new URL("./fixtures/codex-sessions/old-format/rollout-old-1.jsonl", import.meta.url));

describe("agent rule suggestions", () => {
  it("generates copyable AGENTS.md rules backed by command-failure evidence", async () => {
    const session = (await parseCodexJsonlSessionFile(oldFile)).session;
    const rules = buildAgentRuleSuggestions({
      sessions: session ? [session] : [],
      locale: "zh-CN"
    });

    expect(rules[0]).toMatchObject({
      id: "static-checks-before-build",
      severity: expect.stringMatching(/recommended|strongly_recommended/)
    });
    expect(rules[0]?.ruleText).toContain("find");
    expect(rules[0]?.ruleText).toContain("grep");
    expect(rules.some((rule) => rule.evidence.length > 0)).toBe(true);
  });
});
