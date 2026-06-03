import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));

export function walkFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root)) {
    if (entry === "node_modules" || entry === "dist" || entry === ".git") {
      continue;
    }
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      result.push(...walkFiles(path));
    } else if (stat.isFile()) {
      result.push(path);
    }
  }
  return result;
}
