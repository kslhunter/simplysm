# mcp-playwright Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix 11 code review issues in `packages/mcp-playwright` — resource leaks, race conditions, validation gaps, and minor improvements.

**Architecture:** All changes are internal to `packages/mcp-playwright/src/`. Three source files are modified (`session-manager.ts`, `tool-proxy.ts`, `index.ts`) and one test file updated. No MCP tool interface changes.

**Tech Stack:** TypeScript, `@modelcontextprotocol/sdk`, `@playwright/mcp`, Vitest

---

### Task 1: Store `innerServer` in Session and close on destroy

**Files:**
- Modify: `packages/mcp-playwright/src/session-manager.ts:1-82`
- Modify: `packages/mcp-playwright/tests/session-manager.spec.ts:1-102`

**Step 1: Update test mock to include `innerServer.close`**

In `tests/session-manager.spec.ts`, update the `createConnection` mock to return a `close` function, and add a test verifying `innerServer.close()` is called on destroy:

```typescript
// At top level, add mock for innerServer.close
const mockInnerServerClose = vi.fn().mockResolvedValue(undefined);

// Update the createRequire mock (lines 4-15) to:
vi.mock("node:module", () => ({
  createRequire: () => (id: string) => {
    if (id === "@playwright/mcp") {
      return {
        createConnection: vi.fn().mockResolvedValue({
          connect: vi.fn().mockResolvedValue(undefined),
          close: mockInnerServerClose,
        }),
      };
    }
    throw new Error(`Unexpected require: ${id}`);
  },
}));

// Add new test after "destroy removes the session and calls client.close":
it("destroy closes innerServer", async () => {
  await manager.getOrCreate("session-a");
  await manager.destroy("session-a");
  expect(mockInnerServerClose).toHaveBeenCalledTimes(1);
});
```

Also update `beforeEach` to clear `mockInnerServerClose`:
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  manager = new SessionManager({} as never, 1000);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/mcp-playwright/tests/session-manager.spec.ts --run`
Expected: FAIL — "destroy closes innerServer" fails because `innerServer` is not stored/closed.

**Step 3: Update `session-manager.ts` to store and close `innerServer`**

Import `Server` type from MCP SDK. Add `innerServer` to the `Session` interface. Store it in `_createSession`. Close it in `destroy`:

```typescript
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { createRequire } from "node:module";
import type { createConnection as CreateConnectionFn } from "@playwright/mcp";

// @playwright/mcp ships CJS only — use createRequire for ESM compatibility
const _require = createRequire(import.meta.url);
const { createConnection } = _require("@playwright/mcp") as { createConnection: typeof CreateConnectionFn };

