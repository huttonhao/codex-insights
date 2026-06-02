#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  doctor,
  getRepoInsights,
  getSessionInsights,
  getWorkspaceInsights,
  listSupportedLocales
} from "./tools.js";

const insightInputSchema = {
  locale: z.string().optional(),
  save: z.boolean().optional(),
  cwd: z.string().optional(),
  now: z.string().optional(),
  deep: z.boolean().optional(),
  topics: z.array(z.string()).optional(),
  format: z.enum(["json", "markdown"]).optional()
};

export function createServer(): McpServer {
  const server = new McpServer({
    name: "codex-insights",
    version: "0.1.0"
  });

  server.registerTool(
    "list_supported_locales",
    {
      title: "List supported locales",
      description: "List Codex Insights output locales and fallback behavior."
    },
    async () => textResult(listSupportedLocales())
  );

  server.registerTool(
    "get_session_insights",
    {
      title: "Get session insights",
      description:
        "Generate a localized Codex session insight report from explicit or best-effort session evidence.",
      inputSchema: {
        ...insightInputSchema,
        sessionFile: z.string().optional(),
        sessionJson: z.string().optional()
      }
    },
    async (args) => textResult(await getSessionInsights(args))
  );

  server.registerTool(
    "get_repo_insights",
    {
      title: "Get repo insights",
      description: "Generate a localized repository insight report from git and command evidence.",
      inputSchema: {
        ...insightInputSchema,
        repoPath: z.string().optional()
      }
    },
    async (args) => textResult(await getRepoInsights(args))
  );

  server.registerTool(
    "get_workspace_insights",
    {
      title: "Get workspace insights",
      description: "Scan multiple projects and generate deep topic insights.",
      inputSchema: {
        ...insightInputSchema,
        workspacePath: z.string().optional(),
        maxProjects: z.number().optional(),
        maxFilesPerProject: z.number().optional(),
        maxFileBytes: z.number().optional()
      }
    },
    async (args) => textResult(await getWorkspaceInsights(args))
  );

  server.registerTool(
    "doctor",
    {
      title: "Doctor",
      description: "Run local Codex Insights health checks.",
      inputSchema: {
        cwd: z.string().optional()
      }
    },
    async (args) => textResult(await doctor(args))
  );

  return server;
}

function textResult(value: unknown) {
  const text = JSON.stringify(value, null, 2);
  return {
    content: [
      {
        type: "text" as const,
        text
      }
    ],
    structuredContent: value as Record<string, unknown>
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}
