export const doctorMessages = {
  "doctor.node.ok": "node: {version}",
  "doctor.packageManager.ok": "package manager: npm scripts available",
  "doctor.repoRoot.ok": "repo root: {path}",
  "doctor.git.ok": "git: {version}",
  "doctor.codex.ok": "codex cli: {version}",
  "doctor.codex.missing": "codex cli not found",
  "doctor.reportDir.ok": "report dir: {path}",
  "doctor.mcp.ok": "mcp: tools importable",
  "doctor.skill.ok": "skill: {path}",
  "doctor.wording.ok": "wording: no unsupported native trigger claims found",
  "doctor.wording.warn": "wording: unsupported trigger wording found in {matches}",
  "doctor.emptyData.ok": "empty-data: no synthetic empty main-path report inputs found",
  "doctor.emptyData.warn": "empty-data: synthetic empty main-path data found in {matches}",
  "doctor.sessionsDir.ok": "sessions dir: {path}",
  "doctor.sessionsDir.missing": "sessions dir not found: {path}",
  "doctor.rollout.ok": "rollout jsonl: found {count} sample file",
  "doctor.rollout.missing": "rollout jsonl: no rollout files found"
} as const;
