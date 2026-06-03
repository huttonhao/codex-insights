export const llmGatewayMessages = {
  "llmGateway.finding.method": "LLM Gateway maturity is evaluated across provider abstraction, model routing, pricing/billing, rate limits, fallback, retry, safety, usage logging, OpenAI-compatible API, and SDK/docs.",
  "llmGateway.finding.coverage": "{count}/{total} projects contain gateway evidence; missing usage logging, fallback, or rate limits blocks reference status.",
  "llmGateway.architecture.rationale.adapter": "Provider adapters and OpenAI-compatible API belong in shared platform code.",
  "llmGateway.architecture.rationale.governance": "Pricing, rate limits, and usage logging are governance concerns that should not be scattered across products.",
  "llmGateway.architecture.rationale.product": "Product projects should retain model selection policy and business safety rules."
} as const;
