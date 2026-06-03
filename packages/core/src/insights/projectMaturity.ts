import type { Evidence } from "../model/evidence.js";
import type { ScannedFile } from "../model/project.js";
import type { TopicMaturity } from "../model/topic.js";
import { detectRagDimensions } from "./ragSignals.js";

interface TopicRubric {
  designSignals: RegExp[];
  implementationSignals: RegExp[];
  productionSignals: RegExp[];
  partialWithoutScriptSignals?: number;
  productionImplementationSignals?: number;
  productionReadinessSignals?: number;
}

const topicRubrics: Record<string, TopicRubric> = {
  agent: {
    designSignals: [/architecture/i, /planner/i, /tool/i, /memory/i, /handoff/i],
    implementationSignals: [/agent/i, /planner/i, /tool\s*call/i, /toolcall/i, /memory/i, /executor/i],
    productionSignals: [/retry/i, /timeout/i, /guardrail/i, /evaluation/i, /trace/i, /approval/i],
    productionImplementationSignals: 3,
    productionReadinessSignals: 2
  },
  "llm-gateway": {
    designSignals: [/architecture/i, /model router/i, /provider adapter/i, /fallback/i, /rate limit/i],
    implementationSignals: [/model\s*router/i, /provider\s*adapter/i, /llm\s*gateway/i, /routeModel/i, /fallback/i, /rateLimit/i],
    productionSignals: [/quota/i, /budget/i, /retry/i, /timeout/i, /audit/i, /metrics/i, /circuit/i],
    productionImplementationSignals: 3,
    productionReadinessSignals: 2
  },
  auth: {
    designSignals: [/architecture/i, /oauth/i, /jwt/i, /session/i, /rbac/i],
    implementationSignals: [/auth/i, /oauth/i, /jwt/i, /session/i, /middleware/i, /rbac/i, /permission/i],
    productionSignals: [/rbac/i, /unauthorized/i, /csrf/i, /audit/i, /rotation/i, /policy/i],
    productionImplementationSignals: 3,
    productionReadinessSignals: 1
  },
  billing: {
    designSignals: [/invoice/i, /subscription/i, /pricing/i, /ledger/i, /webhook/i],
    implementationSignals: [/billing/i, /invoice/i, /stripe/i, /subscription/i, /checkout/i, /webhook/i, /ledger/i],
    productionSignals: [/idempot/i, /refund/i, /reconcile/i, /tax/i, /audit/i, /webhook/i],
    productionImplementationSignals: 3,
    productionReadinessSignals: 2
  },
  observability: {
    designSignals: [/trace/i, /metric/i, /log/i, /span/i, /dashboard/i],
    implementationSignals: [/trace/i, /span/i, /metric/i, /counter/i, /logger/i, /telemetry/i, /observability/i],
    productionSignals: [/alert/i, /dashboard/i, /sampling/i, /correlation/i, /cost/i, /slo/i],
    partialWithoutScriptSignals: 3,
    productionImplementationSignals: 3,
    productionReadinessSignals: 2
  },
  security: {
    designSignals: [/threat/i, /policy/i, /permission/i, /rbac/i, /secret/i],
    implementationSignals: [/security/i, /permission/i, /rbac/i, /secret/i, /encrypt/i, /sanitize/i],
    productionSignals: [/scan/i, /rotation/i, /audit trail/i, /csrf/i, /rate limit/i, /least privilege/i],
    productionImplementationSignals: 3,
    productionReadinessSignals: 2
  },
  i18n: {
    designSignals: [/locale/i, /fallback/i, /catalog/i, /translation/i, /namespace/i],
    implementationSignals: [/i18n/i, /locale/i, /translation/i, /translations/i, /messageCatalog/i, /fallbackLocale/i],
    productionSignals: [/fallback/i, /plural/i, /format/i, /missing/i, /extract/i, /lint/i],
    productionImplementationSignals: 3,
    productionReadinessSignals: 2
  },
  workflow: {
    designSignals: [/workflow/i, /state machine/i, /orchestrator/i, /queue/i, /retry/i],
    implementationSignals: [/workflow/i, /stateMachine/i, /state machine/i, /orchestrator/i, /queue/i, /step/i],
    productionSignals: [/retry/i, /timeout/i, /dead.?letter/i, /idempot/i, /compensat/i, /checkpoint/i],
    productionImplementationSignals: 3,
    productionReadinessSignals: 1
  }
};

