export const dataQualityMessages = {
  "dataQuality.status.ok": "正常",
  "dataQuality.status.partial": "部分可用",
  "dataQuality.status.missing": "缺失",
  "dataQuality.status.unavailable": "不可用",
  "dataQuality.summary.none": "当前没有阻断性数据质量告警。",
  "dataQuality.summary.some": "存在 {count} 条 dataQuality 记录，相关结论需要结合来源可信度阅读。",
  "dataQuality.source.codexJsonl": "Codex JSONL rollout history",
  "dataQuality.source.workspace": "workspace scanner",
  "dataQuality.source.git": "git/repo context",
  "dataQuality.source.topic": "topic analyzers",
  "dataQuality.source.facets": "heuristic or LLM session facets",
  "dataQuality.caveat.codexJsonl": "Codex JSONL 是 best-effort 本地解析，不是官方稳定 analytics API。",
  "dataQuality.caveat.facets": "LLM facets 如启用，也只是归纳，不覆盖结构化 evidence。",
  "dataQuality.caveat.noAnomaly": "未发现需要单独解释的可疑指标。"
} as const;
