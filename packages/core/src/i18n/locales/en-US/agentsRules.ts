export const agentsRulesMessages = {
  "agentsRules.staticFirst.title": "Run static checks before test and build",
  "agentsRules.staticFirst.text": "When validating code changes, run static inspection first: rg, rg --files, grep, git diff, git show, find, and tree. After static checks pass, run the relevant project test/build commands.",
  "agentsRules.staticFirst.reason": "This catches wrong files, incomplete stubs, and policy mismatches before more expensive test/build runs.",
  "agentsRules.commandFailure.title": "Record remediation for failed commands",
  "agentsRules.commandFailure.text": "When a command fails, record the command, error category, remediation, and rerun result; do not only say it was fixed.",
  "agentsRules.commandFailure.reason": "Session history contains failed-command evidence, so structured remediation reduces repeated investigation.",
  "agentsRules.default.title": "Run static checks before test/build",
  "agentsRules.default.text": "When validating code changes, run git status --short, git diff --stat, find, and grep first; after static checks pass, run project test/build commands.",
  "agentsRules.default.reason": "The report needs repeatable quality evidence; static checks catch wrong files and incomplete implementation first.",
  "agentsRules.default.evidence": "Report-level evidence: workspace scan and command evidence indicate this rule is useful.",
  "agentsRules.copy.single": "Single copy: copy any rule text.",
  "agentsRules.copy.all": "Copy all: copy every rule in this section."
} as const;
