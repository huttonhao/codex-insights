# Codex Insights Deep Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build real data collection, workspace scanning, topic maturity analysis, RAG deep analysis, honest data-quality reporting, CLI/MCP access, localized HTML/Markdown output, trend comparison, and quality gates.

**Architecture:** `packages/core` owns data models, collectors, scanners, analyzers, renderers, history, and contract-safe report generation. `packages/cli` and `packages/mcp-server` become thin adapters over core. Skill and docs describe natural-language skill/MCP/CLI usage and current evidence boundaries.

**Tech Stack:** TypeScript, Node.js `child_process`, `fs/promises`, Commander, MCP SDK, Vitest, Tailwind CDN for static HTML reports.

---

## File Structure

- Create `packages/core/src/model/*.ts` for report, evidence, topic, project, command, and data-quality contracts.
- Create `packages/core/src/collectors/*.ts` for git, session, command evidence, and workspace file collection.
- Create `packages/core/src/insights/topicAnalyzer.ts`, `ragAnalyzer.ts`, `projectMaturity.ts`, and `recommendationEngine.ts`.
- Replace the old session-only analyzer behavior in `packages/core/src/insights/analyzer.ts` with report generation that preserves unknown data as data-quality records.
- Extend `packages/core/src/i18n/outputRenderer.ts` with HTML and Markdown deep-report renderers.
- Extend `packages/core/src/history/reportHistory.ts` and `packages/core/src/insights/trends.ts` for comparable report deltas.
- Replace `packages/cli/src/main.ts` report wiring with repo/session/workspace modes, deep options, output formats, saving, and doctor checks.
- Replace `packages/mcp-server/src/tools.ts` and update `packages/mcp-server/src/server.ts` with session, repo, workspace, locales, and doctor tools.
- Add fixtures under `packages/core/test/fixtures/`.
- Add required unit, fixture, CLI, MCP, and report contract tests.
- Update `README.md`, `skills/codex-insights/SKILL.md`, `docs/DATA_SOURCES.md`, `docs/DEEP_ANALYSIS.md`, and `docs/ACCEPTANCE.md`.

## Task 1: Report Contracts And Data Quality

**Files:**
- Create: `packages/core/src/model/dataQuality.ts`
- Create: `packages/core/src/model/evidence.ts`
- Create: `packages/core/src/model/topic.ts`
- Create: `packages/core/src/model/project.ts`
- Create: `packages/core/src/model/report.ts`
- Test: `packages/core/test/dataQuality.test.ts`
- Test: `packages/core/test/reportContract.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write data-quality and report contract tests**

Assert that missing session data is represented as `missing` or `unavailable`, that unknown test execution does not become `0`, and that reports include `schemaVersion`, `dataQuality`, `scanSummary`, `metrics`, and `deepTopics`.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- packages/core/test/dataQuality.test.ts packages/core/test/reportContract.test.ts`

- [ ] **Step 3: Implement the model files and exports**

Add typed contracts for `Evidence`, `DataQuality`, `TopicMaturity`, `ProjectProfile`, `DeepTopicReport`, `InsightReport`, `ScanSummary`, and command evidence.

- [ ] **Step 4: Re-run the focused tests and keep them green**

Run: `npm test -- packages/core/test/dataQuality.test.ts packages/core/test/reportContract.test.ts`

## Task 2: Session And Command Evidence Collectors

**Files:**
- Create: `packages/core/src/collectors/codexSessionCollector.ts`
- Create: `packages/core/src/collectors/commandEvidenceCollector.ts`
- Create: `packages/core/test/fixtures/session-with-tools.json`
- Create: `packages/core/test/fixtures/session-with-failures.json`
- Create: `packages/core/test/fixtures/session-empty.json`
- Test: `packages/core/test/codexSessionCollector.test.ts`
- Test: `packages/core/test/commandEvidenceCollector.test.ts`

- [ ] **Step 1: Write collector tests**

