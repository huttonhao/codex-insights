export const actionsMessages = {
  "actions.prompt.quality.title": "Add test/CI evidence for {project}",
  "actions.prompt.quality.body": "In {project}, start with static checks: git status --short, git diff --stat, rg --files, and grep for incomplete stubs. Then identify the test framework and CI entry, add the smallest useful test script, test file, and CI workflow. Run the matching test/build commands and summarize failures, fixes, and reruns.",
  "actions.prompt.rag.title": "Converge the RAG platform roadmap",
  "actions.prompt.rag.body": "Using the RAG project maturity table from this report, select {project} as the reference candidate. Do not rewrite business logic first; define shared module boundaries for connectors, normalization, chunking, embeddings, vector index, retrieval, reranking, citation verification, evaluation, observability, and ACL. Then produce a three-phase migration plan and identify projects that should stop duplicating RAG infrastructure.",
  "actions.prompt.agentGateway.title": "Converge Agent / LLM Gateway boundaries",
  "actions.prompt.agentGateway.body": "Based on the Agent / LLM Gateway section, review planner, tool registry, memory, state machine, human approval, eval, tracing, provider abstraction, model routing, pricing, rate limit, fallback, retry, safety, usage logging, and OpenAI-compatible API. Decide what should become platform capability, what stays in product projects, and produce the first minimal PR list.",
  "actions.prompt.dataQuality.title": "Fix report data gaps",
  "actions.prompt.dataQuality.body": "Read the Data Quality and Confidence section first. Do not add product features; fix report data gaps by confirming the Codex sessions directory, reducing unidentified projects, tuning generated/vendor/build/log exclusions, and improving evidence snippet coverage. Then rerun the report and compare data quality.",
  "actions.prompt.unknownResolution.title": "Diagnose and resolve report unknowns",
  "actions.prompt.unknownResolution.body": "Act as a data-quality debugger for Codex Insights. Do not guess missing metrics. Inspect the listed unknown records, attempted sources, suspicious metrics, and available evidence. For each item, explain why it is unavailable, which collector/parser/config should be changed, what static inspection commands to run first, and what command should verify the fix. After changes, rerun the exact report command and only mark a field known when new evidence exists.\n\nUnknown records:\n{unknowns}\n\nSuspicious metrics:\n{anomalies}\n\nRelevant projects:\n{projects}",
  "actions.prompt.unknownResolution.evidence": "Generated from dataQuality records and anomaly detector output; it is a remediation prompt, not factual replacement data.",
  "actions.prompt.default.title": "Establish the next quality gate",
  "actions.prompt.default.body": "Using this report, list static inspection commands first, then test/build commands, and add minimal AGENTS.md rules so the next Codex change validates static checks before test/build.",
  "actions.prompt.defaultEvidence": "No urgent project-specific prompt was generated from current evidence."
} as const;
