import type { SupportedLocale } from "../i18n/localeResolver.js";
import { tx } from "../i18n/index.js";
import type { ProjectProfile } from "../model/project.js";
import type { DeepTopicReport } from "../model/topic.js";
import { analyzeGenericTopicProjects } from "./genericTopicAnalyzer.js";

export function analyzeLlmGatewayProjects(
  projects: ProjectProfile[],
  locale: SupportedLocale = "en-US"
): DeepTopicReport {
  const report = analyzeGenericTopicProjects(projects, "llm-gateway", locale);
  return {
    ...report,
    crossProjectFindings: [
      tx(locale, "llmGateway.finding.method"),
      tx(locale, "llmGateway.finding.coverage", {
        count: report.mentionedProjects,
        total: report.totalProjects
      })
    ],
    recommendedArchitecture: {
      name: "LLM Gateway Reference Architecture",
      stages: [
        "Provider Adapter",
        "OpenAI Compatible API",
        "Model Router",
        "Policy Engine",
        "Rate Limit",
        "Retry / Fallback",
        "Safety Filter",
        "Usage Logging",
        "Pricing / Billing",
        "SDK & Documentation"
      ],
      rationale: [
        tx(locale, "llmGateway.architecture.rationale.adapter"),
        tx(locale, "llmGateway.architecture.rationale.governance"),
        tx(locale, "llmGateway.architecture.rationale.product")
      ]
    }
  };
}
