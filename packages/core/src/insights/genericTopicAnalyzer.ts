import type { SupportedLocale } from "../i18n/localeResolver.js";
import { tx } from "../i18n/index.js";
import type { ProjectProfile } from "../model/project.js";
import type {
  DeepTopicReport,
  ProjectTopicMaturity,
  TopicMaturity
} from "../model/topic.js";
import { buildGenericPlatformizationRecommendation } from "./recommendationEngine.js";

const maturityDistribution = (): Record<TopicMaturity, number> => ({
  none: 0,
  mention_only: 0,
  design_only: 0,
  prototype: 0,
  partial: 0,
  production_ready: 0
});

const topicArchitectures: Record<string, string[]> = {
  agent: ["Goal Router", "Planner", "Tool Registry", "Memory Store", "Executor", "Guardrails", "Evaluation", "Observability"],
  "llm-gateway": ["Provider Adapter", "Model Router", "Policy Engine", "Fallback", "Rate Limit", "Cost Budget", "Observability"],
  auth: ["Identity Provider", "Session Manager", "RBAC Policy", "Token Rotation", "Audit Log", "Security Tests"],
  billing: ["Pricing Catalog", "Checkout", "Subscription Ledger", "Webhook Handler", "Reconciliation", "Audit Report"],
  observability: ["Instrumentation", "Tracing", "Metrics", "Logs", "Dashboards", "Alerts", "Cost Attribution"],
  security: ["Threat Model", "Secret Handling", "Input Validation", "Access Policy", "Audit Trail", "Security Scans"],
  i18n: ["Message Catalog", "Locale Resolver", "Fallback Policy", "Formatting", "Extraction", "Missing-Key Checks"],
  workflow: ["State Machine", "Step Executor", "Queue", "Retry Policy", "Compensation", "Observability"],
  evaluation: ["Dataset", "Runner", "Metrics", "Regression Gates", "Report", "CI Integration"],
  deployment: ["Build Artifact", "Config", "Environment Promotion", "Rollback", "Health Check", "Release Gates"],
  ci: ["Static Checks", "Tests", "Build", "Security Scan", "Artifacts", "Required Checks"]
};

export function analyzeGenericTopicProjects(
  projects: ProjectProfile[],
  topic: string,
  locale: SupportedLocale = "en-US"
): DeepTopicReport {
  const projectMaturity = projects
    .map((project) => createProjectTopicMaturity(project, topic, locale))
    .filter((project) => project.maturity !== "none");
  const distribution = maturityDistribution();
  for (const project of projectMaturity) {
    distribution[project.maturity] += 1;
  }
  const repeatedPatterns = findRepeatedSignals(projects, topic);
  const recommendedReferenceProjects = projectMaturity
    .filter((project) => project.maturity === "production_ready" || project.maturity === "partial")
    .sort((left, right) => right.implementedDimensions.length - left.implementedDimensions.length)
    .map((project) => project.projectName)
    .slice(0, 3);

  return {
    topic,
    totalProjects: projects.length,
    mentionedProjects: projectMaturity.length,
    maturityDistribution: distribution,
    projectMaturity,
    crossProjectFindings: createFindings(topic, projects.length, projectMaturity, locale),
    repeatedPatterns,
    duplicationRisks:
      repeatedPatterns.length > 0 && projectMaturity.length >= 2
        ? [tx(locale, "topic.generic.duplicationRisk", { topic })]
        : [],
    recommendedReferenceProjects,
    recommendedArchitecture: {
      name: tx(locale, "topic.generic.architectureName", { topic }),
      stages: topicArchitectures[topic] ?? ["Discovery", "Design", "Implementation", "Quality Gate", "Operational Review"],
      rationale:
        [
          tx(locale, "topic.generic.architectureRationale.evidence", { topic }),
          tx(locale, "topic.generic.architectureRationale.platform")
        ]
    },
    platformizationRecommendation: buildGenericPlatformizationRecommendation({
      topic,
      mentionedProjects: projectMaturity.length,
      repeatedPatterns,
      referenceProjects: recommendedReferenceProjects,
      locale
    })
  };
}

function createProjectTopicMaturity(
  project: ProjectProfile,
  topic: string,
  locale: SupportedLocale
): ProjectTopicMaturity {
  const mention = project.topics.find((item) => item.topic === topic);
  const maturity = project.maturityByTopic[topic] ?? "none";
  const evidence = mention?.evidence.slice(0, 12) ?? [];
  const implementedDimensions = mention?.signals ?? [];
  const missingDimensions = expectedSignals(topic).filter(
    (signal) => !implementedDimensions.some((implemented) => implemented.includes(signal))
  );

  return {
    projectName: project.name,
    maturity,
    implementedDimensions,
    missingDimensions,
    evidence,
    risks: createRisks(topic, maturity, missingDimensions, locale),
    recommendedNextActions: createActions(topic, maturity, missingDimensions, locale)
  };
}

function createFindings(
  topic: string,
  totalProjects: number,
  projects: ProjectTopicMaturity[],
  locale: SupportedLocale
): string[] {
  const implemented = projects.filter((project) =>
    ["prototype", "partial", "production_ready"].includes(project.maturity)
  ).length;
  return [
    tx(locale, "topic.generic.finding", {
      topic,
      count: projects.length,
      total: totalProjects,
      implemented
    }),
    tx(locale, "topic.generic.findingEvidence", { topic })
  ];
}

function createRisks(
  topic: string,
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "mention_only") {
    return [tx(locale, "topic.generic.mentionRisk", { topic })];
  }
  if (maturity === "design_only") {
    return [tx(locale, "topic.generic.designRisk", { topic })];
  }
  return missingDimensions.slice(0, 4).map((dimension) =>
    tx(locale, "topic.generic.missingRisk", { topic, dimension })
  );
}

function createActions(
  topic: string,
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "production_ready") {
    return [tx(locale, "topic.generic.productionAction", { topic })];
  }
  const first = missingDimensions[0] ?? "test/build/observability";
  return [tx(locale, "topic.generic.nextAction", { topic, dimension: first })];
}

function findRepeatedSignals(projects: ProjectProfile[], topic: string): string[] {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const mention = project.topics.find((item) => item.topic === topic);
    for (const signal of mention?.signals ?? []) {
      counts.set(signal, (counts.get(signal) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((left, right) => right[1] - left[1])
    .map(([signal]) => signal)
    .slice(0, 12);
}

function expectedSignals(topic: string): string[] {
  return topicArchitectures[topic]?.map((item) => item.toLowerCase()) ?? ["design", "implementation", "quality"];
}
