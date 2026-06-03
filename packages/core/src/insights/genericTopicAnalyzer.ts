import type { SupportedLocale } from "../i18n/localeResolver.js";
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
        ? [
            locale === "zh-CN"
              ? `${topic} 在多个项目中出现相似实现信号，存在重复建设和标准不一致风险。`
              : `${topic} has similar implementation signals across projects, creating duplication and standardization risk.`
          ]
        : [],
    recommendedReferenceProjects,
    recommendedArchitecture: {
      name: `${topic} reference architecture`,
      stages: topicArchitectures[topic] ?? ["Discovery", "Design", "Implementation", "Quality Gate", "Operational Review"],
      rationale:
        locale === "zh-CN"
          ? [
              `${topic} 应该用统一成熟度和证据标准判断，而不是只看关键词出现次数。`,
              "公共能力适合抽成平台模块，业务差异保留在项目侧。"
            ]
          : [
              `${topic} should be evaluated with evidence and maturity rules, not keyword counts alone.`,
              "Shared capabilities can become platform modules while product-specific policy stays in projects."
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
  if (locale === "zh-CN") {
    return [
      `在扫描的 ${totalProjects} 个项目中，有 ${projects.length} 个项目出现 ${topic} 证据，其中 ${implemented} 个已经有实现信号。`,
      `${topic} 的判断基于 evidence、文件路径、依赖、源码形态和质量证据，不只是关键词统计。`
    ];
  }
  return [
    `${projects.length}/${totalProjects} projects contain ${topic} evidence; ${implemented} contain implementation signals.`,
    `${topic} is evaluated using evidence, paths, dependencies, code patterns, and quality signals, not keyword counts alone.`
  ];
}

function createRisks(
  topic: string,
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "mention_only") {
    return [
      locale === "zh-CN"
        ? `${topic} 只停留在提及阶段，不能判断是否进入工程实现。`
        : `${topic} is mention-only; implementation scope is unknown.`
    ];
  }
  if (maturity === "design_only") {
    return [
      locale === "zh-CN"
        ? `${topic} 目前主要是设计证据，缺少可验证的工程链路。`
        : `${topic} is design-only and lacks a verifiable engineering path.`
    ];
  }
  return missingDimensions.slice(0, 4).map((dimension) =>
    locale === "zh-CN"
      ? `${topic} 缺少 ${dimension} 证据。`
      : `${topic} is missing ${dimension} evidence.`
  );
}

function createActions(
  topic: string,
  maturity: TopicMaturity,
  missingDimensions: string[],
  locale: SupportedLocale
): string[] {
  if (maturity === "production_ready") {
    return [
      locale === "zh-CN"
        ? `把该项目作为 ${topic} 参考实现候选，抽取公共契约和质量门禁。`
        : `Use this project as a ${topic} reference candidate and extract shared contracts and quality gates.`
    ];
  }
  const first = missingDimensions[0] ?? "test/build/observability";
  return [
    locale === "zh-CN"
      ? `下一步先补 ${first}，再提升 ${topic} 成熟度。`
      : `Next, add ${first} before raising ${topic} maturity.`
  ];
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