Cover `sessionFile`, inline JSON, environment file paths, empty session files, command classification, package script discovery, and unknown test state.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- packages/core/test/codexSessionCollector.test.ts packages/core/test/commandEvidenceCollector.test.ts`

- [ ] **Step 3: Implement collectors**

Support explicit session files and JSON first. Add best-effort environment and common-path discovery with data-quality records when nothing is found. Classify test/build/lint/typecheck/docker commands without converting unknowns to zero.

- [ ] **Step 4: Re-run the focused tests**

Run: `npm test -- packages/core/test/codexSessionCollector.test.ts packages/core/test/commandEvidenceCollector.test.ts`

## Task 3: Git Collector

**Files:**
- Create: `packages/core/src/collectors/gitCollector.ts`
- Test: `packages/core/test/gitCollector.test.ts`

- [ ] **Step 1: Write git collector tests**

Create a temporary git repo in the test, commit a file, change a source file, stage a config file, add an untracked doc, and assert branch, commit, status groups, recent commits, diff summary, file classifications, and command evidence.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- packages/core/test/gitCollector.test.ts`

- [ ] **Step 3: Implement `collectGitContext(repoPath)`**

Use `child_process.execFile` with bounded output. Return data-quality warnings instead of top-level crashes when git commands fail.

- [ ] **Step 4: Re-run the focused test**

Run: `npm test -- packages/core/test/gitCollector.test.ts`

## Task 4: Workspace Scanner And Topic Analyzer

**Files:**
- Create: `packages/core/src/collectors/workspaceScanner.ts`
- Create: `packages/core/src/insights/topicAnalyzer.ts`
- Create: `packages/core/test/fixtures/workspace-rag/**`
- Test: `packages/core/test/workspaceScanner.test.ts`
- Test: `packages/core/test/topicAnalyzer.test.ts`

- [ ] **Step 1: Write scanner and topic tests**

Cover project discovery, ignored directories, scan limits, binary/minified/lock skipping, language/framework/provider detection, evidence snippets, and generic topic maturity.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- packages/core/test/workspaceScanner.test.ts packages/core/test/topicAnalyzer.test.ts`

- [ ] **Step 3: Implement scanner and generic analyzer**

Detect projects by git and common build manifests. Scan bounded text files, collect evidence, and apply topic definitions for the required default topics.

- [ ] **Step 4: Re-run the focused tests**

Run: `npm test -- packages/core/test/workspaceScanner.test.ts packages/core/test/topicAnalyzer.test.ts`

## Task 5: RAG Deep Analyzer And Recommendations

**Files:**
- Create: `packages/core/src/insights/ragAnalyzer.ts`
- Create: `packages/core/src/insights/projectMaturity.ts`
- Create: `packages/core/src/insights/recommendationEngine.ts`
- Test: `packages/core/test/ragAnalyzer.test.ts`
- Test: `packages/core/test/recommendationEngine.test.ts`

- [ ] **Step 1: Write RAG analyzer tests**

Use the fixture workspace to assert `mention_only`, `design_only`, `prototype`, `partial`, and `production_ready` outcomes, dimension detection, evidence shape, maturity distribution, recommended architecture, reference projects, and platformization.

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npm test -- packages/core/test/ragAnalyzer.test.ts packages/core/test/recommendationEngine.test.ts`

- [ ] **Step 3: Implement RAG dimension analysis**

Detect the twenty required RAG dimensions from file paths, dependencies, configs, and code patterns. Rank maturity from evidence rather than keyword counts alone.

- [ ] **Step 4: Implement recommendations**

Generate platformization guidance when multiple projects mention or implement RAG. Select reference implementations by maturity, dimension coverage, tests, and evidence quality.

- [ ] **Step 5: Re-run the focused tests**

Run: `npm test -- packages/core/test/ragAnalyzer.test.ts packages/core/test/recommendationEngine.test.ts`

## Task 6: Report Generation, Rendering, And History

