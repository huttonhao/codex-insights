import type { Evidence } from "../model/evidence.js";
import type { ScannedFile } from "../model/project.js";
import type { TopicMaturity } from "../model/topic.js";
import { detectRagDimensions } from "./ragSignals.js";

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
    return input.evidence.some((item) => isSourceFile(item.filePath))
      ? "prototype"
      : "mention_only";
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

export function isDocFile(filePath: string): boolean {
  return /(^|\/)(readme|docs?\/)|\.(md|mdx|rst|txt)$/i.test(filePath);
}

export function isSourceFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx|py|go|rs|java|kt|cs)$/i.test(filePath);
}
