export const securityMessages = {
  "security.finding.method": "Security is evaluated across secret handling, input validation, auth boundaries, dependency scans, audit trails, policy docs, and tests.",
  "security.finding.coverage": "{count}/{total} projects contain security evidence; missing secrets/ACL/tests blocks production AI use.",
  "security.architecture.rationale.secret": "Secrets and permission boundaries must precede platform reuse.",
  "security.architecture.rationale.audit": "Dependency scanning and audit trails make security operable.",
  "security.architecture.rationale.tests": "Security tests should be part of quality gates."
} as const;
