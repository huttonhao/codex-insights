export const dataQualityMessages = {
  "dataQuality.status.ok": "ok",
  "dataQuality.status.partial": "partial",
  "dataQuality.status.missing": "missing",
  "dataQuality.status.unavailable": "unavailable",
  "dataQuality.summary.none": "No blocking data-quality warning.",
  "dataQuality.summary.some": "{count} dataQuality records exist; read related conclusions with source confidence.",
  "dataQuality.source.codexJsonl": "Codex JSONL rollout history",
  "dataQuality.source.workspace": "workspace scanner",
  "dataQuality.source.git": "git/repo context",
  "dataQuality.source.topic": "topic analyzers",
  "dataQuality.source.facets": "heuristic or LLM session facets",
  "dataQuality.caveat.codexJsonl": "Codex JSONL parsing is best-effort local analysis, not an official stable analytics API.",
  "dataQuality.caveat.facets": "LLM facets, when enabled, summarize; they do not override structured evidence.",
  "dataQuality.caveat.noAnomaly": "No suspicious metric required special explanation."
} as const;
