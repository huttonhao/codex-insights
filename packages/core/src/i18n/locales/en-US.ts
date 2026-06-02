import type { MessageCatalog } from "../messageCatalog.js";

export const enUS: MessageCatalog = {
  title: "Codex Insights",
  sections: {
    summary: "Summary",
    metrics: "Metrics",
    recommendations: "Recommendations",
    trend: "Trend"
  },
  metrics: {
    toolCalls: "Tool calls",
    filesTouched: "Files touched",
    testsRun: "Tests run",
    warnings: "Warnings"
  },
  trend: {
    baseline: "This is the first saved report for this repository.",
    comparison: "Compared with the previous saved report:"
  },
  emptyRecommendations: "No recommendations for this run."
};
