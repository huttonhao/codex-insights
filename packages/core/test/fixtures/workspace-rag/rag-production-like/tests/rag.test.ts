import { describe, expect, it } from "vitest";
import { scoreRetrieval } from "../src/evaluation.js";

describe("rag retrieval", () => {
  it("records retrieval metrics", () => {
    expect(scoreRetrieval().recall).toBeGreaterThan(0.8);
  });
});