**Files:**
- Modify: `packages/core/src/insights/analyzer.ts`
- Modify: `packages/core/src/i18n/messageCatalog.ts`
- Modify: `packages/core/src/i18n/outputRenderer.ts`
- Modify: `packages/core/src/history/reportHistory.ts`
- Modify: `packages/core/src/insights/trends.ts`
- Test: `packages/core/test/outputRenderer.test.ts`
- Test: `packages/core/test/reportHistory.test.ts`
- Test: `packages/core/test/analyzer.test.ts`

- [ ] **Step 1: Write renderer and history tests**

Assert JSON report stability, HTML sections, Markdown sections, data-quality visibility, RAG deep-dive rendering, and trend deltas from prior comparable reports.

- [ ] **Step 2: Run focused tests and verify failures**

Run: `npm test -- packages/core/test/outputRenderer.test.ts packages/core/test/reportHistory.test.ts packages/core/test/analyzer.test.ts`

- [ ] **Step 3: Implement report generation and renderers**

Build reports from session, repo, or workspace inputs. Render HTML as a real report, render Markdown for copyable output, and attach trend comparison before saving the new report.

- [ ] **Step 4: Re-run focused tests**

Run: `npm test -- packages/core/test/outputRenderer.test.ts packages/core/test/reportHistory.test.ts packages/core/test/analyzer.test.ts`

## Task 7: CLI And MCP Adapters

**Files:**
- Modify: `packages/cli/src/main.ts`
- Modify: `packages/mcp-server/src/tools.ts`
- Modify: `packages/mcp-server/src/server.ts`
- Test: `packages/cli/test/cli.test.ts`
- Test: `packages/mcp-server/test/tools.test.ts`

- [ ] **Step 1: Write CLI and MCP tests**

Cover report modes, `--repo`, `--workspace`, `--deep`, `--topics`, `--session-file`, JSON/HTML/Markdown formats, `--no-save`, `locales`, `doctor`, and MCP tool responses.

- [ ] **Step 2: Run focused tests and verify failures**

Run: `npm test -- packages/cli/test/cli.test.ts packages/mcp-server/test/tools.test.ts`

- [ ] **Step 3: Implement adapters**

Wire CLI and MCP to core report generation. Keep MCP responses structured with `report`, `dataQuality`, `warnings`, optional output path, and optional Markdown summary.

- [ ] **Step 4: Re-run focused tests**

Run: `npm test -- packages/cli/test/cli.test.ts packages/mcp-server/test/tools.test.ts`

## Task 8: Documentation And Skill

**Files:**
- Modify: `README.md`
- Modify: `skills/codex-insights/SKILL.md`
- Create: `docs/DATA_SOURCES.md`
- Create: `docs/DEEP_ANALYSIS.md`
- Create: `docs/ACCEPTANCE.md`

- [ ] **Step 1: Update docs**

Document session-file data, git data, workspace scanner data, best-effort Codex history limits, data-quality meanings, topic analysis, RAG maturity, and acceptance commands.

- [ ] **Step 2: Update skill guidance**

Describe natural-language triggers, session/repo/workspace modes, data-quality warnings, and evidence boundaries.

- [ ] **Step 3: Run docs consistency checks**

Run the unsupported-trigger wording grep from `docs/ACCEPTANCE.md`.

## Task 9: Final Quality Gates And Commits

**Files:**
- All implementation and documentation files.

- [ ] **Step 1: Run static checks**

Run the exact static grep and file commands required by the task.

- [ ] **Step 2: Run installation, tests, build, doctor, and CLI smoke commands**

Run:

```bash
npm install
npm test
npm run build
npm run cli -- doctor
npm run cli -- report --locale zh-CN --deep --workspace packages/core/test/fixtures/workspace-rag --format json --no-save
npm run cli -- report --locale zh-CN --deep --workspace packages/core/test/fixtures/workspace-rag --format markdown --no-save
```

- [ ] **Step 3: Fix every failure and re-run the failing command**

Each failed command gets a targeted fix and a fresh run.

- [ ] **Step 4: Commit**

Commit the implementation with a conventional English message after all required gates pass.
