# Data Sources

Codex Insights is evidence-first. If a source is unavailable, the report records it in `dataQuality` and avoids turning unknown information into zero.

## Session File

The most reliable Codex session source is an explicit file:

```bash
npm run cli -- report --session-file ./session.json --format markdown
```

Expected shape:

```json
{
  "sessionId": "session-1",
  "startedAt": "2026-06-02T08:00:00.000Z",
  "endedAt": "2026-06-02T08:40:00.000Z",
  "userPrompts": [],
  "assistantActions": [],
  "toolCalls": [],
  "commands": [],
  "fileEdits": [],
  "warnings": []
}
```

The collector also accepts inline session JSON for tests and automation.

## Environment Variables

Session discovery checks these environment variables:

- `CODEX_SESSION_FILE`
- `CODEX_INSIGHTS_SESSION_FILE`
- `CODEX_INSIGHTS_WORKSPACE`

`CODEX_INSIGHTS_WORKSPACE` is interpreted as a directory that may contain `session.json`.

## Best-Effort Local History

Session-file mode checks common local candidates such as:

- current working directory `session.json`
- current working directory `codex-session.json`
- current working directory `latest-session.json`
- user-level `.codex` session candidates

These paths are best-effort. Codex does not currently expose a stable public local session-history contract to this project, so reports must show a `missing` or `unavailable` `dataQuality` record when no readable source is found.

## Codex JSONL History

Codex-history mode scans local JSONL session files:

```bash
npm run cli -- report --locale zh-CN --codex-history
npm run cli -- report --locale zh-CN --codex-history --sessions-dir ~/.codex/sessions --limit 50
npm run cli -- report --locale zh-CN --codex-history --sessions-dir ./fixtures --dry-run
```

Defaults and limits:

- default directory: `~/.codex/sessions`
- file pattern: `rollout-*.jsonl`
- recursive scan under the sessions directory
- `--limit` caps parsed files
- `--min-user-messages` filters short sessions
- `--min-duration-minutes` filters short sessions when duration is available
- `--dry-run` parses structure only and does not run facet extraction
- `--no-llm` keeps the report fully deterministic
- `--llm-facets` may call `codex exec` and cache facet summaries in `.codex-insights/cache/facets/`

Parsed fields are best-effort because Codex JSONL is not a public stable analytics schema. The parser handles old and new observed shapes and records parser failures in `dataQuality` rather than aborting the report.

Unknown fields are omitted, not converted to zero. Examples:

- token usage is only present when JSONL contains token metadata
- accepted or rejected edit-like actions are only present when a session event exposes that state
- cost estimate is only present when model and token data are sufficient
- pull-request counts are only present when local evidence can support them

## Privacy And Redaction

Local session transcripts can contain secrets, file paths, prompts, command outputs, and customer text. Codex Insights therefore:

- redacts common key, token, secret, and password patterns by default
- limits transcript snippets
- supports `--redact`
- supports `--no-transcript-snippets`
- treats LLM facets as summaries, not primary evidence
- keeps reports local unless the user explicitly moves or publishes them

Absolute paths may appear in JSON evidence where needed for local traceability. Human-facing report sections prefer project names and short file references.

## Git Data

Repo mode uses git commands through Node.js `child_process`:

- `git rev-parse --show-toplevel`
- `git branch --show-current`
- `git rev-parse HEAD`
- `git remote -v`
- `git status --short`
- `git log --oneline -5`
- `git diff --stat --stat-count=40`

Failures are recorded as `dataQuality` warnings. Diff content is not read unbounded; only a summary is collected by default.

## Command Evidence

Command evidence is inferred from:

- executed commands in session JSON
- executed commands in Codex JSONL history
- package scripts in `package.json`
- git/CI file changes
- per-project workspace quality scans
- local report history in trend comparison

Supported command families include:

- `npm test`, `pnpm test`, `yarn test`
- `npm run build`, `pnpm build`, `yarn build`
- `go test`, `go build`
- `mvn test`, `gradle test`
- `pytest`, `cargo test`
- `docker compose`
- lint and typecheck scripts

If no executed test command is found, reports set `testsRunKnown: false` and omit `testsRunCount`.

## Workspace Scanner

Workspace mode discovers projects by:

- `.git`
- `package.json`
- `pom.xml`
- `build.gradle` or `settings.gradle`
- `go.mod`
- `pyproject.toml`
- `Cargo.toml`
- `README.md` with project-like structure

Ignored directories include:

- `node_modules`
- `.git`
- `dist`
- `build`
- `target`
- `out`
- `coverage`
- `.next`
- `.nuxt`
- `.venv`
- `venv`
- `.idea`
- `.vscode`

Default scan limits protect local machines from unbounded reads:

- maximum projects
- maximum files per project
- maximum bytes per file
- maximum total bytes
- binary, lock, and minified files skipped by default

## Data Quality Status

- `ok`: source was read and usable.
- `partial`: source was read, but scan limits or command failures reduced coverage.
- `missing`: no source was provided or discovered.
- `unavailable`: source was discovered but could not be read or parsed.