export function classifyTopicMaturity(input: {
  topic: string;
  files: ScannedFile[];
  evidence: Evidence[];
  packageScripts?: Record<string, string>;
}): TopicMaturity {
  if (input.evidence.length === 0) {
    return "none";
  }

  if (input.topic !== "rag") {
    return classifyNonRagTopicMaturity(input);
  }

  const dimensions = detectRagDimensions(input.files);
  const hasSource = input.evidence.some((item) => isSourceFile(item.filePath));
  const hasTests = input.files.some((file) =>
    /(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\./.test(file.relativePath)
  );
  const hasBuildOrTestScript = Object.keys(input.packageScripts ?? {}).some((script) =>
    /^(test|build|lint|typecheck)$/.test(script)
  );
  const hasDesignDoc = input.evidence.some(
    (item) => isDocFile(item.filePath) && /architecture|proposed|flow|schema|interface|design/i.test(item.snippet)
  );

  if (!hasSource && hasDesignDoc && dimensions.size >= 4) {
    return "design_only";
  }

  if (!hasSource) {
    return "mention_only";
  }

  if (dimensions.size >= 12 && hasTests && hasBuildOrTestScript) {
    return "production_ready";
  }

  if (dimensions.size >= 6 && hasBuildOrTestScript) {
    return "partial";
  }

  return "prototype";
}

function classifyNonRagTopicMaturity(input: {
  topic: string;
  files: ScannedFile[];
  evidence: Evidence[];
  packageScripts?: Record<string, string>;
}): TopicMaturity {
  const rubric = topicRubrics[input.topic] ?? createDefaultRubric(input.topic);
  const sourceFiles = input.files.filter((file) => isSourceFile(file.relativePath));
  const hasSource = input.evidence.some((item) => isSourceFile(item.filePath));
  const hasTests = input.files.some((file) =>
    /(^|\/)(tests?|__tests__)\/|\.test\.|\.spec\./.test(file.relativePath)
  );
  const packageScripts = input.packageScripts ?? {};
  const hasTestScript = Object.keys(packageScripts).some((script) => /^test(:|$)|^vitest$|^pytest$/.test(script));
  const hasBuildOrQualityScript = Object.keys(packageScripts).some((script) =>
    /^(build|lint|typecheck|check)(:|$)/.test(script)
  );
  const hasDesignDoc = input.evidence.some(
    (item) =>
      isDocFile(item.filePath) &&
      /architecture|design|flow|schema|interface|policy|plan|fallback|rate limit|state machine/i.test(
        item.snippet
      )
  );

  const designHits = countPatternHits(input.files, rubric.designSignals);
  const implementationHits = countPatternHits(sourceFiles, rubric.implementationSignals);
  const productionHits = countPatternHits(input.files, rubric.productionSignals);
  const productionImplementationSignals = rubric.productionImplementationSignals ?? 3;
  const productionReadinessSignals = rubric.productionReadinessSignals ?? 2;

  if (!hasSource) {
    return hasDesignDoc || designHits >= 3 ? "design_only" : "mention_only";
  }

  if (
    hasTests &&
    hasBuildOrQualityScript &&
    implementationHits >= productionImplementationSignals &&
    productionHits >= productionReadinessSignals
  ) {
    return "production_ready";
  }

  if ((hasTests || hasTestScript || hasBuildOrQualityScript) && implementationHits >= 2) {
    return "partial";
  }

  if (
    typeof rubric.partialWithoutScriptSignals === "number" &&
    implementationHits >= rubric.partialWithoutScriptSignals
  ) {
    return "partial";
  }

  return "prototype";
}

function createDefaultRubric(topic: string): TopicRubric {
  return {
    designSignals: [new RegExp(topic, "i"), /architecture/i, /design/i],
    implementationSignals: [new RegExp(topic, "i"), /function/i, /class/i, /interface/i],
    productionSignals: [/test/i, /retry/i, /error/i, /metrics/i],
    productionImplementationSignals: 2,
    productionReadinessSignals: 2
  };
}

function countPatternHits(files: ScannedFile[], patterns: RegExp[]): number {
  const hits = new Set<string>();
  for (const file of files) {
    const searchable = `${file.relativePath}\n${file.content}`;
    patterns.forEach((pattern, index) => {
      if (pattern.test(searchable)) {
        hits.add(String(index));
      }
    });
  }
  return hits.size;
}

export function isDocFile(filePath: string): boolean {
  return /(^|\/)(readme|docs?\/)|\.(md|mdx|rst|txt)$/i.test(filePath);
}

export function isSourceFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|py|go|rs|java|kt|cs)$/i.test(filePath);
}
