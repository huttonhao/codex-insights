import type { AnomalyIssue } from "../model/anomaly.js";
import type { Evidence } from "../model/evidence.js";
import type { InsightReport } from "../model/report.js";
import { tx } from "../i18n/index.js";

export function detectReportAnomalies(report: InsightReport): AnomalyIssue[] {
  const issues: AnomalyIssue[] = [];
  const usage = report.usageAnalytics;
  const blankEvidence: Evidence[] = [];

  if ((usage?.linesAdded ?? 0) > 250_000) {
    issues.push({
      id: "lines-added-large",
      title: tx(report.locale, "anomaly.linesAdded.title"),
      severity: (usage?.linesAdded ?? 0) > 1_000_000 ? "critical" : "warning",
      metric: "usageAnalytics.linesAdded",
      value: String(usage?.linesAdded),
      explanation: tx(report.locale, "anomaly.linesAdded.explanation"),
      impact: tx(report.locale, "anomaly.linesAdded.impact"),
      nextAction: tx(report.locale, "anomaly.linesAdded.next"),
      evidence: blankEvidence
    });
  }

  if ((usage?.toolCalls ?? report.metrics.toolCalls) > 2_000) {
    issues.push({
      id: "tool-calls-large",
      title: tx(report.locale, "anomaly.toolCalls.title"),
      severity: "warning",
      metric: "usageAnalytics.toolCalls",
      value: String(usage?.toolCalls ?? report.metrics.toolCalls),
      explanation: tx(report.locale, "anomaly.toolCalls.explanation"),
      impact: tx(report.locale, "anomaly.toolCalls.impact"),
      nextAction: tx(report.locale, "anomaly.toolCalls.next"),
      evidence: blankEvidence
    });
  }

  const projectBreakdown = usage?.projectBreakdown ?? [];
  const unknownProjects = projectBreakdown.filter((project) => project.projectName === "unknown").length;
  if (projectBreakdown.length > 0 && unknownProjects / projectBreakdown.length >= 0.35) {
    issues.push({
      id: "unknown-project-ratio",
      title: tx(report.locale, "anomaly.unknownProject.title"),
      severity: "warning",
      metric: "usageAnalytics.projectBreakdown.unknown",
      value: `${unknownProjects}/${projectBreakdown.length}`,
      explanation: tx(report.locale, "anomaly.unknownProject.explanation"),
      impact: tx(report.locale, "anomaly.unknownProject.impact"),
      nextAction: tx(report.locale, "anomaly.unknownProject.next"),
      evidence: blankEvidence
    });
  }

  if (report.scanSummary.skippedFiles > Math.max(50, report.scanSummary.filesScanned)) {
    issues.push({
      id: "skipped-files-high",
      title: tx(report.locale, "anomaly.skippedFiles.title"),
      severity: "warning",
      metric: "scanSummary.skippedFiles",
      value: String(report.scanSummary.skippedFiles),
      explanation: tx(report.locale, "anomaly.skippedFiles.explanation"),
      impact: tx(report.locale, "anomaly.skippedFiles.impact"),
      nextAction: tx(report.locale, "anomaly.skippedFiles.next"),
      evidence: blankEvidence
    });
  }

  const commandStats = usage?.commandStats;
  if (commandStats && commandStats.totalCommands > 0) {
    const failureRatio = commandStats.failedCommands / commandStats.totalCommands;
    if (failureRatio >= 0.25) {
      issues.push({
        id: "failed-command-ratio",
        title: tx(report.locale, "anomaly.failedCommands.title"),
        severity: failureRatio >= 0.5 ? "critical" : "warning",
        metric: "usageAnalytics.commandStats.failedCommands",
        value: `${commandStats.failedCommands}/${commandStats.totalCommands}`,
        explanation: tx(report.locale, "anomaly.failedCommands.explanation"),
        impact: tx(report.locale, "anomaly.failedCommands.impact"),
        nextAction: tx(report.locale, "anomaly.failedCommands.next"),
        evidence: blankEvidence
      });
    }
  }

  for (const topic of report.deepTopics) {
    for (const project of topic.projectMaturity) {
      if (project.evidence.length === 0 && project.maturity !== "none") {
        issues.push({
          id: `topic-without-evidence-${topic.topic}-${project.projectName}`,
          title: tx(report.locale, "anomaly.topicNoEvidence.title"),
          severity: "warning",
          metric: `deepTopics.${topic.topic}.${project.projectName}.evidence`,
          value: project.maturity,
          explanation: tx(report.locale, "anomaly.topicNoEvidence.explanation"),
          impact: tx(report.locale, "anomaly.topicNoEvidence.impact"),
          nextAction: tx(report.locale, "anomaly.topicNoEvidence.next"),
          evidence: blankEvidence
        });
      }
    }
  }

  if ((report.metrics.testsRunCount ?? 0) > 5_000) {
    issues.push({
      id: "tests-run-count-large",
      title: tx(report.locale, "anomaly.testsRunLarge.title"),
      severity: "warning",
      metric: "metrics.testsRunCount",
      value: String(report.metrics.testsRunCount),
      explanation: tx(report.locale, "anomaly.testsRunLarge.explanation"),
      impact: tx(report.locale, "anomaly.testsRunLarge.impact"),
      nextAction: tx(report.locale, "anomaly.testsRunLarge.next"),
      evidence: blankEvidence
    });
  }

  return issues;
}
