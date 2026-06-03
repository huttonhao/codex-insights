export const qualityMessages = {
  "quality.finding.matrix": "Quality is derived from the workspace quality matrix, not keyword signals.",
  "quality.finding.reference": "{projects} has a strong quality-gate candidate profile.",
  "quality.finding.noReference": "No project has a strong quality-gate candidate profile.",
  "quality.risk.missing": "Quality gate is missing {dimension}.",
  "quality.action.add": "Add {dimension} before expanding implementation.",
  "quality.platform.reason": "Quality gates should become workspace templates and AGENTS.md rules.",
  "quality.platform.plan.patch": "Patch projects missing test scripts/CI.",
  "quality.platform.plan.template": "Extract shared CI templates.",
  "quality.platform.plan.rules": "Document static checks in AGENTS.md.",
  "quality.architecture.rationale.staticFirst": "Static inspection should precede test/build checks.",
  "quality.architecture.rationale.ci": "CI required checks are the minimum cross-project quality baseline.",
  "quality.architecture.rationale.failureEvidence": "Failed commands should become evidence to avoid repeated debugging."
} as const;
