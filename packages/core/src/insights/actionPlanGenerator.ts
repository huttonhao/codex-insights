import type { InsightReport } from "../model/report.js";
import type { NextPromptNarrative } from "../model/narrative.js";
import { createI18n, formatBoolean, tx } from "../i18n/index.js";
import { buildUnknownResolutionPrompt } from "./unknownResolutionPromptBuilder.js";

export function generateNextCodexPrompts(report: InsightReport): NextPromptNarrative[] {
  const locale = report.locale;
  const ctx = createI18n(locale);
  const prompts: NextPromptNarrative[] = [];
  const weakQualityProjects = report.projects
    .filter((project) =>
      !project.qualitySummary?.hasTestScript ||
      !project.qualitySummary?.hasCi ||
      !project.qualitySummary?.hasTestFiles
    )
    .slice(0, 3);

  for (const project of weakQualityProjects) {
    prompts.push({
      title: tx(locale, "actions.prompt.quality.title", { project: project.name }),
      prompt: tx(locale, "actions.prompt.quality.body", { project: project.name }),
      evidence: [
        `${project.name}: test script=${formatBoolean(ctx, project.qualitySummary?.hasTestScript)}, CI=${formatBoolean(ctx, project.qualitySummary?.hasCi)}, test files=${formatBoolean(ctx, project.qualitySummary?.hasTestFiles)}`
      ],
      priority: "P1"
    });
  }

  const rag = report.deepTopics.find((topic) => topic.topic === "rag");
  if (rag && rag.mentionedProjects > 1) {
    prompts.push({
      title: tx(locale, "actions.prompt.rag.title"),
      prompt: tx(locale, "actions.prompt.rag.body", {
        project: rag.recommendedReferenceProjects[0] ?? tx(locale, "rag.platform.referenceFallback")
      }),
      evidence: rag.crossProjectFindings,
      priority: "P1"
    });
  }

  const agent = report.deepTopics.find((topic) => topic.topic === "agent");
  const gateway = report.deepTopics.find((topic) => topic.topic === "llm-gateway");
  if ((agent?.mentionedProjects ?? 0) > 0 || (gateway?.mentionedProjects ?? 0) > 0) {
    prompts.push({
      title: tx(locale, "actions.prompt.agentGateway.title"),
      prompt: tx(locale, "actions.prompt.agentGateway.body"),
      evidence: [
        `agent projects=${agent?.mentionedProjects ?? 0}`,
        `llm-gateway projects=${gateway?.mentionedProjects ?? 0}`
      ],
      priority: "P2"
    });
  }

  const unknownResolution = buildUnknownResolutionPrompt(report);
  if (unknownResolution) {
    prompts.push(unknownResolution);
  }

  if (report.dataQuality.length > 0 || report.anomalies?.length) {
    prompts.push({
      title: tx(locale, "actions.prompt.dataQuality.title"),
      prompt: tx(locale, "actions.prompt.dataQuality.body"),
      evidence: report.dataQuality.slice(0, 4).map((item) => `${item.source}: ${item.status} - ${item.reason}`),
      priority: "P2"
    });
  }

  return prompts.length
    ? prompts
    : [
        {
          title: tx(locale, "actions.prompt.default.title"),
          prompt: tx(locale, "actions.prompt.default.body"),
          evidence: [tx(locale, "actions.prompt.defaultEvidence")],
          priority: "P3"
        }
      ];
}
