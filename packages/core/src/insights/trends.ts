import type { DeepTopicReport } from "../model/topic.js";
import type { InsightReport, TrendSummary } from "./reportModel.js";

export function createBaselineTrend(): TrendSummary {
  return {
    kind: "baseline",
    message: "This is the first saved report for this scope.",
    deltas: {}
  };
}

export function compareReportTrends(
  previous: InsightReport,
  current: InsightReport
): TrendSummary {
  return {
    kind: "comparison",
    message: "Compared with the previous saved report.",
    deltas: {
      projectsScanned:
        current.scanSummary.projectsScanned - previous.scanSummary.projectsScanned,
      filesScanned: current.scanSummary.filesScanned - previous.scanSummary.filesScanned,
      bytesScanned: current.scanSummary.bytesScanned - previous.scanSummary.bytesScanned,
      skippedFiles: current.scanSummary.skippedFiles - previous.scanSummary.skippedFiles,
      topicMentions: compareTopicMentions(previous.deepTopics, current.deepTopics),
      ragMaturityDistribution: compareRagDistribution(previous.deepTopics, current.deepTopics),
      newTopics: findTopicNames(current.deepTopics).filter(
        (topic) => !findTopicNames(previous.deepTopics).includes(topic)
      ),
      disappearedTopics: findTopicNames(previous.deepTopics).filter(
        (topic) => !findTopicNames(current.deepTopics).includes(topic)
      ),
      newRisks: compareRisks(previous, current).newRisks,
      resolvedRisks: compareRisks(previous, current).resolvedRisks,
      repeatedRecommendedActions: current.recommendations.filter((item) =>
        previous.recommendations.includes(item)
      )
    }
  };
}

function compareTopicMentions(
  previous: DeepTopicReport[],
  current: DeepTopicReport[]
): Record<string, number> {
  const topics = new Set([...findTopicNames(previous), ...findTopicNames(current)]);
  return Object.fromEntries(
    [...topics].map((topic) => [
      topic,
      (current.find((item) => item.topic === topic)?.mentionedProjects ?? 0) -
        (previous.find((item) => item.topic === topic)?.mentionedProjects ?? 0)
    ])
  );
}

function compareRagDistribution(
  previous: DeepTopicReport[],
  current: DeepTopicReport[]
): Partial<Record<string, number>> {
  const previousRag = previous.find((topic) => topic.topic === "rag");
  const currentRag = current.find((topic) => topic.topic === "rag");
  if (!previousRag && !currentRag) {
    return {};
  }
  const keys = new Set([
    ...Object.keys(previousRag?.maturityDistribution ?? {}),
    ...Object.keys(currentRag?.maturityDistribution ?? {})
  ]);
  return Object.fromEntries(
    [...keys].map((key) => [
      key,
      (currentRag?.maturityDistribution[key as keyof typeof currentRag.maturityDistribution] ?? 0) -
        (previousRag?.maturityDistribution[key as keyof typeof previousRag.maturityDistribution] ?? 0)
    ])
  );
}

function findTopicNames(topics: DeepTopicReport[]): string[] {
  return topics.map((topic) => topic.topic);
}

function compareRisks(
  previous: InsightReport,
  current: InsightReport
): { newRisks: string[]; resolvedRisks: string[] } {
  const previousRisks = flattenRisks(previous);
  const currentRisks = flattenRisks(current);
  return {
    newRisks: currentRisks.filter((risk) => !previousRisks.includes(risk)),
    resolvedRisks: previousRisks.filter((risk) => !currentRisks.includes(risk))
  };
}

function flattenRisks(report: InsightReport): string[] {
  return report.deepTopics.flatMap((topic) =>
    topic.projectMaturity.flatMap((project) => project.risks)
  );
}
