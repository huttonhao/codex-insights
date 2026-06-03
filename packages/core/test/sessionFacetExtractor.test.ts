import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  extractSessionFacets,
  facetCacheKey,
  parseCodexJsonlSessionFile
} from "../src/index.js";

const sessionFile = fileURLToPath(new URL("./fixtures/codex-sessions/new-format/rollout-new-1.jsonl", import.meta.url));

describe("session facet extractor", () => {
  it("uses heuristic facets when LLM is disabled", async () => {
    const parsed = await parseCodexJsonlSessionFile(sessionFile);
    const result = await extractSessionFacets(parsed.session ? [parsed.session] : [], {
      noLlm: true
    });

    expect(result.facets[0]).toMatchObject({
      sessionId: "new-session-1",
      sourceSessionIds: ["new-session-1"]
    });
    expect(result.dataQuality[0]).toMatchObject({
      source: "session-facets",
      status: "partial"
    });
  });

  it("builds cache keys from session, parser schema, and prompt version", () => {
    expect(facetCacheKey("abc")).toContain("abc");
    expect(facetCacheKey("abc")).toContain("codex-jsonl");
    expect(facetCacheKey("abc")).toContain("facet");
  });
});
