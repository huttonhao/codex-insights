import type { DataQuality } from "./dataQuality.js";

export interface CommandEvidence {
  command: string;
  category: "test" | "build" | "lint" | "typecheck" | "docker" | "other";
  source:
    | "session"
    | "package.json"
    | "git-diff"
    | "ci"
    | "manual"
    | "test-file"
    | "build-config";
  exitCode?: number;
  startedAt?: string;
  completedAt?: string;
  outputSnippet?: string;
  confidence: "low" | "medium" | "high";
}

export interface CommandEvidenceSummary {
  testsRunKnown: boolean;
  testsRunCount?: number;
  testCommands: CommandEvidence[];
  buildCommands: CommandEvidence[];
  lintCommands: CommandEvidence[];
  typecheckCommands: CommandEvidence[];
  dockerCommands: CommandEvidence[];
  unknownReason?: string;
  dataQuality: DataQuality[];
}