interface Session {
  client: Client;
  innerServer: McpServer;
  lastUsed: number;
}
```

Update `_createSession` (line 65-72) to return `innerServer`:

```typescript
private async _createSession(): Promise<Session> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const innerServer = await createConnection(this.config);
  await innerServer.connect(serverTransport);
  const client = new Client({ name: "mcp-playwright-proxy", version: "1.0.0" });
  try {
    await client.connect(clientTransport);
  } catch (err) {
    await innerServer.close();
    throw err;
  }
  return { client, innerServer, lastUsed: Date.now() };
}
```

Update `destroy` (line 47-53) to close `innerServer`:

```typescript
async destroy(sessionId: string): Promise<void> {
  const session = this._sessions.get(sessionId);
  if (session != null) {
    this._sessions.delete(sessionId);
    await session.client.close();
    await session.innerServer.close();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/mcp-playwright/tests/session-manager.spec.ts --run`
Expected: ALL PASS

---

### Task 2: Fix `_cleanup()` race condition

**Files:**
- Modify: `packages/mcp-playwright/src/session-manager.ts:74-81`

**Step 1: Write the failing test**

In `tests/session-manager.spec.ts`, add:

```typescript
it("cleanup does not run concurrently", async () => {
  vi.useFakeTimers();
  const manager2 = new SessionManager({} as never, 100);
  try {
    await manager2.getOrCreate("session-a");
    await manager2.getOrCreate("session-b");

    // Make destroy slow to trigger overlap
    const originalDestroy = manager2.destroy.bind(manager2);
    let destroyCount = 0;
    vi.spyOn(manager2, "destroy").mockImplementation(async (id: string) => {
      destroyCount++;
      await originalDestroy(id);
    });

    // Advance past timeout + two cleanup intervals
    await vi.advanceTimersByTimeAsync(31_000);
    await vi.advanceTimersByTimeAsync(31_000);

    // destroy should be called exactly 2 times (once per session), not more
    expect(destroyCount).toBe(2);
  } finally {
    await manager2.disposeAll();
    vi.useRealTimers();
  }
});
```

**Step 2: Run test to verify behavior**

Run: `pnpm vitest packages/mcp-playwright/tests/session-manager.spec.ts --run`
Note: This test may pass or fail depending on timing. The real fix is structural.

**Step 3: Implement the fix**

Replace `_cleanup` method (lines 74-81) and add `_cleanupRunning` field:

Add field after `_cleanupInterval` declaration (line 17):

```typescript
private _cleanupRunning = false;
```

Replace `_cleanup` method:

```typescript
private async _cleanup(): Promise<void> {
  if (this._cleanupRunning) return;
  this._cleanupRunning = true;
  try {
    const now = Date.now();
    const expired = [...this._sessions.entries()]
      .filter(([, s]) => now - s.lastUsed > this.timeoutMs)
      .map(([id]) => id);
    for (const id of expired) {
      await this.destroy(id);
    }
  } finally {
    this._cleanupRunning = false;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/mcp-playwright/tests/session-manager.spec.ts --run`
Expected: ALL PASS

---

### Task 3: Fix `config` type and update constructor call

**Files:**
- Modify: `packages/mcp-playwright/src/session-manager.ts:19-20,67`
- Modify: `packages/mcp-playwright/tests/session-manager.spec.ts:44`

**Step 1: Update `SessionManager` constructor type**

In `session-manager.ts`, change the constructor parameter type (line 20):

```typescript
constructor(
  private readonly config: NonNullable<Parameters<typeof CreateConnectionFn>[0]>,
  private readonly timeoutMs = 5 * 60 * 1000,
) {
```

Remove `as never` cast on line 67 (now part of `_createSession` from Task 1):

```typescript
const innerServer = await createConnection(this.config);
```

**Step 2: Update test to match new type**

In `tests/session-manager.spec.ts`, update the constructor call (line 44) and any other constructor calls to use `as never` for the mock:

```typescript
manager = new SessionManager({} as never, 1000);
```

And similarly for `manager2` in the cleanup test:
```typescript
const manager2 = new SessionManager({} as never, 100);
```

**Step 3: Run tests**

Run: `pnpm vitest packages/mcp-playwright/tests/session-manager.spec.ts --run`
Expected: ALL PASS

---

### Task 4: Fix `tool-proxy.ts` issues

**Files:**
- Modify: `packages/mcp-playwright/src/tool-proxy.ts:9-22,29,34,66-69,93-96`
- Modify: `packages/mcp-playwright/tests/tool-proxy.spec.ts:42-57`

**Step 1: Update `injectSessionId` test for spread order**

In `tests/tool-proxy.spec.ts`, update the "does not duplicate sessionId if already present" test (lines 42-57) to also verify the injected definition wins:

```typescript
it("overrides existing sessionId property with injected definition", () => {
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
  // Injected definition should win — has description
  expect((result.inputSchema.properties as Record<string, unknown>)["sessionId"]).toEqual({
    type: "string",
    description: "Session ID for browser isolation",
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/mcp-playwright/tests/tool-proxy.spec.ts --run`
Expected: FAIL — the existing sessionId `{ type: "string" }` overwrites the injected one with description.

**Step 3: Fix `injectSessionId` spread order and extract bootstrap constant**

In `tool-proxy.ts`:

Add constant at top (after imports, before `injectSessionId`):

```typescript
const BOOTSTRAP_SESSION_ID = "__bootstrap__";
```

Fix `injectSessionId` spread order (lines 15-18):

```typescript
properties: {
  ...(tool.inputSchema.properties ?? {}),
  sessionId: { type: "string", description: "Session ID for browser isolation" },
},
```

Replace `"__bootstrap__"` usages (lines 29, 34):

```typescript
const bootstrapClient = await sessionManager.getOrCreate(BOOTSTRAP_SESSION_ID);
// ...
await sessionManager.destroy(BOOTSTRAP_SESSION_ID);
```

Add `sessionId` validation to `session_close` handler (lines 66-70):

```typescript
if (name === "session_close") {
  const sessionId = (args as Record<string, unknown>)["sessionId"];
  if (typeof sessionId !== "string" || sessionId === "") {
    throw new Error("Missing required argument: sessionId");
  }
  await sessionManager.destroy(sessionId);
  return { content: [{ type: "text" as const, text: `Session '${sessionId}' closed.` }] };
}
```

Add session destruction notice in error handler (lines 93-96):

```typescript
try {
  await client.listTools();
} catch {
  // Connection is broken — destroy the session
  await sessionManager.destroy(sessionId);
  return {
    content: [{ type: "text" as const, text: `### Error\n${message}\n\nSession '${sessionId}' was destroyed due to a broken connection.` }],
    isError: true,
  };
}
```

**Step 4: Run tests**

Run: `pnpm vitest packages/mcp-playwright/tests/tool-proxy.spec.ts --run`
Expected: ALL PASS

---

### Task 5: Fix `index.ts` — shutdown and version

**Files:**
- Modify: `packages/mcp-playwright/src/index.ts:1-36`
- Modify: `packages/mcp-playwright/src/session-manager.ts:69`

**Step 1: Update `index.ts`**

Add `createRequire` import and read version from `package.json`. Add `server.close()` to shutdown:

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { createConnection } from "@playwright/mcp";
import { createRequire } from "node:module";
import { SessionManager } from "./session-manager.js";
import { registerProxiedTools } from "./tool-proxy.js";

const _require = createRequire(import.meta.url);
const { version } = _require("./package.json") as { version: string };

const config: NonNullable<Parameters<typeof createConnection>[0]> = {
  browser: { isolated: true, launchOptions: { headless: true } },
  outputDir: ".tmp/playwright",
};

const server = new Server(
  { name: "mcp-playwright", version },
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
  await server.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
```

**Step 2: Update `session-manager.ts` Client version**

In `session-manager.ts`, the `_createSession` method's Client constructor (line 69). Since `session-manager.ts` already uses `createRequire`, read version there too:

After the existing `_require` line (line 7), add:

```typescript
const { version: pkgVersion } = _require("./package.json") as { version: string };
```

Then update the Client constructor in `_createSession`:

```typescript
const client = new Client({ name: "mcp-playwright-proxy", version: pkgVersion });
```

**Step 3: Run all tests**

Run: `pnpm vitest packages/mcp-playwright/tests/ --run`
Expected: ALL PASS
