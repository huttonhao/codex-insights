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

The collector checks common local candidates such as:

- current working directory `session.json`
- current working directory `codex-session.json`
- current working directory `latest-session.json`
- user-level `.codex` session candidates

These paths are best-effort. Codex does not currently expose a stable public local session-history contract to this project, so reports must show a `missing` or `unavailable` `dataQuality` record when no readable source is found.

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
- package scripts in `package.json`
- git/CI file changes in future extensions
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
