# Implementation Audit

Date: 2026-06-02

This audit records the repository state before the deep analysis implementation work.

## Static Checks Run

The requested pre-implementation checks were run from the repository root:

The audit covered git status, repository file lists, package file lists, empty-report-input patterns, insights wording, deep-analysis symbols, and `package.json`.

`git status --short` showed only the local `.codex-insights/` report output directory as untracked. That directory is generated local output and should not be committed.

## Current Packages

- `packages/core`: owns the current report model, session analyzer, i18n helpers, HTML renderer, trend comparison, and local report history.
- `packages/cli`: owns the `codex-insights` CLI command implementation.
- `packages/mcp-server`: owns the MCP server entrypoint and tool handlers.

There are no dedicated collector, workspace scanner, topic analyzer, RAG analyzer, recommendation engine, or data-quality model modules yet.

## CLI Entry

The CLI entry is `packages/cli/src/main.ts`.

`package.json` exposes it through:

```json
{
  "bin": {
    "codex-insights": "./dist/packages/cli/src/main.js"
  },
  "scripts": {
    "cli": "tsx packages/cli/src/main.ts"
  }
}
```

Current commands are:

- `report`
- `locales`
- `doctor`

The current `report` command only supports a generated session-shaped report and does not collect real session, git, command, repo, or workspace evidence.

## MCP Entry

The MCP server entry is `packages/mcp-server/src/server.ts`.

The MCP tool handlers live in `packages/mcp-server/src/tools.ts`.

The current tool surface exposes session insights and locale listing only. It does not yet provide repo insights, workspace insights, doctor checks, or deep topic analysis.

## Core Analyzer

The current core analyzer is `packages/core/src/insights/analyzer.ts`.

It accepts already-populated arrays and counts, then maps them into an `InsightReport`. It does not collect evidence itself and does not distinguish unknown data from zero values.

The current report model is `packages/core/src/insights/reportModel.ts`. It does not include:

- `schemaVersion`
- `dataQuality`
- `scanSummary`
- `deepTopics`
- stable evidence records
- topic maturity records

## Deep Analysis Status

No existing implementation was found for:

- `deepTopics`
- `scanWorkspace`
- `analyzeDeepTopics`
- RAG-specific maturity analysis
- `production_ready` topic maturity handling

The existing implementation is a localized session report foundation, not a deep multi-project analysis system.

## Synthetic Empty Data

The static empty-data grep found these current matches:

```text
packages/core/test/analyzer.test.ts had an empty boundary case.
packages/mcp-server/src/tools.ts created a main-path zero test count.
packages/cli/src/main.ts created a main-path zero test count.
```

The test match is an empty-input boundary case. The CLI and MCP matches were real main-path issues: they created empty report inputs instead of collecting data or marking it unknown. These must be replaced with honest data-quality reporting.

## README Capability Accuracy

The README currently tells users to type `insights` or `生成本次 Codex 会话洞察分析`. It does not advertise a built-in `/insights` trigger.

However, the sentence "Codex routes the request through the `codex-insights` skill and MCP server" is stronger than the current implementation can guarantee without an installed skill and MCP configuration. README and skill documentation should be updated to describe this as a natural-language Codex skill/MCP/CLI workflow, not a built-in trigger.

## Test Coverage Gaps

Current tests cover the early session analyzer, i18n locale resolution, HTML rendering, report history, basic CLI behavior, and basic MCP handlers.

Missing coverage required for the next implementation stage:

- git collector tests
- Codex session collector tests
- command/test evidence collector tests
- workspace scanner tests
- topic analyzer tests
- RAG analyzer tests with fixture workspaces
- data-quality tests
- recommendation engine tests
- JSON report contract tests
- Markdown renderer tests
- HTML deep-report renderer tests
- CLI smoke tests for deep workspace reports
- doctor command tests for exaggerated `/insights` wording and synthetic empty-data checks
