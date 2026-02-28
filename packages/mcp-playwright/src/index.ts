#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { type createConnection } from "@playwright/mcp";
import { SessionManager } from "./session-manager.js";
import { registerProxiedTools } from "./tool-proxy.js";

const config: NonNullable<Parameters<typeof createConnection>[0]> = {
  browser: { isolated: true, launchOptions: { headless: true } },
  outputDir: ".tmp/playwright",
};

const server = new Server(
  { name: "mcp-playwright", version: "1.0.0" },
  {
    capabilities: { tools: {} },
    instructions: "Multi-session Playwright MCP server. Each tool requires a 'sessionId' for browser isolation.\nOutput directory: .tmp/playwright",
  },
);

const sessionManager = new SessionManager(config);

await registerProxiedTools(server, sessionManager);

const transport = new StdioServerTransport();
await server.connect(transport);

async function shutdown(): Promise<void> {
  await sessionManager.disposeAll();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
