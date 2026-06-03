export const llmGatewayMessages = {
  "llmGateway.finding.method": "LLM Gateway 按 provider abstraction、model routing、pricing/billing、rate limit、fallback、retry、safety、usage logging、OpenAI compatible API 和 SDK/docs 判断。",
  "llmGateway.finding.coverage": "{count}/{total} 个项目有 LLM Gateway 证据；缺 usage logging、fallback 或 rate limit 时不建议作为统一网关。",
  "llmGateway.architecture.rationale.adapter": "provider adapter 和 OpenAI compatible API 适合平台化。",
  "llmGateway.architecture.rationale.governance": "pricing、rate limit、usage logging 是统一治理所需，不应散落在业务项目。",
  "llmGateway.architecture.rationale.product": "业务项目保留模型选择策略和业务安全策略。"
} as const;
