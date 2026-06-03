export interface ProjectQualitySummary {
  hasTestScript: boolean;
  hasCi: boolean;
  hasTestFiles: boolean;
  hasBuildConfig: boolean;
  hasExecutedTestEvidence: boolean;
  hasLint: boolean;
  hasTypecheck: boolean;
  hasDocker: boolean;
  testsRunKnown: boolean;
  testsRunCount?: number;
  unknownReason?: string;
}

export interface WorkspaceQualitySummary {
  projectsWithTestScript: number;
  projectsWithCi: number;
  projectsWithTestFiles: number;
  projectsWithBuildConfig: number;
  projectsWithExecutedTestEvidence: number;
  projectsWithLint: number;
  projectsWithTypecheck: number;
  projectsWithDocker: number;
  projectsWithoutQualityEvidence: number;
}
