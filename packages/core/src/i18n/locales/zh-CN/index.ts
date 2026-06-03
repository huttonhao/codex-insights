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

export const zhCN: MessageCatalog = {
  title: "Codex 洞察分析",
  sections: { summary: "总结", metrics: "指标", recommendations: "建议", trend: "趋势" },
  metrics: { projectsScanned: "扫描项目", filesScanned: "扫描文件", testsRun: "测试执行", warnings: "警告" },
  trend: { baseline: "这是该仓库保存的第一份报告。", comparison: "与上一份报告相比：" },
  emptyRecommendations: "本次没有建议。"
};

export const zhCNMessages = {
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
