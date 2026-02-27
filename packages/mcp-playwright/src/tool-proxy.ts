import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { type SessionManager } from "./session-manager.js";

export function injectSessionId(tool: Tool): Tool {
  const existing = tool.inputSchema.required as string[] | undefined;
  return {
    ...tool,
    inputSchema: {
      ...tool.inputSchema,
      properties: {
        sessionId: { type: "string", description: "Session ID for browser isolation" },
        ...(tool.inputSchema.properties ?? {}),
      },
      required: ["sessionId", ...(existing?.filter((r) => r !== "sessionId") ?? [])],
    },
  };
}

export async function registerProxiedTools(
  server: Server,
  sessionManager: SessionManager,
): Promise<void> {
  // Bootstrap: get tool list from @playwright/mcp (no browser launched)
  const bootstrapClient = await sessionManager.getOrCreate("__bootstrap__");
  let playwrightTools: Tool[];
  try {
    ({ tools: playwrightTools } = await bootstrapClient.listTools());
  } finally {
    await sessionManager.destroy("__bootstrap__");
  }

  const proxiedTools = playwrightTools.map(injectSessionId);
  const allTools: Tool[] = [
    ...proxiedTools,
    {
      name: "session_close",
      description: "Close a browser session and release resources",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: { type: "string", description: "Session ID to close" },
        },
        required: ["sessionId"],
      },
    },
    {
      name: "session_list",
      description: "List all active browser session IDs",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: allTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (name === "session_close") {
      const { sessionId } = args as { sessionId: string };
      await sessionManager.destroy(sessionId);
      return { content: [{ type: "text" as const, text: `Session '${sessionId}' closed.` }] };
    }

    if (name === "session_list") {
      const sessions = sessionManager.list();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(sessions, null, 2) }],
      };
    }

    const sessionId = (args as Record<string, unknown>)["sessionId"];
    if (typeof sessionId !== "string" || sessionId === "") {
      throw new Error("Missing required argument: sessionId");
    }
    const { sessionId: _, ...toolArgs } = args as { sessionId: string; [key: string]: unknown };
    const client = await sessionManager.getOrCreate(sessionId);
    try {
      return await client.callTool({ name, arguments: toolArgs });
    } catch (err) {
      await sessionManager.destroy(sessionId);
      throw err;
    }
  });
}
