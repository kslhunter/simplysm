# @simplysm/mcp-playwright

Simplysm MCP server — multi-session Playwright proxy

## Installation

```bash
pnpm add @simplysm/mcp-playwright
```

## Source Index

| Source | Exports | Description | Test |
|--------|---------|-------------|------|
| `src/index.ts` | _(entry point)_ | MCP server entry point: initializes the server, session manager, and proxied tools, then connects via stdio transport | — |
| `src/session-manager.ts` | `SessionManager` | Manages isolated Playwright browser sessions by sessionId, with lazy creation, idle-timeout cleanup, and graceful disposal | `tests/session-manager.spec.ts` |
| `src/tool-proxy.ts` | `injectSessionId`, `registerProxiedTools` | Injects `sessionId` into every proxied Playwright tool's schema and registers all tools plus `session_close`/`session_list` on the MCP server | `tests/tool-proxy.spec.ts` |

## License

Apache-2.0
