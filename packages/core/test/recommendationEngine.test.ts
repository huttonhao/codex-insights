import { describe, expect, it } from "vitest";
import { buildRagPlatformizationRecommendation } from "../src/index.js";

describe("recommendation engine", () => {
  it("recommends platformization when several projects have RAG signals", () => {
    const recommendation = buildRagPlatformizationRecommendation({
      mentionedProjects: 4,
      matureProjects: ["rag-production-like"],
      repeatedDimensions: ["embedding provider / embedding model", "retrieval API"]
    });

    expect(recommendation.shouldPlatformize).toBe(true);
    expect(recommendation.reason).toContain("multiple projects");
    expect(recommendation.proposedModules).toContain("Retriever");
    expect(recommendation.migrationPlan[0]).toContain("reference");
  });

  it("avoids platformization when only one project has weak evidence", () => {
    const recommendation = buildRagPlatformizationRecommendation({
      mentionedProjects: 1,
      matureProjects: [],
      repeatedDimensions: []
    });

    expect(recommendation.shouldPlatformize).toBe(false);
    expect(recommendation.reason).toContain("insufficient");
  });
});
