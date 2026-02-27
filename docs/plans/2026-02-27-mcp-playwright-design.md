# MCP Playwright Multi-Session Server Design

## Problem

`@playwright/mcp` uses a single BrowserContext per server instance. When multiple Claude Code sub-agents call tools concurrently, their browser states conflict (navigation, tabs, cookies, etc.).

## Solution

Create `@simplysm/mcp-playwright` — a proxy MCP server that manages multiple `@playwright/mcp` instances via session IDs, giving each sub-agent an isolated BrowserContext.

## Architecture

```
Claude Code (sub-agents)
    |  stdio (JSON-RPC)
    v
+-------------------------------------+
|  @simplysm/mcp-playwright           |
|  (Outer MCP Server - StdioTransport)|
|                                     |
|  - Reads tool list dynamically from |
|    @playwright/mcp at bootstrap     |
|  - Adds sessionId param to all tools|
|  - Routes calls by sessionId        |
|                                     |
|  SessionManager                     |
|  +- Map<sessionId, {                |
|  |    client: MCP Client            |
|  |    transports: [client, server]  |
|  |    lastUsed: Date                |
|  |  }>                              |
|  +- cleanupTimer: 30s interval      |
|                                     |
|  Extra tools:                       |
|  - session_close(sessionId)         |
|  - session_list()                   |
+-------------------------------------+
         |              |
    InMemory        InMemory
    Pair            Pair
         |              |
  createConnection  createConnection
  (@playwright/mcp) (@playwright/mcp)
  (session "a")     (session "b")
```

## Key Design Decisions

### Approach: InMemoryTransport Proxy

Each session gets its own `@playwright/mcp` Server instance connected via `InMemoryTransport.createLinkedPair()`. The outer server proxies tool calls to the appropriate session's MCP Client.

**Rationale**: Reuses all 26+ existing playwright/mcp tools without reimplementation. Updates to `@playwright/mcp` are automatically reflected.

**Trade-off**: Each session carries a full MCP protocol stack (Server + Client + Transport pair). Accepted for the benefit of zero tool reimplementation.

### Low-level Server API

Uses `@modelcontextprotocol/sdk`'s `Server` class directly (not `McpServer`) to avoid JSON Schema → zod conversion. Tool definitions from `@playwright/mcp` are JSON Schema, which the low-level API accepts natively.

### Session Lifecycle

- **Creation**: Lazy — first tool call with a new sessionId automatically creates the session
- **Timeout**: 5 minutes of inactivity, checked every 30 seconds
- **Max sessions**: Unlimited
- **Crash recovery**: Failed session is cleaned up; next call with same sessionId recreates it
- **Shutdown**: All sessions disposed on process exit

### Browser Mode

- Default: headless
- `HEADLESS=false` environment variable to show browser UI for debugging

## Tool Registration Flow

```
1. Bootstrap: Create temp session, call listTools(), cache tool list, destroy temp session
2. For each tool from @playwright/mcp:
   - Add to outer server with sessionId injected into inputSchema
   - Handler: extract sessionId, getOrCreateSession, client.callTool(name, args)
3. Register extra tools: session_close, session_list
```

### Tool Proxy (pseudo-code)

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    ...cachedTools.map(tool => ({
      ...tool,
      inputSchema: {
        ...tool.inputSchema,
        properties: {
          sessionId: { type: "string", description: "Session ID for isolation" },
          ...tool.inputSchema.properties
        },
        required: ["sessionId", ...(tool.inputSchema.required ?? [])]
      }
    })),
    // session_close, session_list definitions
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "session_close") { /* ... */ }
  if (name === "session_list") { /* ... */ }

  const { sessionId, ...toolArgs } = args;
  const session = await getOrCreateSession(sessionId);
  session.lastUsed = Date.now();
  return session.client.callTool({ name, arguments: toolArgs });
});
```

## Package Structure

```
packages/mcp-playwright/
+-- package.json
+-- tsconfig.json
+-- src/
    +-- index.ts              # Entry point: Server + Stdio transport + shutdown
    +-- session-manager.ts    # SessionManager: create/get/destroy/cleanup sessions
    +-- tool-proxy.ts         # Bootstrap tool list, register proxied tools
```

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "...",
    "@playwright/mcp": "...",
    "playwright": "..."
  }
}
```

### Build Target

`node` target in `sd.config.ts` — this is a Node.js CLI tool.

## Session Manager Detail

```typescript
class SessionManager {
  private sessions = new Map<string, Session>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private timeoutMs = 5 * 60 * 1000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), 30_000);
  }

  async getOrCreate(sessionId: string): Promise<Session> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const innerServer = await createConnection(config);
      await innerServer.connect(serverTransport);
      const client = new Client({ name: "proxy", version: "1.0.0" });
      await client.connect(clientTransport);
      session = { client, lastUsed: Date.now() };
      this.sessions.set(sessionId, session);
    }
    session.lastUsed = Date.now();
    return session;
  }

  async destroy(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      await session.client.close();
      this.sessions.delete(sessionId);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastUsed > this.timeoutMs) {
        this.destroy(id);
      }
    }
  }

  async disposeAll(): Promise<void> {
    clearInterval(this.cleanupInterval);
    for (const [id] of this.sessions) {
      await this.destroy(id);
    }
  }
}
```

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Tool call on crashed session | Catch error, destroy session, return error message |
| Invalid sessionId format | Accept any string — no validation needed |
| createConnection fails | Return error to caller, do not cache failed session |
| Transport disconnected | Destroy session, auto-recreate on next call |

## Estimated Code Size

| File | Lines |
|------|-------|
| `index.ts` | ~40 |
| `session-manager.ts` | ~80 |
| `tool-proxy.ts` | ~60 |
| **Total** | **~180** |
