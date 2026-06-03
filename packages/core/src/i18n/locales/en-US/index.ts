import type { MessageCatalog } from "../../messageCatalog.js";
import { commonMessages } from "./common.js";
import { cliMessages } from "./cli.js";
import { doctorMessages } from "./doctor.js";
import { reportMessages } from "./report.js";
import { reportSectionsMessages } from "./reportSections.js";
import { dataQualityMessages } from "./dataQuality.js";
import { topicMessages } from "./topic.js";
import { ragMessages } from "./rag.js";
import { agentMessages } from "./agent.js";
import { llmGatewayMessages } from "./llmGateway.js";
import { qualityMessages } from "./quality.js";
import { observabilityMessages } from "./observability.js";
import { securityMessages } from "./security.js";
import { agentsRulesMessages } from "./agentsRules.js";
import { actionsMessages } from "./actions.js";
import { errorsMessages } from "./errors.js";

export const enUS: MessageCatalog = {
  title: "Codex Insights",
  sections: { summary: "Summary", metrics: "Metrics", recommendations: "Recommendations", trend: "Trend" },
  metrics: { projectsScanned: "Projects scanned", filesScanned: "Files scanned", testsRun: "Tests run", warnings: "Warnings" },
  trend: { baseline: "This is the first saved report for this repository.", comparison: "Compared with the previous saved report:" },
  emptyRecommendations: "No recommendations for this run."
};

export const enUSMessages = {
  ...commonMessages,
  ...cliMessages,
  ...doctorMessages,
  ...reportMessages,
  ...reportSectionsMessages,
  ...dataQualityMessages,
  ...topicMessages,
  ...ragMessages,
  ...agentMessages,
  ...llmGatewayMessages,
  ...qualityMessages,
  ...observabilityMessages,
  ...securityMessages,
  ...agentsRulesMessages,
  ...actionsMessages,
  ...errorsMessages
} as const;
