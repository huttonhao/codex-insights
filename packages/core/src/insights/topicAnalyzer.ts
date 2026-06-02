import type { Evidence } from "../model/evidence.js";
import type { ScannedFile } from "../model/project.js";
import type { TopicMention } from "../model/topic.js";
import { classifyTopicMaturity } from "./projectMaturity.js";
import { ragDependencySignals, ragKeywordSignals } from "./ragSignals.js";

export const defaultTopics = [
  "rag",
  "agent",
  "llm-gateway",
  "prompt-management",
  "workflow",
  "i18n",
  "billing",
  "auth",
  "multi-tenant",
  "observability",
  "evaluation",
  "vector-search",
  "embedding",
  "deployment",
  "ci",
  "security"
];

export interface AnalyzeProjectTopicsInput {
  projectName: string;
  files: ScannedFile[];
  topics?: string[];
  packageScripts?: Record<string, string>;
}

export function analyzeProjectTopics(input: AnalyzeProjectTopicsInput): TopicMention[] {
  const requestedTopics = input.topics?.length ? input.topics : defaultTopics;
  return requestedTopics
    .map((topic) => analyzeSingleTopic({ ...input, topic }))
    .filter((topic) => topic.maturity !== "none");
}

function analyzeSingleTopic(
  input: AnalyzeProjectTopicsInput & { topic: string }
): TopicMention {
  const signals = getSignalsForTopic(input.topic);
  const evidence: Evidence[] = [];
  const signalNames: string[] = [];

  for (const file of input.files) {
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const lower = line.toLowerCase();
      for (const signal of signals.keywords) {
        if (lower.includes(signal.toLowerCase())) {
          evidence.push({
            projectName: input.projectName,
            filePath: file.relativePath,
            lineStart: index + 1,
            lineEnd: index + 1,
            signal: `keyword:${signal}`,
            snippet: line.trim().slice(0, 500),
            confidence: isCodeSignal(file.relativePath, line) ? "high" : "medium"
          });
          signalNames.push(`keyword:${signal}`);
          break;
        }
      }
    });

    for (const pathSignal of signals.pathSignals) {
      if (file.relativePath.toLowerCase().includes(pathSignal)) {
        evidence.push({
          projectName: input.projectName,
          filePath: file.relativePath,
          signal: `path:${pathSignal}`,
          snippet: file.relativePath,
          confidence: "medium"
        });
        signalNames.push(`path:${pathSignal}`);
      }
    }

    if (file.relativePath === "package.json") {
      for (const dependency of collectDependencyNames(file.content)) {
        if (signals.dependencies.some((signal) => dependency.includes(signal))) {
          evidence.push({
            projectName: input.projectName,
            filePath: file.relativePath,
            signal: `dependency:${dependency}`,
            snippet: dependency,
            confidence: "high"
          });
          signalNames.push(`dependency:${dependency}`);
        }
      }
    }
  }

  const dedupedEvidence = dedupeEvidence(evidence);
  const maturity = classifyTopicMaturity({
    topic: input.topic,
    files: input.files,
    evidence: dedupedEvidence,
    packageScripts: input.packageScripts
  });

  return {
    topic: input.topic,
    signals: [...new Set(signalNames)],
    evidence: dedupedEvidence,
    maturity
  };
}

function getSignalsForTopic(topic: string): {
  keywords: string[];
  dependencies: string[];
  pathSignals: string[];
} {
  if (topic === "rag") {
    return {
      keywords: ragKeywordSignals,
      dependencies: ragDependencySignals,
      pathSignals: ["rag", "retriever", "embedding", "vector", "chunk", "ingestion"]
    };
  }

  const table: Record<string, string[]> = {
    agent: ["agent", "tool call", "planner", "memory"],
    "llm-gateway": ["llm gateway", "model router", "provider adapter"],
    "prompt-management": ["prompt template", "prompt registry", "system prompt"],
    workflow: ["workflow", "state machine", "orchestrator"],
    i18n: ["i18n", "locale", "translation"],
    billing: ["billing", "invoice", "stripe"],
    auth: ["auth", "oauth", "session", "jwt"],
    "multi-tenant": ["tenant", "workspace id", "organization id"],
    observability: ["observability", "trace", "metrics", "logging"],
    evaluation: ["evaluation", "eval", "benchmark"],
    "vector-search": ["vector search", "semantic search", "hnsw", "ivfflat"],
    embedding: ["embedding", "embeddings", "text-embedding"],
    deployment: ["deployment", "docker", "kubernetes", "terraform"],
    ci: ["github actions", "workflow", "ci"],
    security: ["security", "permission", "rbac", "secret"]
  };

  return {
    keywords: table[topic] ?? [topic],
    dependencies: [],
    pathSignals: [topic]
  };
}

function collectDependencyNames(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return [
      ...Object.keys(parsed.dependencies ?? {}),
      ...Object.keys(parsed.devDependencies ?? {})
    ].map((dependency) => dependency.toLowerCase());
  } catch {
    return [];
  }
}

function isCodeSignal(filePath: string, line: string): boolean {
  return (
    /\.(ts|tsx|js|jsx|py|go|rs|java|kt|cs)$/i.test(filePath) &&
    /function|class|interface|const|async|def |return |import /.test(line)
  );
}

function dedupeEvidence(evidence: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.filePath}:${item.lineStart}:${item.signal}:${item.snippet}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
