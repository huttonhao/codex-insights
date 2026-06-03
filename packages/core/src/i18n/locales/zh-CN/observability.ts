export const observabilityMessages = {
  "observability.finding.method": "Observability 按 structured logs、metrics、tracing、dashboards、alerts、cost attribution 和 incident docs 判断。",
  "observability.finding.coverage": "{count}/{total} 个项目有观测信号；只有日志没有 tracing/metrics/alerts 的项目最多是 partial。",
  "observability.architecture.rationale.baseline": "logs、metrics、tracing 应形成统一 baseline。",
  "observability.architecture.rationale.alerts": "dashboard 和 alerts 决定问题是否能被及时发现。",
  "observability.architecture.rationale.cost": "AI 功能还需要 token/cost attribution。"
} as const;
