import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import {
  createDataQualityRecord,
  type DataQuality
} from "../model/dataQuality.js";
import type {
  ProjectProfile,
  ScannedFile,
  WorkspaceScanResult
} from "../model/project.js";
import { analyzeProjectTopics } from "../insights/topicAnalyzer.js";

export interface ScanWorkspaceOptions {
  workspacePath: string;
  topics?: string[];
  maxProjects?: number;
  maxFilesPerProject?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
  include?: string[];
  exclude?: string[];
}

const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  "out",
  "coverage",
  ".next",
  ".nuxt",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
  ".DS_Store"
]);

const binaryExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".woff",
  ".woff2"
]);

export async function scanWorkspace(
  options: ScanWorkspaceOptions
): Promise<WorkspaceScanResult> {
  const limits = {
    maxProjects: options.maxProjects ?? 50,
    maxFilesPerProject: options.maxFilesPerProject ?? 250,
    maxFileBytes: options.maxFileBytes ?? 256 * 1024,
    maxTotalBytes: options.maxTotalBytes ?? 10 * 1024 * 1024
  };
  const dataQuality: DataQuality[] = [];
  const projectPaths = await discoverProjects(options.workspacePath, limits.maxProjects, dataQuality);
  const projects: ProjectProfile[] = [];
  let filesScanned = 0;
  let bytesScanned = 0;
  let skippedFiles = 0;

  for (const projectPath of projectPaths) {
    if (bytesScanned >= limits.maxTotalBytes) {
      dataQuality.push(
        createDataQualityRecord({
          source: "workspace-scanner",
          status: "partial",
          reason: "Total scan byte limit was reached.",
          attemptedSources: [options.workspacePath]
        })
      );
      break;
    }

    const fileResult = await scanProjectFiles(projectPath, {
      maxFilesPerProject: limits.maxFilesPerProject,
      maxFileBytes: limits.maxFileBytes,
      remainingBytes: limits.maxTotalBytes - bytesScanned,
      include: options.include,
      exclude: options.exclude
    });
    filesScanned += fileResult.files.length;
    bytesScanned += fileResult.files.reduce((sum, file) => sum + file.sizeBytes, 0);
    skippedFiles += fileResult.skippedFiles;
    dataQuality.push(...fileResult.dataQuality);
    projects.push(profileProject(projectPath, fileResult.files, options.topics));
  }

  if (projectPaths.length >= limits.maxProjects) {
    dataQuality.push(
      createDataQualityRecord({
        source: "workspace-scanner",
        status: "partial",
        reason: "Project scan limit was reached.",
        attemptedSources: [options.workspacePath]
      })
    );
  }

  return {
    workspacePath: options.workspacePath,
    projects,
    summary: {
      projectsScanned: projects.length,
      filesScanned,
      bytesScanned,
      skippedFiles
    },
    dataQuality
  };
}

async function discoverProjects(
  workspacePath: string,
  maxProjects: number,
  dataQuality: DataQuality[]
): Promise<string[]> {
  const projects: string[] = [];

  async function visit(path: string, depth: number): Promise<void> {
    if (projects.length >= maxProjects || depth > 3) {
      return;
    }

    const entries = await safeReadDir(path, dataQuality);
    if (await isProjectRoot(path, entries)) {
      projects.push(path);
      if (path !== workspacePath) {
        return;
      }
    }

    for (const entry of entries) {
      if (projects.length >= maxProjects) {
        return;
      }
      if (!entry.isDirectory() || ignoredDirectories.has(entry.name)) {
        continue;
      }
      await visit(join(path, entry.name), depth + 1);
    }
  }

  await visit(workspacePath, 0);
  return projects;
}

async function isProjectRoot(
  path: string,
  entries: import("node:fs").Dirent[]
): Promise<boolean> {
  const names = new Set(entries.map((entry) => entry.name));
  if (
    names.has(".git") ||
    names.has("package.json") ||
    names.has("pom.xml") ||
    names.has("build.gradle") ||
    names.has("settings.gradle") ||
    names.has("go.mod") ||
    names.has("pyproject.toml") ||
    names.has("Cargo.toml")
  ) {
    return true;
  }

  if (names.has("README.md")) {
    const hasStructure = ["src", "docs", "tests", "test"].some((name) =>
      names.has(name)
    );
    if (hasStructure) {
      return true;
    }
    if (path !== process.cwd()) {
      return true;
    }
  }

  return false;
}

