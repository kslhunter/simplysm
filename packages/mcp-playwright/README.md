# @simplysm/mcp-playwright

Multi-session Playwright MCP (Model Context Protocol) server. Wraps `@playwright/mcp` to support multiple isolated browser sessions, each identified by a `sessionId`.

## Installation

```bash
npm install @simplysm/mcp-playwright
```

## Overview

This package provides a stdio-based MCP server that proxies all `@playwright/mcp` tools while adding multi-session support. Each tool call requires a `sessionId` parameter, ensuring that different consumers can operate independent browser instances without interference.

Key features:

- **Session isolation** -- each `sessionId` gets its own browser context via `@playwright/mcp`
- **Automatic cleanup** -- idle sessions are destroyed after a configurable timeout (default: 5 minutes)
- **Broken connection recovery** -- if an underlying Playwright connection breaks, the session is destroyed and the error is reported
- **All `@playwright/mcp` tools** are automatically discovered and proxied with the added `sessionId` parameter

## Usage

### As an MCP server (CLI)

The package publishes a `sd-mcp-playwright` binary:

```bash
npx sd-mcp-playwright
```

The server communicates over stdio using the MCP protocol. It is designed to be launched by an MCP client (e.g., Claude Code, an IDE extension, or any MCP-compatible host).

### MCP client configuration example

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["sd-mcp-playwright"]
    }
  }
}
```

## Tools

All tools from `@playwright/mcp` are automatically proxied with an additional required `sessionId` parameter. In addition, two session-management tools are provided:

### `session_close`

Close a browser session and release resources.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session ID to close |

### `session_list`

List all active browser session IDs. Returns a JSON array of session ID strings.

No parameters required.

### Proxied Playwright tools

Every tool exposed by `@playwright/mcp` (e.g., `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_take_screenshot`, etc.) is available with an injected `sessionId` parameter. The `sessionId` is stripped before forwarding the call to the underlying Playwright MCP connection.

## Configuration

The server launches browsers with the following defaults:

| Option | Value |
|--------|-------|
| Headless mode | `true` |
| Browser isolation | `true` (each session gets its own context) |
| Output directory | `.tmp/playwright` (screenshots, PDFs, downloads) |
| Session idle timeout | 5 minutes |
| Cleanup interval | 30 seconds |

## API

### `SessionManager`

Manages the lifecycle of multiple isolated Playwright MCP sessions.

```ts
import { SessionManager } from "@simplysm/mcp-playwright";
```

#### `constructor(config, timeoutMs?, version?)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config` | `CreateConnectionConfig` | -- | Configuration passed to `@playwright/mcp` `createConnection()` |
| `timeoutMs` | `number` | `300000` (5 min) | Idle timeout before a session is automatically destroyed |
| `version` | `string` | `"0.0.0"` | Version string for the internal MCP client |

#### `getOrCreate(sessionId: string): Promise<Client>`

Returns the MCP `Client` for the given session, creating a new one if it does not exist. Concurrent calls with the same `sessionId` are coalesced (only one session is created).

#### `destroy(sessionId: string): Promise<void>`

Closes and removes the session with the given ID. No-op if the session does not exist.

#### `disposeAll(): Promise<void>`

Destroys all active sessions and stops the background cleanup timer.

#### `list(): string[]`

Returns an array of all active session IDs.

### `registerProxiedTools(server, sessionManager): Promise<void>`

Discovers all tools from `@playwright/mcp`, injects the `sessionId` parameter, adds session-management tools (`session_close`, `session_list`), and registers request handlers on the given MCP `Server`.

```ts
import { registerProxiedTools } from "@simplysm/mcp-playwright";
```

### `injectSessionId(tool: Tool): Tool`

Utility that takes an MCP `Tool` definition and returns a copy with a required `sessionId` property added to its input schema.

```ts
import { injectSessionId } from "@simplysm/mcp-playwright";
```
