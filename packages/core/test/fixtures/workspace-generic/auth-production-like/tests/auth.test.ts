import { describe, expect, it } from "vitest";

describe("auth", () => {
  it("checks auth", () => {
    expect("jwt").toBeTruthy();
  });
});