async function scanProjectFiles(
  projectPath: string,
  options: {
    maxFilesPerProject: number;
    maxFileBytes: number;
    remainingBytes: number;
    include?: string[];
    exclude?: string[];
  }
): Promise<{
  files: ScannedFile[];
  skippedFiles: number;
  dataQuality: DataQuality[];
}> {
  const files: ScannedFile[] = [];
  const dataQuality: DataQuality[] = [];
  let skippedFiles = 0;
  let bytesRead = 0;

  async function visit(path: string): Promise<void> {
    if (files.length >= options.maxFilesPerProject || bytesRead >= options.remainingBytes) {
      return;
    }

    const entries = await safeReadDir(path, dataQuality);
    for (const entry of entries) {
      if (files.length >= options.maxFilesPerProject || bytesRead >= options.remainingBytes) {
        skippedFiles += 1;
        continue;
      }

      const absolutePath = join(path, entry.name);
      const relativePath = relative(projectPath, absolutePath);
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await visit(absolutePath);
        }
        continue;
      }

      if (!shouldReadFile(relativePath, options.include, options.exclude)) {
        skippedFiles += 1;
        continue;
      }

      const fileStat = await stat(absolutePath);
      if (fileStat.size > options.maxFileBytes || bytesRead + fileStat.size > options.remainingBytes) {
        skippedFiles += 1;
        continue;
      }

      const content = await readFile(absolutePath, "utf8").catch(() => undefined);
      if (content === undefined || hasBinaryMarker(content)) {
        skippedFiles += 1;
        continue;
      }

      files.push({
        relativePath,
        absolutePath,
        sizeBytes: fileStat.size,
        content
      });
      bytesRead += fileStat.size;
    }
  }

  await visit(projectPath);

  if (skippedFiles > 0) {
    dataQuality.push(
      createDataQualityRecord({
        source: "workspace-scanner",
        status: "partial",
        reason: `${skippedFiles} files were skipped by scan limits or file filters.`,
        attemptedSources: [projectPath]
      })
    );
  }

  return { files, skippedFiles, dataQuality };
}

function profileProject(
  projectPath: string,
  files: ScannedFile[],
  topics?: string[]
): ProjectProfile {
  const packageJson = files.find((file) => file.relativePath === "package.json");
  const packageInfo = parsePackageJson(packageJson?.content);
  const topicMentions = analyzeProjectTopics({
    projectName: basename(projectPath),
    files,
    topics,
    packageScripts: packageInfo.scripts
  });
  const evidence = topicMentions.flatMap((topic) => topic.evidence);

  return {
    name: packageInfo.name ?? basename(projectPath),
    path: projectPath,
    languages: detectLanguages(files),
    frameworks: detectFrameworks(packageInfo.dependencies),
    packageManagers: detectPackageManagers(files),
    databases: detectDatabases(files, packageInfo.dependencies),
    aiProviders: detectAiProviders(packageInfo.dependencies),
    topics: topicMentions,
    evidence,
    maturityByTopic: Object.fromEntries(
      topicMentions.map((topic) => [topic.topic, topic.maturity])
    ),
    files
  };
}

async function safeReadDir(
  path: string,
  dataQuality: DataQuality[]
): Promise<import("node:fs").Dirent[]> {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    dataQuality.push(
      createDataQualityRecord({
        source: "workspace-scanner",
        status: "unavailable",
        reason: `Unable to read directory: ${error instanceof Error ? error.message : String(error)}`,
        attemptedSources: [path]
      })
    );
    return [];
  }
}

