import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCodexJsonlSessionFile, redactSensitiveText } from "../src/index.js";

const sensitive = fileURLToPath(new URL("./fixtures/codex-sessions/sensitive/rollout-sensitive.jsonl", import.meta.url));

describe("redaction", () => {
  it("redacts likely keys, tokens, and passwords", () => {
    const redacted = redactSensitiveText("api_key=sk-secretvalue123456 password=abc token=ghp_abcdefghijklmnopqrstuvwxyz");

    expect(redacted).toContain("[REDACTED]");
    expect(redacted).not.toContain("sk-secretvalue");
    expect(redacted).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz");
    expect(redacted).not.toContain("password=abc");
  });

  it("redacts sensitive Codex transcript snippets by default", async () => {
    const result = await parseCodexJsonlSessionFile(sensitive);

    expect(result.session?.transcriptSnippet).toContain("[REDACTED]");
    expect(result.session?.transcriptSnippet).not.toContain("sk-testsecret");
    expect(result.session?.commands[0]?.command).toContain("[REDACTED]");
  });
});
