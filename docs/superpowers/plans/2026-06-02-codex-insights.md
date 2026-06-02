# Codex Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Codex Insights plugin with shared i18n-aware reporting, date-versioned local report history, trend comparison, MCP tool wrappers, and a CLI.

**Architecture:** Use a Node.js TypeScript monorepo. `packages/core` owns report data structures, i18n rendering, report history, and trend comparison; `packages/mcp-server` and `packages/cli` call core; `skills/codex-insights` routes natural-language prompts to MCP tools.

**Tech Stack:** TypeScript, Node.js, npm workspaces, Vitest, Commander, `@modelcontextprotocol/sdk`.

---

## File Structure

- Create `package.json` for workspace scripts, dependencies, and CLI bin wiring.
- Create `tsconfig.json` for shared TypeScript compiler settings.
- Create `vitest.config.ts` for tests across packages.
- Create `.codex-plugin/plugin.json` and `.mcp.json` for plugin and MCP registration.
- Create `skills/codex-insights/SKILL.md` for Codex-facing behavior.
- Create `packages/core/src` for locale, report, history, trend, and rendering modules.
- Create `packages/mcp-server/src` for MCP tool registration.
- Create `packages/cli/src` for `codex-insights` terminal commands.
- Create tests under each package before production implementation.

## Task 1: Project Skeleton And Core Locale Tests

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `packages/core/test/localeResolver.test.ts`
- Create: `packages/core/src/i18n/localeResolver.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Add workspace configuration**

Create root Node configuration with `test`, `build`, and CLI scripts. Use npm workspaces for `packages/*`.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

- [ ] **Step 3: Write failing locale tests**

Add tests proving that explicit locale wins, Chinese text resolves to `zh-CN`, English text resolves to `en-US`, and unsupported locales fall back to `en-US`.

- [ ] **Step 4: Run locale test to verify RED**

Run: `npm test -- packages/core/test/localeResolver.test.ts`

Expected: FAIL because `resolveLocale` does not exist.

- [ ] **Step 5: Implement minimal locale resolver**

Implement `resolveLocale` with supported locales `en-US` and `zh-CN`.

- [ ] **Step 6: Run locale test to verify GREEN**

Run: `npm test -- packages/core/test/localeResolver.test.ts`

Expected: PASS.

## Task 2: Localized Report Rendering

**Files:**
- Create: `packages/core/test/outputRenderer.test.ts`
- Create: `packages/core/src/insights/reportModel.ts`
- Create: `packages/core/src/i18n/locales/en-US.ts`
- Create: `packages/core/src/i18n/locales/zh-CN.ts`
- Create: `packages/core/src/i18n/messageCatalog.ts`
- Create: `packages/core/src/i18n/outputRenderer.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing renderer tests**

Add tests that render the same `InsightReport` into English and Chinese Markdown, including a baseline trend message.

- [ ] **Step 2: Run renderer test to verify RED**

Run: `npm test -- packages/core/test/outputRenderer.test.ts`

Expected: FAIL because report types and renderer do not exist.

- [ ] **Step 3: Implement report model and locale catalogs**

Define `InsightReport`, `TrendSummary`, and catalog messages for English and Chinese.

- [ ] **Step 4: Implement Markdown renderer**

Render title, summary, metrics, recommendations, and trend sections.

- [ ] **Step 5: Run renderer test to verify GREEN**

Run: `npm test -- packages/core/test/outputRenderer.test.ts`

Expected: PASS.

## Task 3: Date-Versioned History And Trend Comparison

**Files:**
- Create: `packages/core/test/reportHistory.test.ts`
- Create: `packages/core/src/history/reportHistory.ts`
- Create: `packages/core/src/insights/trends.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing history tests**

Add tests for deterministic date-versioned filenames, saving JSON and Markdown, loading latest previous report, and computing metric deltas.

- [ ] **Step 2: Run history test to verify RED**

Run: `npm test -- packages/core/test/reportHistory.test.ts`

Expected: FAIL because history and trend modules do not exist.

- [ ] **Step 3: Implement report history storage**

Store reports under `.codex-insights/reports/` by default. Use ISO-like filenames safe for filesystems.

- [ ] **Step 4: Implement trend comparison**

Compare current metrics against the latest previous report for the same repository.

- [ ] **Step 5: Run history test to verify GREEN**

Run: `npm test -- packages/core/test/reportHistory.test.ts`

Expected: PASS.

## Task 4: Insight Analyzer

**Files:**
- Create: `packages/core/test/analyzer.test.ts`
- Create: `packages/core/src/insights/analyzer.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Write failing analyzer tests**

Add tests that convert simple session metadata into an `InsightReport` with counts, recommendations, and trend baseline.

- [ ] **Step 2: Run analyzer test to verify RED**

Run: `npm test -- packages/core/test/analyzer.test.ts`

Expected: FAIL because analyzer does not exist.

- [ ] **Step 3: Implement minimal analyzer**

Implement deterministic analysis from provided session metadata without parsing real Codex transcripts yet.

- [ ] **Step 4: Run analyzer test to verify GREEN**

Run: `npm test -- packages/core/test/analyzer.test.ts`

Expected: PASS.

## Task 5: CLI

**Files:**
- Create: `packages/cli/test/cli.test.ts`
- Create: `packages/cli/src/main.ts`
- Create: `packages/cli/src/commands/report.ts`

- [ ] **Step 1: Write failing CLI tests**

Add tests for `locales` and `report --locale zh-CN --no-save` behavior.

- [ ] **Step 2: Run CLI test to verify RED**

Run: `npm test -- packages/cli/test/cli.test.ts`

Expected: FAIL because CLI entrypoint does not exist.

- [ ] **Step 3: Implement CLI**

Use Commander to expose `report`, `locales`, and `doctor`.

- [ ] **Step 4: Run CLI test to verify GREEN**

Run: `npm test -- packages/cli/test/cli.test.ts`

Expected: PASS.

## Task 6: MCP Server And Plugin Packaging

**Files:**
- Create: `packages/mcp-server/test/tools.test.ts`
- Create: `packages/mcp-server/src/server.ts`
- Create: `packages/mcp-server/src/tools.ts`
- Create: `.codex-plugin/plugin.json`
- Create: `.mcp.json`
- Create: `skills/codex-insights/SKILL.md`
- Create: `README.md`

- [ ] **Step 1: Write failing MCP tool tests**

Add tests for `listSupportedLocales` and `getSessionInsights` tool handler output.

- [ ] **Step 2: Run MCP tests to verify RED**

Run: `npm test -- packages/mcp-server/test/tools.test.ts`

Expected: FAIL because MCP tools do not exist.

- [ ] **Step 3: Implement MCP tool handlers**

Expose pure handler functions first, then wire them to the MCP SDK in `server.ts`.

- [ ] **Step 4: Add plugin manifest and skill**

Register plugin metadata, MCP server config, and skill trigger instructions.

- [ ] **Step 5: Run MCP tests to verify GREEN**

Run: `npm test -- packages/mcp-server/test/tools.test.ts`

Expected: PASS.

## Task 7: Full Verification

**Files:**
- Modify as needed only for test or build failures.

- [ ] **Step 1: Run complete tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: TypeScript emits `dist` files without errors.

- [ ] **Step 3: Inspect git status**

Run: `git status --short`

Expected: only intended project files are changed; pre-existing untracked `.gitignore` remains untouched unless the user asks to add it.