function shouldReadFile(
  relativePath: string,
  include?: string[],
  exclude?: string[]
): boolean {
  const lower = relativePath.toLowerCase();
  if (exclude?.some((pattern) => lower.includes(pattern.toLowerCase()))) {
    return false;
  }
  if (include?.length && !include.some((pattern) => lower.includes(pattern.toLowerCase()))) {
    return false;
  }
  if (/package-lock\.json|yarn\.lock|pnpm-lock\.yaml|cargo\.lock$/i.test(relativePath)) {
    return false;
  }
  if (/\.min\.(js|css)$/i.test(relativePath)) {
    return false;
  }
  return ![...binaryExtensions].some((extension) => lower.endsWith(extension));
}

function hasBinaryMarker(content: string): boolean {
  return content.includes("\u0000");
}

function parsePackageJson(content?: string): {
  name?: string;
  scripts: Record<string, string>;
  dependencies: string[];
} {
  if (!content) {
    return { scripts: {}, dependencies: [] };
  }
  try {
    const parsed = JSON.parse(content) as {
      name?: string;
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return {
      name: parsed.name,
      scripts: parsed.scripts ?? {},
      dependencies: [
        ...Object.keys(parsed.dependencies ?? {}),
        ...Object.keys(parsed.devDependencies ?? {})
      ].map((dependency) => dependency.toLowerCase())
    };
  } catch {
    return { scripts: {}, dependencies: [] };
  }
}

function detectLanguages(files: ScannedFile[]): string[] {
  const languages = new Set<string>();
  for (const file of files) {
    if (/\.(ts|tsx)$/i.test(file.relativePath)) languages.add("TypeScript");
    if (/\.(js|jsx)$/i.test(file.relativePath)) languages.add("JavaScript");
    if (/\.py$/i.test(file.relativePath)) languages.add("Python");
    if (/\.go$/i.test(file.relativePath)) languages.add("Go");
    if (/\.rs$/i.test(file.relativePath)) languages.add("Rust");
    if (/\.java$/i.test(file.relativePath)) languages.add("Java");
  }
  return [...languages];
}

function detectFrameworks(dependencies: string[]): string[] {
  const frameworks: string[] = [];
  if (dependencies.some((dependency) => dependency.includes("next"))) frameworks.push("Next.js");
  if (dependencies.some((dependency) => dependency.includes("react"))) frameworks.push("React");
  if (dependencies.some((dependency) => dependency.includes("vue"))) frameworks.push("Vue");
  if (dependencies.some((dependency) => dependency.includes("langchain"))) frameworks.push("LangChain");
  if (dependencies.some((dependency) => dependency.includes("llama"))) frameworks.push("LlamaIndex");
  return frameworks;
}

function detectPackageManagers(files: ScannedFile[]): string[] {
  const names = new Set<string>();
  if (files.some((file) => file.relativePath === "package.json")) names.add("npm");
  if (files.some((file) => file.relativePath === "pnpm-lock.yaml")) names.add("pnpm");
  if (files.some((file) => file.relativePath === "yarn.lock")) names.add("yarn");
  if (files.some((file) => file.relativePath === "go.mod")) names.add("go");
  if (files.some((file) => file.relativePath === "Cargo.toml")) names.add("cargo");
  return [...names];
}

function detectDatabases(files: ScannedFile[], dependencies: string[]): string[] {
  const joined = `${dependencies.join(" ")} ${files.map((file) => file.content).join(" ")}`.toLowerCase();
  const databases: string[] = [];
  if (joined.includes("postgres") || joined.includes("pgvector")) databases.push("PostgreSQL");
  if (joined.includes("qdrant")) databases.push("Qdrant");
  if (joined.includes("pinecone")) databases.push("Pinecone");
  if (joined.includes("weaviate")) databases.push("Weaviate");
  if (joined.includes("chroma")) databases.push("Chroma");
  return [...new Set(databases)];
}

function detectAiProviders(dependencies: string[]): string[] {
  const providers: string[] = [];
  if (dependencies.some((dependency) => dependency.includes("openai"))) providers.push("OpenAI");
  if (dependencies.some((dependency) => dependency.includes("cohere"))) providers.push("Cohere");
  if (dependencies.some((dependency) => dependency.includes("voyage"))) providers.push("Voyage");
  return providers;
}
