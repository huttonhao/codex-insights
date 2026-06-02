import type { MessageCatalog } from "../messageCatalog.js";

export const zhCN: MessageCatalog = {
  title: "Codex 洞察",
  sections: {
    summary: "摘要",
    metrics: "指标",
    recommendations: "建议",
    trend: "趋势"
  },
  metrics: {
    toolCalls: "工具调用",
    filesTouched: "触达文件",
    testsRun: "测试运行",
    warnings: "警告"
  },
  trend: {
    baseline: "这是该仓库首次保存的报告。",
    comparison: "与上一次保存的报告相比："
  },
  emptyRecommendations: "本次没有建议。"
};
