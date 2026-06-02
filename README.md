# Codex Insights

Codex Insights is a Codex plugin, MCP server, and CLI for generating localized Codex session reports.

The customer-facing report is a Tailwind-styled HTML file. Structured JSON is saved beside it so future runs can compare against previous reports and describe trends.

## Usage

Inside Codex, type:

```text
insights
```

or:

```text
生成本次 Codex 会话洞察分析
```

Codex routes the request through the `codex-insights` skill and MCP server.

From the terminal:

```bash
npm run cli -- report --locale zh-CN
npm run cli -- report --locale en-US --no-save
npm run cli -- locales
```

Saved reports are written to:

```text
.codex-insights/reports/
```

Each run writes a versioned JSON model and HTML report:

```text
YYYY-MM-DDTHH-mm-ss_current-session_zh-CN.json
YYYY-MM-DDTHH-mm-ss_current-session_zh-CN.html
```

## Development

```bash
npm install
npm test
npm run build
```
