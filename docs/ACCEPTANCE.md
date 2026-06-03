# Acceptance

Run these checks before claiming the implementation is ready.

## Static Checks

```bash
git status --short
find packages -maxdepth 6 -type f | sort
grep -R "createDeepTopicReports" -n packages/core/src
grep -R "analyzeSession" -n packages README.md docs skills
empty_input_terms='toolCalls: '"\\[\\]"'|filesTouched: '"\\[\\]"'|testsRun: '"0|warnings: "'\\[\\]'
provider_key_terms='OPENAI_'"API_KEY|ANTHROPIC_"'API_KEY'
trigger_terms='native ''/insights|built-in ''/insights|原生 ''/insights'
quality_terms='TO'"DO|FIX"'ME|mo'"ck|fa"'ke|place'"holder"
grep -R "$empty_input_terms" -n packages README.md skills docs || true
grep -R "$provider_key_terms" -n packages README.md docs skills || true
grep -R "$trigger_terms" -n README.md skills docs packages || true
grep -R "$quality_terms" -n packages README.md skills docs || true
```

## Build And Test

```bash
npm install
npm test
npm run build
```

## Runtime Smoke

```bash
npm run cli -- doctor
npm run cli -- report --locale zh-CN --deep --workspace packages/core/test/fixtures/workspace-rag --topics rag,agent,llm-gateway --format markdown --no-save
npm run cli -- report --locale zh-CN --deep --workspace packages/core/test/fixtures/workspace-rag --topics rag,agent,llm-gateway --format json --no-save
npm run cli -- report --locale zh-CN --codex-history --sessions-dir packages/core/test/fixtures/codex-sessions --dry-run
npm run cli -- report --locale zh-CN --codex-history --sessions-dir packages/core/test/fixtures/codex-sessions --format markdown --no-save
npm run cli -- report --locale zh-CN --codex-history --sessions-dir packages/core/test/fixtures/codex-sessions --no-llm --format html --no-save
```

## Expected Evidence

The JSON report must include:

- `schemaVersion: "3.0"`
- `dataQuality`
- `scanSummary`
- `metrics`
- `usageAnalytics`
- `agentRuleSuggestions`
- `workspaceQuality`
- `codexHistory` when history mode is used
- `deepTopics`
- `deepTopics[rag].projectMaturity`
- `deepTopics[rag].recommendedArchitecture`
- `deepTopics[rag].platformizationRecommendation`

The Markdown and HTML reports must show:

- summary
- usage metrics
- workspace quality matrix
- data-quality warnings
- session/repo/workspace metrics
- topic overview
- RAG deep dive
- Claude-style insight sections
- suggested AGENTS.md additions
- maturity distribution
- project maturity table
- evidence list
- recommendations
- risks
- trend comparison
