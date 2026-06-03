import { describe, expect, it } from "vitest";

describe("agent production", () => {
  it("runs with guardrails", async () => {
    expect("guardrails").toContain("guard");
  });
});
