# @simplysm/mcp-playwright

Simplysm MCP server — multi-session Playwright proxy.

Wraps [`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) and adds **session isolation**: every Playwright tool call requires a `sessionId` argument that routes the request to a dedicated browser instance. Multiple sessions can exist concurrently without interfering with each other.

## Installation

```bash
pnpm add -g @simplysm/mcp-playwright
```

Or run directly with npx/pnpm dlx:

```bash
pnpm dlx @simplysm/mcp-playwright
```

## MCP Configuration

Add the server to your MCP client configuration (e.g., Claude Desktop's `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "pnpm",
      "args": ["dlx", "@simplysm/mcp-playwright"]
    }
  }
}
```

The server communicates over **stdio** using the Model Context Protocol.

## How It Works

- The server starts a single MCP process.
- Each call to a Playwright tool must include a `sessionId` string.
- On the first call with a given `sessionId`, the server launches a dedicated headless browser (isolated Playwright context).
- Subsequent calls with the same `sessionId` reuse that browser context.
- Sessions are automatically cleaned up after **5 minutes of inactivity**.
- Output files (screenshots, traces, etc.) are written to `.tmp/playwright/`.

## Session Management Tools

### `session_list`

Returns all currently active session IDs.

**Input:** _(none)_

**Output:** JSON array of session ID strings.

```json
// Example response content
["session-a", "session-b"]
```

### `session_close`

Closes a specific browser session and releases its resources.

**Input:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | ID of the session to close |

**Output:** Confirmation text: `Session '<sessionId>' closed.`

## Playwright Proxy Tools

All tools from `@playwright/mcp` are forwarded by this server. Each forwarded tool has a `sessionId` field **prepended** to its original input schema.

**Every proxied tool requires:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session ID for browser isolation |
| _(original fields)_ | — | — | Same as the original `@playwright/mcp` tool |

If an error occurs during a proxied tool call, the session is automatically destroyed to avoid leaving a browser in a broken state.

## Server Internals

### `SessionManager`

Internal class that manages the lifecycle of per-session Playwright MCP clients.

**Constructor**

```ts
new SessionManager(config: Record<string, unknown>, timeoutMs?: number)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config` | `Record<string, unknown>` | — | Configuration passed to `@playwright/mcp`'s `createConnection` |
| `timeoutMs` | `number` | `300000` (5 min) | Inactivity timeout before a session is auto-cleaned |

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `getOrCreate` | `(sessionId: string) => Promise<Client>` | Returns an existing MCP client for the session, or creates a new one. Updates the last-used timestamp on each call. |
| `destroy` | `(sessionId: string) => Promise<void>` | Closes and removes a single session. No-op if the session does not exist. |
| `disposeAll` | `() => Promise<void>` | Closes all sessions and stops the cleanup interval. Called on `SIGINT`/`SIGTERM`. |
| `list` | `() => string[]` | Returns an array of all currently active session IDs. |

### `injectSessionId`

Internal utility that adds the `sessionId` field to a Playwright tool's input schema before the tool is registered on the proxy server.

```ts
function injectSessionId(tool: Tool): Tool
```

- Prepends `sessionId` to `inputSchema.properties`.
- Ensures `sessionId` appears first in the `required` array.
- Deduplicates `sessionId` if it is already present in `required`.
- Returns a new tool object; the original is not mutated.

### `registerProxiedTools`

Internal function that wires up all Playwright tools and the two session management tools (`session_list`, `session_close`) to an MCP `Server` instance.

```ts
async function registerProxiedTools(
  server: Server,
  sessionManager: SessionManager,
): Promise<void>
```

At startup it creates a temporary bootstrap session to discover the tool list from `@playwright/mcp`, then destroys it before serving real requests.
