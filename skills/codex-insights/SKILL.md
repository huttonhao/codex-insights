---
name: codex-insights
description: Use when the user asks for Codex insights, Codex history analytics, session insights, repository analysis, workspace deep analysis, 会话洞察, 洞察分析, RAG 深度分析, or similar natural-language requests. Generates evidence-backed JSON, HTML, or Markdown reports through the codex-insights MCP server.
---

# Codex Insights

Use this skill when the user asks for:

- `insights`
- `session insights`
- `generate Codex insights`
- `analyze current repo`
- `show project trends`
- `analyze my Codex history`
- `生成本次 Codex 会话洞察分析`
- `分析当前 repo 的 Codex 改动质量`
- `分析我最近怎么使用 Codex`
- `扫描我的 workspace，深度分析 RAG/Agent/LLM Gateway`

## Current Boundary

Codex Insights is currently a natural-language skill, MCP server, and CLI workflow. Do not describe it as a Codex internal slash command.

## Mode Selection

- Use session mode when the user provides a session file or asks about the current Codex session.
- Use Codex history mode when the user asks about recent Codex usage, active projects, common tasks, tool friction, AGENTS.md suggestions, or Claude Code Insights-style personal analytics.
- Use repo mode when the user asks about the current repository, git changes, command evidence, or local code quality.
- Use workspace deep mode when the user asks about multiple projects, cross-project topics, RAG, Agent, LLM Gateway, or platformization.

## Workflow

1. Preserve the user's language. Use `zh-CN` for Chinese requests, `en-US` for English requests, and `auto` when unclear.
2. Choose the MCP tool:
   - `get_session_insights`
   - `get_repo_insights`
   - `get_workspace_insights`
   - `get_codex_history_insights`
   - `doctor`
3. Pass:
   - `locale`
   - `format`: prefer `markdown` for chat responses and `json` for automation
   - `deep`: `true` for workspace topic analysis
   - `topics`: include requested topics such as `rag`, `agent`, `llm-gateway`
   - `sessionsDir`, `limit`, `minUserMessages`, and `minDurationMinutes` for history analysis when relevant
   - `dryRun: true` when the user wants parser validation without facet extraction
   - `noLlm: true` unless the user explicitly asks for LLM-assisted facets
   - `llmFacets: true` only when the user accepts `codex exec` summarization
   - `save`: `true` unless the user asks only for a preview
4. Return the generated Markdown summary, saved report paths, and any data-quality warnings.

## Report Sections To Expect

History, repo, and workspace reports should expose these sections when the underlying evidence exists:

- At a Glance / 总览
- What You Work On / 你主要在做什么
- How You Use Codex / 你如何使用 Codex
- Where Things Go Wrong / 问题经常出在哪里
- Suggested AGENTS.md Additions / 建议加入 AGENTS.md 的规则
- Workspace Quality Matrix / 工作区质量证据矩阵
- Deep Topic Reports / 深度专题报告
- Trend Comparison / 趋势对比

## Data Quality Rules

- Treat `dataQuality` warnings as part of the answer.
- If session history is missing or unavailable, say so plainly.
- Codex JSONL history is best-effort because it is not a public stable analytics contract.
- Never claim a test count, file edit count, tool-call count, or RAG maturity without evidence.
- Unknown is unknown; do not convert unavailable data into zero.
- Conclusions without evidence must be phrased as inference, not fact.
- Redacted transcript snippets and LLM facets are supporting context, not proof.
