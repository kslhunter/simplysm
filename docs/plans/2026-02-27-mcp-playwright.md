# MCP Playwright Multi-Session Server Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Create `@simplysm/mcp-playwright` — a proxy MCP server that multiplexes `@playwright/mcp` instances by session ID, enabling parallel sub-agent browser automation.

**Architecture:** Outer MCP server (stdio) receives all tool calls with a `sessionId` param and routes them to per-session `@playwright/mcp` Server instances connected via `InMemoryTransport`. Tool list is bootstrapped dynamically from `@playwright/mcp`, with `sessionId` injected into each tool's JSON Schema.

**Tech Stack:** `@modelcontextprotocol/sdk@^1.27.1`, `@playwright/mcp@^0.0.68`, `playwright@^1.58.2`, pnpm monorepo, Node.js ESM

---

### Task 1: Package skeleton + install dependencies

**Files:**
- Create: `packages/mcp-playwright/package.json`
- Create: `packages/mcp-playwright/src/index.ts` (stub)
- Create: `packages/mcp-playwright/src/session-manager.ts` (stub)
- Create: `packages/mcp-playwright/src/tool-proxy.ts` (stub)
- Modify: `sd.config.ts`

**Step 1: Create package.json**

```json
{
  "name": "@simplysm/mcp-playwright",
  "version": "13.0.70",
  "description": "Simplysm MCP server — multi-session Playwright proxy",
  "author": "simplysm",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/kslhunter/simplysm.git",
    "directory": "packages/mcp-playwright"
  },
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "sd-mcp-playwright": "./dist/index.js"
  },
  "files": [
    "dist",
    "src"
  ],
  "sideEffects": false,
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.27.1",
    "@playwright/mcp": "^0.0.68",
    "playwright": "^1.58.2"
  }
}
```

**Step 2: Create stub source files**

`packages/mcp-playwright/src/index.ts`:
```typescript
export {};
```

`packages/mcp-playwright/src/session-manager.ts`:
```typescript
export {};
```

`packages/mcp-playwright/src/tool-proxy.ts`:
```typescript
export {};
```

**Step 3: Register in sd.config.ts**

In `sd.config.ts`, add to the `packages` object (alphabetical order, between `lint` and `orm-common`):

```typescript
"mcp-playwright": { target: "node", publish: "npm" },
```

**Step 4: Install dependencies**

Run: `pnpm install`

Expected: Install completes without errors. `@playwright/mcp`, `@modelcontextprotocol/sdk` appear in `packages/mcp-playwright/node_modules`.

**Step 5: Verify TypeScript sees the new package**

Run: `pnpm typecheck packages/mcp-playwright`

Expected: PASS (stubs have no errors)

**Step 6: Commit**

```bash
git add packages/mcp-playwright/ sd.config.ts pnpm-lock.yaml
git commit -m "feat(mcp-playwright): add package skeleton"
```

---

### Task 2: SessionManager

**Files:**
- Create: `packages/mcp-playwright/tests/session-manager.spec.ts`
- Modify: `packages/mcp-playwright/src/session-manager.ts`
- Modify: `vitest.config.ts` (add to browser exclusions)

**Step 1: Add mcp-playwright to vitest browser exclusions**

In `vitest.config.ts`, inside the `browser` project's `exclude` array, add:
```typescript
"packages/mcp-playwright/tests/**/*.spec.{ts,tsx,js}",
```

**Step 2: Write the failing tests**

