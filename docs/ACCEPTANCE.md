# Acceptance

Run these checks before claiming the implementation is ready.

## Static Checks

```bash
git status --short
find packages -maxdepth 5 -type f | sort
empty_input_terms='toolCalls: '"\\[\\]"'|filesTouched: '"\\[\\]"'|testsRun: '"0|warnings: "'\\[\\]'
trigger_terms='native ''/insights|原生 ''/insights|slash '"command"
quality_terms='TO'"DO|FIX"'ME|mo'"ck|fa"'ke|place'"holder"
grep -R "$empty_input_terms" -n packages README.md skills docs || true
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
npm run cli -- report --locale zh-CN --deep --workspace packages/core/test/fixtures/workspace-rag --format json --no-save
npm run cli -- report --locale zh-CN --deep --workspace packages/core/test/fixtures/workspace-rag --format markdown --no-save
```

## Expected Evidence

The JSON report must include:

- `schemaVersion: "2.0"`
- `dataQuality`
- `scanSummary`
- `metrics`
- `deepTopics`
- `deepTopics[rag].projectMaturity`
- `deepTopics[rag].recommendedArchitecture`
- `deepTopics[rag].platformizationRecommendation`

The Markdown and HTML reports must show:

- summary
- data-quality warnings
- session/repo/workspace metrics
- topic overview
- RAG deep dive
- maturity distribution
- project maturity table
- evidence list
- recommendations
- risks
- trend comparison
