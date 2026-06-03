import type { CommandEvidenceSummary } from "../model/command.js";
import type { ProjectProfile } from "../model/project.js";
import type {
  ProjectQualitySummary,
  WorkspaceQualitySummary
} from "../model/workspaceQuality.js";

export function summarizeProjectQuality(
  commandEvidence: CommandEvidenceSummary
): ProjectQualitySummary {
  const hasTestScript = commandEvidence.testCommands.some((command) => command.source === "package.json");
  const hasCi = [...commandEvidence.testCommands, ...commandEvidence.buildCommands, ...commandEvidence.lintCommands, ...commandEvidence.typecheckCommands]
    .some((command) => command.source === "ci");
  const hasTestFiles = commandEvidence.testCommands.some((command) => command.source === "test-file");
  const hasBuildConfig = commandEvidence.buildCommands.some((command) => command.source === "build-config");
  return {
    hasTestScript,
    hasCi,
    hasTestFiles,
    hasBuildConfig,
    hasExecutedTestEvidence: commandEvidence.testsRunKnown,
    hasLint: commandEvidence.lintCommands.length > 0,
    hasTypecheck: commandEvidence.typecheckCommands.length > 0,
    hasDocker: commandEvidence.dockerCommands.length > 0,
    testsRunKnown: commandEvidence.testsRunKnown,
    testsRunCount: commandEvidence.testsRunCount,
    unknownReason: commandEvidence.unknownReason
  };
}

export function summarizeWorkspaceQuality(
  projects: ProjectProfile[]
): WorkspaceQualitySummary {
  const summaries = projects.map((project) => project.qualitySummary).filter(Boolean);
  return {
    projectsWithTestScript: summaries.filter((summary) => summary?.hasTestScript).length,
    projectsWithCi: summaries.filter((summary) => summary?.hasCi).length,
    projectsWithTestFiles: summaries.filter((summary) => summary?.hasTestFiles).length,
    projectsWithBuildConfig: summaries.filter((summary) => summary?.hasBuildConfig).length,
    projectsWithExecutedTestEvidence: summaries.filter((summary) => summary?.hasExecutedTestEvidence).length,
    projectsWithLint: summaries.filter((summary) => summary?.hasLint).length,
    projectsWithTypecheck: summaries.filter((summary) => summary?.hasTypecheck).length,
    projectsWithDocker: summaries.filter((summary) => summary?.hasDocker).length,
    projectsWithoutQualityEvidence: summaries.filter(
      (summary) =>
        summary &&
        !summary.hasTestScript &&
        !summary.hasCi &&
        !summary.hasTestFiles &&
        !summary.hasBuildConfig &&
        !summary.hasLint &&
        !summary.hasTypecheck &&
        !summary.hasDocker
    ).length
  };
}
