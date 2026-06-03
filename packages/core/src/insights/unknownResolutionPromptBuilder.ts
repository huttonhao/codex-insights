import { tx } from "../i18n/index.js";
import type { NextPromptNarrative } from "../model/narrative.js";
import type { InsightReport } from "../model/report.js";

export function buildUnknownResolutionPrompt(
  report: InsightReport
): NextPromptNarrative | undefined {
  const unknowns = report.dataQuality.filter((item) =>
    item.status === "missing" ||
    item.status === "unavailable" ||
    item.status === "partial"
  );
  const anomalies = report.anomalies ?? [];

  if (!unknowns.length && !anomalies.length) {
    return undefined;
  }

  return {
    title: tx(report.locale, "actions.prompt.unknownResolution.title"),
    prompt: tx(report.locale, "actions.prompt.unknownResolution.body", {
      unknowns: formatUnknowns(unknowns),
      anomalies: formatAnomalies(anomalies),
      projects: formatProjects(report)
    }),
    evidence: [
      tx(report.locale, "actions.prompt.unknownResolution.evidence"),
      ...unknowns.slice(0, 4).map((item) => `${item.source}: ${item.status} - ${item.reason}`),
      ...anomalies.slice(0, 2).map((item) => `${item.metric}=${item.value}`)
    ],
    priority: anomalies.some((item) => item.severity === "critical") ||
      unknowns.some((item) => item.status === "unavailable")
      ? "P1"
      : "P2"
  };
}

function formatUnknowns(unknowns: InsightReport["dataQuality"]): string {
  if (!unknowns.length) {
    return "- none";
  }
  return unknowns
    .slice(0, 12)
    .map((item) => {
      const attempted = item.attemptedSources.length
        ? ` attemptedSources=${item.attemptedSources.join(", ")}`
        : "";
      return `- ${item.source}: status=${item.status}; reason=${item.reason};${attempted}`;
    })
    .join("\n");
}

function formatAnomalies(anomalies: NonNullable<InsightReport["anomalies"]>): string {
  if (!anomalies.length) {
    return "- none";
  }
  return anomalies
    .slice(0, 8)
    .map((item) =>
      `- ${item.metric}: value=${item.value}; severity=${item.severity}; explanation=${item.explanation}; next=${item.nextAction}`
    )
    .join("\n");
}

function formatProjects(report: InsightReport): string {
  const projects = [
    ...(report.usageAnalytics?.projectBreakdown?.map((project) => project.projectName) ?? []),
    ...report.projects.map((project) => project.name)
  ].filter((project) => project && project !== "unknown");
  const unique = [...new Set(projects)].slice(0, 12);
  return unique.length ? unique.join(", ") : report.repository.name;
}
