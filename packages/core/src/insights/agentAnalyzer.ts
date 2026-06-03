import type { SupportedLocale } from "../i18n/localeResolver.js";
import { tx } from "../i18n/index.js";
import type { ProjectProfile } from "../model/project.js";
import type { DeepTopicReport } from "../model/topic.js";
import { analyzeGenericTopicProjects } from "./genericTopicAnalyzer.js";

export function analyzeAgentProjects(
  projects: ProjectProfile[],
  locale: SupportedLocale = "en-US"
): DeepTopicReport {
  const report = analyzeGenericTopicProjects(projects, "agent", locale);
  return {
    ...report,
    crossProjectFindings: [
      tx(locale, "agent.finding.method"),
      tx(locale, "agent.finding.coverage", {
        count: report.mentionedProjects,
        total: report.totalProjects
      })
    ],
    recommendedArchitecture: {
      name: "Agent Runtime Reference Architecture",
      stages: [
        "Goal Classifier",
        "Planner",
        "Tool Registry",
        "State Machine",
        "Memory",
        "Execution Sandbox",
        "Human Approval",
        "Eval Harness",
        "Tracing",
        "Failure Recovery"
      ],
      rationale: [
        tx(locale, "agent.architecture.rationale.planner"),
        tx(locale, "agent.architecture.rationale.boundary"),
        tx(locale, "agent.architecture.rationale.ops")
      ]
    }
  };
}
