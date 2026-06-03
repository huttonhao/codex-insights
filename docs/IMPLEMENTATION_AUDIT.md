# Implementation Audit

Date: 2026-06-03

This audit records the repository state before the Codex history, usage analytics, generic deep topic, and product-report implementation work.

## Static Checks Run

The requested commands were run from the repository root:

```bash
git status --short
find . -maxdepth 4 -type f | sort
find packages -maxdepth 6 -type f | sort
grep -R "createDeepTopicReports\\|analyzeRagProjects\\|analyzeSession\\|collectCommandEvidence\\|codex-history\\|rollout-.*jsonl" -n packages README.md docs skills || true
grep for main-path empty report defaults such as empty tool calls, files touched, test count, or warnings
grep for direct provider API-key environment-variable dependencies
grep for unsupported Codex internal slash-command wording
```

Results:

- `git status --short` was clean.
- `find .` showed generated local report files under `.codex-insights/reports/`, existing `dist/`, `node_modules/`, project docs, source, tests, and workflow files. These generated and dependency directories are not part of the intended product changes.
- `find packages` showed the current monorepo packages: `core`, `cli`, and `mcp-server`.
- Empty main-path data grep found no matches.
- API-key grep found no direct provider API-key environment-variable dependency in this repository.
- Unsupported native `/insights` wording grep found no matches.

## Current CLI Modes

The CLI entry is `packages/cli/src/main.ts`.

Current commands:

- `report`
- `locales`
- `doctor`

Current `report` modes are inferred from options:

- `--workspace`: workspace mode
- `--session-file` or `--session-json`: session mode
- otherwise repo mode

The CLI does not yet support `--codex-history`, `--sessions-dir`, `--limit`, `--min-user-messages`, `--min-duration-minutes`, `--dry-run`, `--no-llm`, `--llm-facets`, `--redact`, or `--no-transcript-snippets`.

## Current MCP Tools

The MCP handlers live in `packages/mcp-server/src/tools.ts`.

Current callable handlers:

- `getSessionInsights`
- `getRepoInsights`
- `getWorkspaceInsights`
- `doctor`
- `listSupportedLocales`

There is no `getCodexHistoryInsights` handler yet.

## Workspace Command Evidence

Workspace mode currently calls `collectCommandEvidence({ repoPath: project.path })` for each project, attaches the result to `ProjectProfile.commandEvidence`, and aggregates it into report metrics.

Current command evidence can detect:

- package scripts
- CI workflow `run:` lines
- test files
- build config files
- executed session commands when a session JSON is supplied

It does not yet produce a first-class workspace quality matrix in JSON, Markdown, or HTML.

## Deep Topic Support

`packages/core/src/insights/analyzer.ts` contains `createDeepTopicReports()`.

Current behavior:

- RAG has a dedicated analyzer through `analyzeRagProjects(projects, locale)`.
- Non-RAG topics are scanned for evidence and maturity in `topicAnalyzer` / `projectMaturity`.
- However, `createDeepTopicReports()` only returns a RAG report when requested topics include `rag`.

Therefore `--topics rag,agent,llm-gateway` is not yet honest deep-topic support: `agent` and `llm-gateway` are omitted from `deepTopics`.

## Codex JSONL Session History

The repository currently supports explicit session JSON via `collectCodexSession()`.

It does not yet scan or parse real Codex JSONL history from:

```text
~/.codex/sessions/**/rollout-*.jsonl
```

There is no parser for old/new rollout formats, no session filtering, no dry-run history mode, no facet cache, and no `codex exec` facet extraction.

## Legacy analyzeSession

`packages/core/src/insights/analyzer.ts` still exports `analyzeSession()`.

It is a legacy helper that accepts pre-counted arrays and produces a report. It is not used by the CLI or MCP main report flows, but it is still tested by `packages/core/test/analyzer.test.ts` and is not yet marked deprecated.

## README Capability Accuracy

The README states that Codex Insights is a skill/MCP/CLI workflow inspired by Claude Code `/insights`, and explicitly says this is not a Codex internal slash-command trigger.

This is accurate and should be preserved.

## bigx333/codex-insights Comparison

The reference project `bigx333/codex-insights` was inspected from a temporary clone.

Useful capabilities in the reference project:

- scans `~/.codex/sessions/**/rollout-*.jsonl`
- parses old and new Codex JSONL formats
- extracts project, duration, messages, model, tool calls, git metadata, and transcript text
- filters sessions by minimum user messages and minimum duration
- supports `--dry-run`
- supports `--limit`
- uses `codex exec` for LLM facet extraction instead of directly requiring API keys
- caches facets under a local usage-data directory
- generates a self-contained HTML report

Important differences to preserve in this repository:

- This repository must not require direct provider API-key environment variables for baseline reports.
- LLM facets must be optional and must degrade on failure.
- Existing workspace/RAG deep analysis and evidence-backed `dataQuality` must remain part of the product.
- Reports must support JSON, Markdown, and self-contained HTML.

## Claude Code Official Analytics Gap

Claude Code official analytics emphasizes adoption and engineering activity metrics such as sessions, active days, messages, tool calls, commands, lines added/removed, accepted/rejected actions, token usage, cost, project contribution, PR/commit activity, tool errors, and daily trend.

Current repository gaps:

- no `UsageAnalytics` model
- no active-day or daily-trend aggregation from Codex session history
- no token/model/cost breakdown beyond explicit session JSON
- no accepted/rejected edit-like action model
- no command error categorization
- no PR count evidence
- no first-class `dataQuality` records per unknown analytics field

## Uploaded Claude Code Insights Report Gap

No local `usage-data.zip` or `usage-data/` directory was found under the repository, `~/Downloads`, or `/tmp`. The implementation will follow the user-described structure.

Missing report sections compared with the described Claude Code Insights report:

- At a Glance / 总览
- What You Work On / 你主要在做什么
- How You Use Codex / 你如何使用 Codex
- Impressive Things You Did / 做得不错的地方
- Where Things Go Wrong / 问题经常出在哪里
- Features / Workflows to Try / 建议尝试的能力和工作流
- Suggested AGENTS.md Additions / 建议加入 AGENTS.md 的规则
- New Ways to Use Codex / Codex 的新用法
- On the Horizon / 下一阶段机会

These sections need to be generated from session metadata, optional facets, command evidence, workspace scan results, and deep topic reports rather than fixed template filler.

## Current Test Coverage Gaps

Required tests that do not yet exist:

- `codexJsonlSessionScanner.test.ts`
- `codexJsonlSessionParser.test.ts`
- `codexHistoryInsights.test.ts`
- `sessionFacetExtractor.test.ts`
- `usageAnalytics.test.ts`
- `agentRuleSuggestions.test.ts`
- `genericTopicAnalyzer.test.ts`
- `workspaceQualityMatrix.test.ts`
- `legacyAnalyzeSession.test.ts`
- `cli.codexHistory.test.ts`
- `mcp.codexHistory.test.ts`
- `reportContract.v3.test.ts`
- `htmlReportSections.test.ts`
- `markdownReportSections.test.ts`
- `redaction.test.ts`

## Immediate Implementation Risks

- Codex rollout JSONL is a private, best-effort local format. Parsers must support multiple shapes and mark parse failures through `dataQuality`.
- Unknown analytics fields must be omitted or marked unavailable, never turned into zero.
- LLM facets are inference. They must not overwrite structured evidence.
- Session transcripts can contain secrets or absolute paths, so redaction and snippet limits must be default behavior.
