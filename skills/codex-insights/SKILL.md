---
name: codex-insights
description: Use when the user asks for Codex insights, session insights, project trend reports, 会话洞察, 洞察分析, or similar natural-language requests. Generates localized HTML reports through the codex-insights MCP server.
---

# Codex Insights

Use this skill when the user asks for:

- `insights`
- `session insights`
- `generate Codex insights`
- `show project trends`
- `生成本次 Codex 会话洞察分析`
- `会话洞察`
- `趋势报告`

## Workflow

1. Preserve the user's language. Use `zh-CN` for Chinese requests, `en-US` for English requests, and `auto` when unclear.
2. Call the `codex-insights` MCP tool `get_session_insights`.
3. Pass:
   - `locale`: the resolved locale or `auto`
   - `save`: `true` unless the user asks only for a preview
4. Return the generated HTML report content or the saved report paths, depending on the MCP response.
5. Mention that reports are saved under `.codex-insights/reports/` when saving is enabled.

## Notes

- Do not claim `/insights` is a native slash command. Codex Insights uses natural-language triggers.
- Prefer HTML output. JSON is for automation and trend comparison.
- If the user asks for a prior trend, use the saved report history rather than overwriting existing reports.
