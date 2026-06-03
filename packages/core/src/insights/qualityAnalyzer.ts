import type { SupportedLocale } from "../i18n/localeResolver.js";
import { tx } from "../i18n/index.js";
import type { ProjectProfile } from "../model/project.js";
import type {
  DeepTopicReport,
  ProjectTopicMaturity,
  TopicMaturity
} from "../model/topic.js";

export function analyzeQualityProjects(
  projects: ProjectProfile[],
  locale: SupportedLocale = "en-US"
): DeepTopicReport {
  const projectMaturity = projects.map((project) => qualityMaturity(project, locale));
  const distribution: Record<TopicMaturity, number> = {
    none: 0,
    mention_only: 0,
    design_only: 0,
    prototype: 0,
    partial: 0,
    production_ready: 0
  };
  for (const project of projectMaturity) {
    distribution[project.maturity] += 1;
  }
  const referenceProjects = projectMaturity
    .filter((project) => project.maturity === "production_ready" || project.maturity === "partial")
    .sort((left, right) => right.implementedDimensions.length - left.implementedDimensions.length)
    .map((project) => project.projectName)
    .slice(0, 3);

  return {
    topic: "quality",
    totalProjects: projects.length,
    mentionedProjects: projectMaturity.filter((project) => project.maturity !== "none").length,
    maturityDistribution: distribution,
    projectMaturity,
    crossProjectFindings: [
      tx(locale, "quality.finding.matrix"),
      referenceProjects.length
        ? tx(locale, "quality.finding.reference", { projects: referenceProjects.join(", ") })
        : tx(locale, "quality.finding.noReference")
    ],
    repeatedPatterns: ["test script", "CI", "test files", "build config", "lint", "typecheck"],
    duplicationRisks: [],
    recommendedReferenceProjects: referenceProjects,
    recommendedArchitecture: {
      name: "Quality Gate Baseline",
      stages: ["Static Inspection", "Lint", "Typecheck", "Unit Tests", "Build", "CI Required Checks", "Evidence Logging"],
      rationale: [
        tx(locale, "quality.architecture.rationale.staticFirst"),
        tx(locale, "quality.architecture.rationale.ci"),
        tx(locale, "quality.architecture.rationale.failureEvidence")
      ]
    },
    platformizationRecommendation: {
      shouldPlatformize: projects.length > 1,
      reason: tx(locale, "quality.platform.reason"),
      proposedModules: ["static checks", "test/build scripts", "CI workflow", "failure evidence logging"],
      migrationPlan: [
        tx(locale, "quality.platform.plan.patch"),
        tx(locale, "quality.platform.plan.template"),
        tx(locale, "quality.platform.plan.rules")
      ]
    }
  };
}

function qualityMaturity(project: ProjectProfile, locale: SupportedLocale): ProjectTopicMaturity {
  const summary = project.qualitySummary;
  const implemented = [
    summary?.hasTestScript ? "test script" : "",
    summary?.hasCi ? "CI" : "",
    summary?.hasTestFiles ? "test files" : "",
    summary?.hasBuildConfig ? "build config" : "",
    summary?.hasExecutedTestEvidence ? "executed test evidence" : "",
    summary?.hasLint ? "lint" : "",
    summary?.hasTypecheck ? "typecheck" : "",
    summary?.hasDocker ? "docker" : ""
  ].filter(Boolean);
  const required = ["test script", "CI", "test files", "build config", "lint"];
  const missing = required.filter((item) => !implemented.includes(item));
  const maturity: TopicMaturity =
    implemented.length >= 6 && missing.length === 0
      ? "production_ready"
      : implemented.length >= 4
        ? "partial"
        : implemented.length >= 2
          ? "prototype"
          : implemented.length === 1
            ? "mention_only"
            : "none";

  return {
    projectName: project.name,
    maturity,
    implementedDimensions: implemented,
    missingDimensions: missing,
    evidence: project.evidence.slice(0, 6),
    risks: missing.map((item) => tx(locale, "quality.risk.missing", { dimension: item })),
    recommendedNextActions: missing
      .slice(0, 3)
      .map((item) => tx(locale, "quality.action.add", { dimension: item }))
  };
}
