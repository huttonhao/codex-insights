import type { SupportedLocale } from "../i18n/localeResolver.js";
import { tx } from "../i18n/index.js";
import type { ProjectProfile } from "../model/project.js";
import type { DeepTopicReport } from "../model/topic.js";
import { analyzeGenericTopicProjects } from "./genericTopicAnalyzer.js";

export function analyzeObservabilityProjects(
  projects: ProjectProfile[],
  locale: SupportedLocale = "en-US"
): DeepTopicReport {
  const report = analyzeGenericTopicProjects(projects, "observability", locale);
  return {
    ...report,
    crossProjectFindings: [
      tx(locale, "observability.finding.method"),
      tx(locale, "observability.finding.coverage", {
        count: report.mentionedProjects,
        total: report.totalProjects
      })
    ],
    recommendedArchitecture: {
      name: "Observability Baseline",
      stages: ["Structured Logs", "Metrics", "Tracing", "Dashboards", "Alerts", "Cost Attribution", "Incident Review"],
      rationale: [
        tx(locale, "observability.architecture.rationale.baseline"),
        tx(locale, "observability.architecture.rationale.alerts"),
        tx(locale, "observability.architecture.rationale.cost")
      ]
    }
  };
}