`packages/mcp-playwright/tests/session-manager.spec.ts`:
```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock @playwright/mcp
vi.mock("@playwright/mcp", () => ({
  createConnection: vi.fn().mockResolvedValue({
    connect: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock InMemoryTransport
vi.mock("@modelcontextprotocol/sdk/inMemory.js", () => ({
  InMemoryTransport: {
    createLinkedPair: () => [Symbol("clientTransport"), Symbol("serverTransport")],
  },
}));

// Mock MCP Client
const mockClientClose = vi.fn().mockResolvedValue(undefined);
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    close: mockClientClose,
    listTools: vi.fn().mockResolvedValue({ tools: [] }),
    callTool: vi.fn().mockResolvedValue({ content: [] }),
  })),
}));

import { SessionManager } from "../src/session-manager.js";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SessionManager({}, 1000); // 1s timeout for fast tests
  });

  afterEach(async () => {
    await manager.disposeAll();
  });

  it("creates a new session for an unknown sessionId", async () => {
    const client = await manager.getOrCreate("session-a");
    expect(client).toBeDefined();
    expect(manager.list()).toEqual(["session-a"]);
  });

  it("returns the same client for the same sessionId", async () => {
    const client1 = await manager.getOrCreate("session-a");
    const client2 = await manager.getOrCreate("session-a");
    expect(client1).toBe(client2);
  });

  it("creates independent clients for different sessionIds", async () => {
    const client1 = await manager.getOrCreate("session-a");
    const client2 = await manager.getOrCreate("session-b");
    expect(client1).not.toBe(client2);
    expect(manager.list()).toEqual(["session-a", "session-b"]);
  });

  it("destroy removes the session and calls client.close", async () => {
    await manager.getOrCreate("session-a");
    await manager.destroy("session-a");
    expect(mockClientClose).toHaveBeenCalledTimes(1);
    expect(manager.list()).toEqual([]);
  });

  it("destroy does nothing for unknown sessionId", async () => {
    await manager.destroy("non-existent");
    expect(mockClientClose).not.toHaveBeenCalled();
  });

  it("disposeAll clears all sessions", async () => {
    await manager.getOrCreate("session-a");
    await manager.getOrCreate("session-b");
    await manager.disposeAll();
    expect(manager.list()).toEqual([]);
    expect(mockClientClose).toHaveBeenCalledTimes(2);
  });

  it("cleanup removes sessions past timeout", async () => {
    vi.useFakeTimers();
    const manager2 = new SessionManager({}, 100); // 100ms timeout
    await manager2.getOrCreate("session-a");

    vi.advanceTimersByTime(200); // past 100ms timeout
    await vi.runAllTimersAsync();

    expect(manager2.list()).toEqual([]);
    vi.useRealTimers();
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `pnpm vitest packages/mcp-playwright/tests/session-manager.spec.ts --run --project=node`

Expected: FAIL — `SessionManager` is not exported from `session-manager.ts`

**Step 4: Implement SessionManager**

`packages/mcp-playwright/src/session-manager.ts`:
```typescript
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createConnection } from "@playwright/mcp";

interface Session {
  client: Client;
  lastUsed: number;
}

export class SessionManager {
  readonly #sessions = new Map<string, Session>();
  readonly #cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly config: Record<string, unknown>,
    private readonly timeoutMs = 5 * 60 * 1000,
  ) {
    this.#cleanupInterval = setInterval(() => {
      void this.#cleanup();
    }, 30_000);
  }

  async getOrCreate(sessionId: string): Promise<Client> {
    let session = this.#sessions.get(sessionId);
    if (session == null) {
      session = await this.#createSession();
      this.#sessions.set(sessionId, session);
    }
    session.lastUsed = Date.now();
    return session.client;
  }

  async destroy(sessionId: string): Promise<void> {
    const session = this.#sessions.get(sessionId);
    if (session != null) {
      this.#sessions.delete(sessionId);
      await session.client.close();
    }
  }

  async disposeAll(): Promise<void> {
    clearInterval(this.#cleanupInterval);
    const ids = [...this.#sessions.keys()];
    await Promise.all(ids.map((id) => this.destroy(id)));
  }

  list(): string[] {
    return [...this.#sessions.keys()];
  }

  async #createSession(): Promise<Session> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const innerServer = await createConnection(this.config as never);
    await innerServer.connect(serverTransport);
    const client = new Client({ name: "mcp-playwright-proxy", version: "1.0.0" });
    await client.connect(clientTransport);
    return { client, lastUsed: Date.now() };
  }

  async #cleanup(): Promise<void> {
    const now = Date.now();
    for (const [id, session] of this.#sessions) {
      if (now - session.lastUsed > this.timeoutMs) {
        await this.destroy(id);
      }
    }
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm vitest packages/mcp-playwright/tests/session-manager.spec.ts --run --project=node`

Expected: PASS — all 8 tests green

**Step 6: Commit**

```bash
git add packages/mcp-playwright/src/session-manager.ts packages/mcp-playwright/tests/session-manager.spec.ts vitest.config.ts
git commit -m "feat(mcp-playwright): implement SessionManager with tests"
```

---

### Task 3: Tool schema injection utility

**Files:**
- Create: `packages/mcp-playwright/tests/tool-proxy.spec.ts`
- Modify: `packages/mcp-playwright/src/tool-proxy.ts`

**Step 1: Write the failing tests**

`packages/mcp-playwright/tests/tool-proxy.spec.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { injectSessionId } from "../src/tool-proxy.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const sampleTool: Tool = {
  name: "browser_navigate",
  description: "Navigate to a URL",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to navigate to" },
    },
    required: ["url"],
  },
};

