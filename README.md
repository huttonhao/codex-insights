# Codex Insights

Codex Insights is a Codex skill/MCP/CLI insights tool for evidence-backed Codex session, repository, and multi-project workspace analysis.

It is inspired by Claude Code `/insights`, but this project does not claim a built-in Codex `/insights` trigger. Current customer usage is through natural-language Codex skill triggers, MCP tools, or the CLI.

## What It Does

- Reads explicit Codex session JSON when provided.
- Collects git context from a repository without reading unbounded diff content.
- Scans a workspace containing multiple projects with default safety limits.
- Detects topic evidence across projects.
- Performs deep RAG analysis with maturity classification, risks, recommendations, reference-project selection, and shared-platform guidance.
- Outputs stable JSON, Tailwind-styled HTML, and Markdown.
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

The installed skill can route these requests to the Codex Insights MCP server. This is a skill/MCP workflow, not a built-in Codex command.

## CLI Usage

```bash
npm run cli -- report --locale zh-CN
npm run cli -- report --locale zh-CN --repo .
npm run cli -- report --locale zh-CN --deep --workspace ~/Project
npm run cli -- report --locale zh-CN --deep --workspace ~/Project --topics rag,agent
npm run cli -- report --locale zh-CN --deep --workspace ~/Project --format markdown
npm run cli -- report --locale zh-CN --deep --workspace ~/Project --format json --no-save
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

## Deep RAG Analysis

The RAG analyzer distinguishes:

- `mention_only`: RAG appears only in README/docs/comments.
- `design_only`: architecture or schema exists, but no core implementation was found.
- `prototype`: a thin implementation or demo exists without a full engineering chain.
- `partial`: ingestion, chunking, embedding, retrieval, or similar chain elements exist, but production concerns are incomplete.
- `production_ready`: core chain, tests, config, observability or evaluation, error boundaries, security or tenant isolation, and documentation/CI signals are present.

The analyzer reports implemented and missing RAG dimensions, cross-project repeated patterns, duplication risk, recommended reference projects, and a recommended platform architecture.

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
