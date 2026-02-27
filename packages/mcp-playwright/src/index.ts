#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SessionManager } from "./session-manager.js";
import { registerProxiedTools } from "./tool-proxy.js";

const headless = process.env["HEADLESS"] !== "false";
const config = { browser: { launchOptions: { headless } } };

const server = new Server(
  { name: "mcp-playwright", version: "1.0.0" },
  { capabilities: { tools: {} } },
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