describe("injectSessionId", () => {
  it("adds sessionId to properties", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.properties).toHaveProperty("sessionId");
    expect((result.inputSchema.properties as Record<string, unknown>)["sessionId"]).toEqual({
      type: "string",
      description: "Session ID for browser isolation",
    });
  });

  it("adds sessionId to required list", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.required).toContain("sessionId");
  });

  it("preserves original properties", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.properties).toHaveProperty("url");
  });

  it("preserves original required fields", () => {
    const result = injectSessionId(sampleTool);
    expect(result.inputSchema.required).toContain("url");
  });

  it("does not duplicate sessionId if already present", () => {
    const toolWithSession: Tool = {
      ...sampleTool,
      inputSchema: {
        ...sampleTool.inputSchema,
        properties: {
          sessionId: { type: "string" },
          ...sampleTool.inputSchema.properties,
        },
        required: ["sessionId", "url"],
      },
    };
    const result = injectSessionId(toolWithSession);
    const required = result.inputSchema.required as string[];
    expect(required.filter((r) => r === "sessionId")).toHaveLength(1);
  });

  it("preserves tool name and description", () => {
    const result = injectSessionId(sampleTool);
    expect(result.name).toBe("browser_navigate");
    expect(result.description).toBe("Navigate to a URL");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/mcp-playwright/tests/tool-proxy.spec.ts --run --project=node`

Expected: FAIL — `injectSessionId` is not exported

**Step 3: Implement injectSessionId in tool-proxy.ts**

`packages/mcp-playwright/src/tool-proxy.ts`:
```typescript
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
  const { tools: playwrightTools } = await bootstrapClient.listTools();
  await sessionManager.destroy("__bootstrap__");

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

    const { sessionId, ...toolArgs } = args as { sessionId: string; [key: string]: unknown };
    const client = await sessionManager.getOrCreate(sessionId);
    try {
      return await client.callTool({ name, arguments: toolArgs });
    } catch (err) {
      await sessionManager.destroy(sessionId);
      throw err;
    }
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/mcp-playwright/tests/tool-proxy.spec.ts --run --project=node`

Expected: PASS — all 6 tests green

**Step 5: Commit**

```bash
git add packages/mcp-playwright/src/tool-proxy.ts packages/mcp-playwright/tests/tool-proxy.spec.ts
git commit -m "feat(mcp-playwright): implement tool schema injection and proxy registration"
```

---

### Task 4: Entry point

**Files:**
- Modify: `packages/mcp-playwright/src/index.ts`

**Step 1: Implement index.ts**

`packages/mcp-playwright/src/index.ts`:
```typescript
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
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/mcp-playwright`

Expected: PASS — no type errors

**Step 3: Commit**

```bash
git add packages/mcp-playwright/src/index.ts
git commit -m "feat(mcp-playwright): implement entry point with stdio transport and graceful shutdown"
```

---

### Task 5: Build and smoke test

**Step 1: Build the package**

Run: `pnpm build mcp-playwright`

Expected: `packages/mcp-playwright/dist/index.js` created without errors

**Step 2: Verify executable runs**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node packages/mcp-playwright/dist/index.js`

Expected: JSON response with `result.serverInfo.name = "mcp-playwright"` (server initializes successfully)

**Step 3: Run all package tests**

Run: `pnpm vitest packages/mcp-playwright --run --project=node`

Expected: PASS — all 14 tests green

**Step 4: Commit**

```bash
git add packages/mcp-playwright/dist/
git commit -m "feat(mcp-playwright): verify build and smoke test"
```
