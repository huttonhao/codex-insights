# Codex Insights

Codex Insights is a Codex skill/MCP/CLI insights tool for evidence-backed Codex session history, repository, and multi-project workspace analysis.

It is inspired by Claude Code `/insights`, but this project does not claim an internal Codex slash-command integration. Current customer usage is through natural-language Codex skill triggers, MCP tools, or the CLI.

## What It Does

- Reads explicit Codex session JSON when provided.
- Parses best-effort Codex local JSONL history from `rollout-*.jsonl` files.
- Aggregates usage analytics across sessions, projects, tools, commands, models, tokens, and daily activity where the local data source contains that evidence.
- Collects git context from a repository without reading unbounded diff content.
- Scans a workspace containing multiple projects with default safety limits.
- Detects topic evidence across projects and returns deep reports for requested topics such as `rag`, `agent`, and `llm-gateway`.
- Performs deep RAG analysis with maturity classification, risks, recommendations, reference-project selection, and shared-platform guidance.
- Produces Claude Code Insights-inspired sections: At a Glance, What You Work On, How You Use Codex, Where Things Go Wrong, Suggested AGENTS.md Additions, and On the Horizon.
- Outputs stable JSON, self-contained HTML, and Markdown.
- Saves date-versioned local reports and compares trend deltas with the previous comparable run.
- Marks missing or unavailable data in `dataQuality` instead of turning unknown values into zero.

## Codex Usage

In Codex, use natural language such as:

```text
insights
```

```text
生成本次 Codex 会话洞察分析
```

```text
扫描我的 workspace，深度分析 RAG/Agent/LLM Gateway
```

The installed skill can route these requests to the Codex Insights MCP server. This is a skill/MCP workflow, not a Codex internal slash command.

## CLI Usage

```bash
npm run cli -- report --locale zh-CN
npm run cli -- report --locale zh-CN --repo .
npm run cli -- report --locale zh-CN --deep --workspace ~/Project
npm run cli -- report --locale zh-CN --deep --workspace ~/Project --topics rag,agent
npm run cli -- report --locale zh-CN --deep --workspace ~/Project --format markdown
npm run cli -- report --locale zh-CN --deep --workspace ~/Project --format json --no-save
npm run cli -- report --locale zh-CN --codex-history
npm run cli -- report --locale zh-CN --codex-history --limit 50
npm run cli -- report --locale zh-CN --codex-history --sessions-dir ~/.codex/sessions
npm run cli -- report --locale zh-CN --codex-history --dry-run
npm run cli -- report --locale zh-CN --codex-history --no-llm
npm run cli -- report --locale zh-CN --codex-history --llm-facets
npm run cli -- locales
npm run cli -- doctor
```

Saved reports are written to:

```text
.codex-insights/reports/
```

Each saved run writes a versioned JSON model and, when rendered, HTML or Markdown output.

## Session JSON

Session mode accepts a JSON file with this shape:

```json
{
  "sessionId": "session-1",
  "startedAt": "2026-06-02T08:00:00.000Z",
  "endedAt": "2026-06-02T08:40:00.000Z",
  "userPrompts": [],
  "assistantActions": [],
  "toolCalls": [],
  "commands": [],
  "fileEdits": [],
  "warnings": []
}
```

Example:

```bash
npm run cli -- report --locale zh-CN --session-file ./session.json --format markdown
```

## Codex History

Codex history mode scans `rollout-*.jsonl` files from `~/.codex/sessions` by default, or from `--sessions-dir`.

```bash
npm run cli -- report --locale zh-CN --codex-history --format markdown
npm run cli -- report --locale zh-CN --codex-history --sessions-dir ~/.codex/sessions --limit 50 --no-llm
```

`--dry-run` parses and summarizes local session files without facet extraction. `--llm-facets` can call `codex exec` and cache facet summaries under `.codex-insights/cache/facets/`; baseline reports do not require direct API-key environment variables.

Session transcripts may contain sensitive text. Reports redact common token, key, secret, and password patterns by default and limit transcript snippets.

## Deep RAG Analysis

The RAG analyzer distinguishes:

- `mention_only`: RAG appears only in README/docs/comments.
- `design_only`: architecture or schema exists, but no core implementation was found.
- `prototype`: a thin implementation or demo exists without a full engineering chain.
- `partial`: ingestion, chunking, embedding, retrieval, or similar chain elements exist, but production concerns are incomplete.
- `production_ready`: core chain, tests, config, observability or evaluation, error boundaries, security or tenant isolation, and documentation/CI signals are present.

The analyzer reports implemented and missing RAG dimensions, cross-project repeated patterns, duplication risk, recommended reference projects, and a recommended platform architecture.

## Workspace Quality Matrix

Workspace mode records per-project evidence for test scripts, CI, test files, build config, executed test evidence, lint, typecheck, and Docker usage. The matrix is shown in JSON, Markdown, and HTML reports so topic maturity is tied to engineering evidence, not just keywords.

## Development

```bash
npm install
npm test
npm run build
```

See:

- `docs/DATA_SOURCES.md`
- `docs/DEEP_ANALYSIS.md`
- `docs/ACCEPTANCE.md`
