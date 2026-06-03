import type { SupportedLocale } from "../i18n/localeResolver.js";
import { tx } from "../i18n/index.js";
import type { ProjectProfile } from "../model/project.js";
import type { DeepTopicReport } from "../model/topic.js";
import { analyzeGenericTopicProjects } from "./genericTopicAnalyzer.js";

export function analyzeSecurityProjects(
  projects: ProjectProfile[],
  locale: SupportedLocale = "en-US"
): DeepTopicReport {
  const report = analyzeGenericTopicProjects(projects, "security", locale);
  return {
    ...report,
    crossProjectFindings: [
      tx(locale, "security.finding.method"),
      tx(locale, "security.finding.coverage", {
        count: report.mentionedProjects,
        total: report.totalProjects
      })
    ],
    recommendedArchitecture: {
      name: "Security Baseline",
      stages: ["Secret Handling", "Input Validation", "Auth Boundary", "Dependency Scan", "Audit Trail", "Policy Docs", "Security Tests"],
      rationale: [
        tx(locale, "security.architecture.rationale.secret"),
        tx(locale, "security.architecture.rationale.audit"),
        tx(locale, "security.architecture.rationale.tests")
      ]
    }
  };
}
