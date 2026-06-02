#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getSessionInsights, listSupportedLocales } from "./tools.js";

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
    async () => ({
      content: [
        {
          type: "text",
          text: JSON.stringify(listSupportedLocales(), null, 2)
        }
      ]
    })
  );

  server.registerTool(
    "get_session_insights",
    {
      title: "Get session insights",
      description:
        "Generate a localized Tailwind HTML insight report for the current Codex session.",
      inputSchema: {
        locale: z.string().optional(),
        save: z.boolean().optional(),
        cwd: z.string().optional(),
        now: z.string().optional()
      }
    },
    async (args) => {
      const result = await getSessionInsights(args);
      return {
        content: [
          {
            type: "text",
            text: result.content
          }
        ],
        structuredContent: result
      };
    }
  );

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}
