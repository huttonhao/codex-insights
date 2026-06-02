# Codex Insights Design

## Goal

Codex Insights is a Codex plugin that lets users type natural-language prompts such as `insights`, `session insights`, or `generate insights for this session` and receive a localized report about the current Codex session and project trend.

The product should feel close to Claude Code `/insights`, without depending on unsupported custom slash command registration in Codex.

## User Experience

1. The customer installs the `codex-insights` plugin.
2. The customer opens Codex and types `insights`, `show session insights`, or a localized equivalent such as `生成本次 Codex 会话洞察`.
3. The plugin skill recognizes the intent and instructs Codex to call the MCP server.
4. The MCP server reads local Codex session logs and project context.
5. The server generates a structured report model and renders it as a localized Tailwind-styled HTML report.
6. The report is saved locally with a date-based versioned filename.
7. On later runs, the server compares the current report with previous reports and includes trend information.

## Architecture

The repository uses a monorepo layout:

- `skills/codex-insights` contains the Codex skill that routes natural-language insight requests.
- `packages/core` contains shared analysis, report rendering, history storage, and i18n logic.
- `packages/mcp-server` exposes Codex-callable MCP tools that use `packages/core`.
- `packages/cli` exposes a terminal workflow for local reporting and automation.
- `.codex-plugin/plugin.json` and `.mcp.json` make the package installable as a Codex plugin.

Core logic must not live inside the skill. The skill is only the model-facing workflow layer. Analysis, i18n, report versioning, and trend comparison live in `packages/core` so the MCP server and CLI behave consistently.

## Directory Design

```text
codex-insights/
├─ .codex-plugin/
│  └─ plugin.json
├─ .mcp.json
├─ package.json
├─ tsconfig.json
├─ README.md
├─ docs/
│  ├─ usage.md
│  ├─ architecture.md
│  ├─ i18n.md
│  └─ superpowers/
│     ├─ specs/
│     └─ plans/
├─ skills/
│  └─ codex-insights/
│     └─ SKILL.md
├─ packages/
│  ├─ core/
│  │  ├─ src/
│  │  │  ├─ index.ts
│  │  │  ├─ sessions/
│  │  │  ├─ git/
│  │  │  ├─ insights/
│  │  │  ├─ history/
│  │  │  ├─ i18n/
│  │  │  └─ privacy/
│  │  └─ test/
│  ├─ mcp-server/
│  │  ├─ src/
│  │  └─ test/
│  └─ cli/
│     ├─ src/
│     └─ test/
├─ assets/
└─ examples/
```

## Internationalization

Input internationalization has two layers:

- The skill lists common trigger phrases in multiple languages and tells Codex to preserve the user's requested language.
- The MCP server accepts `locale` on every public report tool. `auto` resolves from explicit input, conversation language, environment variables, then `en-US`.

Output internationalization is renderer based:

- Analysis produces a stable `InsightReport` object with language-neutral keys.
- `outputRenderer` turns the report object into Markdown using locale message catalogs.
- Initial supported locales are `en-US` and `zh-CN`.
- Unsupported locales fall back to `en-US`, while preserving the requested locale in metadata.

## HTML Report Output

The customer-facing report is an HTML document. It uses TailwindCSS utility classes for visual design and should be comfortable to open directly from the local filesystem.

The HTML report includes:

- A summary header with repository, session, and generated time.
- Metric cards for tool calls, touched files, tests run, and warnings.
- A localized trend section that compares the current report with previous local reports.
- A recommendations section.

JSON remains the internal saved model for trend comparison and automation.

## Report History And Trend Analysis

Reports are saved locally instead of overwritten. The default directory is:

```text
.codex-insights/reports/
```

Each generated report creates:

```text
YYYY-MM-DDTHH-mm-ss_<session-id>_<locale>.json
YYYY-MM-DDTHH-mm-ss_<session-id>_<locale>.html
```

The JSON file stores the structured report model. The HTML file stores the rendered customer-facing report.

On each run:

1. Load the current session data.
2. Generate the current `InsightReport`.
3. Load previous JSON reports from `.codex-insights/reports/`.
4. Pick the latest comparable report for the same repository.
5. Compute trend deltas such as session count, tool call count, files touched, tests run, and unresolved warnings.
6. Include a localized trend section in the output.

If no previous report exists, the trend section states that this is the baseline report.

## MCP Tool Surface

The MCP server exposes these tools:

- `get_session_insights`: Generate the current session report and return rendered Markdown plus metadata.
- `get_project_insights`: Generate a trend-oriented report from recent saved reports.
- `render_insights_report`: Render a provided report model in a requested locale.
- `list_supported_locales`: Return supported locale codes and fallback behavior.

All report tools accept:

```ts
{
  locale?: "auto" | "en-US" | "zh-CN";
  outputFormat?: "html" | "json";
  detailLevel?: "brief" | "standard" | "deep";
  save?: boolean;
}
```

## CLI Surface

The CLI mirrors the MCP behavior:

```bash
codex-insights report --locale zh-CN
codex-insights report --locale en-US --format json
codex-insights locales
codex-insights doctor
```

## Privacy

The analyzer must default to metadata-focused reporting. It should summarize file paths, command categories, tool counts, and high-level activity. It should not include long transcript excerpts unless the user opts into deep output.

The redaction layer removes common secrets from saved JSON and Markdown reports.

## Testing

Tests must cover:

- Locale resolution and fallback.
- English and Chinese report rendering from the same report model.
- Date-versioned report filenames.
- Loading previous reports and computing trend deltas.
- CLI argument handling.
- MCP tool schema behavior.

## Open Decisions

The first implementation will store local history under `.codex-insights/reports/` in the current repository. A future version can add a global user-level history store for cross-repository trends.
