import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createDataQualityRecord,
  type DataQuality
} from "../model/dataQuality.js";

export interface ScanCodexJsonlSessionsOptions {
  sessionsDir?: string;
  limit?: number;
}

export interface CodexJsonlSessionScanResult {
  sessionsDir: string;
  files: string[];
  dataQuality: DataQuality[];
}

export function defaultCodexSessionsDir(): string {
  return join(homedir(), ".codex", "sessions");
}

export async function scanCodexJsonlSessionFiles(
  options: ScanCodexJsonlSessionsOptions = {}
): Promise<CodexJsonlSessionScanResult> {
  const sessionsDir = options.sessionsDir ?? defaultCodexSessionsDir();
  const dataQuality: DataQuality[] = [];
  const files: string[] = [];

  if (!existsSync(sessionsDir)) {
    dataQuality.push(
      createDataQualityRecord({
        source: "codex-history",
        status: "missing",
        reason: "Codex sessions directory was not found.",
        attemptedSources: [sessionsDir]
      })
    );
    return { sessionsDir, files, dataQuality };
  }

  async function visit(path: string): Promise<void> {
    const entries = await readdir(path, { withFileTypes: true }).catch((error) => {
      dataQuality.push(
        createDataQualityRecord({
          source: "codex-history",
          status: "partial",
          reason: `Unable to read sessions directory entry: ${error instanceof Error ? error.message : String(error)}`,
          attemptedSources: [path]
        })
      );
      return [];
    });

    for (const entry of entries) {
      const absolutePath = join(path, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (/^rollout-.*\.jsonl$/i.test(entry.name)) {
        files.push(absolutePath);
      }
    }
  }

  await visit(sessionsDir);
  const sortedFiles = (
    await Promise.all(
      files.map(async (file) => ({
        file,
        mtimeMs: (await stat(file).catch(() => undefined))?.mtimeMs ?? 0
      }))
    )
  )
    .sort((left, right) => right.mtimeMs - left.mtimeMs || right.file.localeCompare(left.file))
    .map((item) => item.file);

  return {
    sessionsDir,
    files: typeof options.limit === "number" ? sortedFiles.slice(0, options.limit) : sortedFiles,
    dataQuality
  };
}
