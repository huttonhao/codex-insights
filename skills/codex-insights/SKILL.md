---
name: codex-insights
description: Use when the user asks for Codex insights, session insights, repository analysis, workspace deep analysis, 会话洞察, 洞察分析, RAG 深度分析, or similar natural-language requests. Generates evidence-backed JSON, HTML, or Markdown reports through the codex-insights MCP server.
---

# Codex Insights

Use this skill when the user asks for:

- `insights`
- `session insights`
- `generate Codex insights`
- `analyze current repo`
- `show project trends`
- `生成本次 Codex 会话洞察分析`
- `分析当前 repo 的 Codex 改动质量`
- `扫描我的 workspace，深度分析 RAG/Agent/LLM Gateway`

## Current Boundary

Codex Insights is currently a natural-language skill, MCP server, and CLI workflow. Do not describe it as a built-in Codex `/insights` trigger.

## Mode Selection

- Use session mode when the user provides a session file or asks about the current Codex session.
- Use repo mode when the user asks about the current repository, git changes, command evidence, or local code quality.
- Use workspace deep mode when the user asks about multiple projects, cross-project topics, RAG, Agent, LLM Gateway, or platformization.

## Workflow

1. Preserve the user's language. Use `zh-CN` for Chinese requests, `en-US` for English requests, and `auto` when unclear.
2. Choose the MCP tool:
   - `get_session_insights`
   - `get_repo_insights`
   - `get_workspace_insights`
   - `doctor`
3. Pass:
   - `locale`
   - `format`: prefer `markdown` for chat responses and `json` for automation
   - `deep`: `true` for workspace topic analysis
   - `topics`: include requested topics such as `rag`, `agent`, `llm-gateway`
   - `save`: `true` unless the user asks only for a preview
4. Return the generated Markdown summary, saved report paths, and any data-quality warnings.

## Data Quality Rules

- Treat `dataQuality` warnings as part of the answer.
- If session history is missing or unavailable, say so plainly.
- Never claim a test count, file edit count, tool-call count, or RAG maturity without evidence.
- Unknown is unknown; do not convert unavailable data into zero.
- Conclusions without evidence must be phrased as inference, not fact.
