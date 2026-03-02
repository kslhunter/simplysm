# mcp-playwright Review Fixes Design

## Summary

Fix 11 issues found during code review of `packages/mcp-playwright`. All changes are internal implementation fixes — no MCP tool interface changes.

## Changes

### session-manager.ts

#### 1. [CRITICAL] Store `innerServer` in Session interface

- Add `innerServer` field (MCP SDK `Server` type) to `Session` interface
- Return `innerServer` from `_createSession()`
- Call `session.innerServer.close()` in `destroy()` before `client.close()`

#### 2. [WARNING] Fix `_cleanup()` race condition

- Snapshot keys before iterating: `const expired = [...this._sessions.entries()].filter(...).map(([id]) => id)`
- Add `_cleanupRunning` flag to prevent concurrent executions

#### 3. [WARNING] Handle `_createSession()` failure

- Wrap `client.connect()` in try/catch
- On failure, call `await innerServer.close()` before re-throwing

#### 4. [WARNING] Fix `config` type

- Change constructor parameter from `Record<string, unknown>` to `NonNullable<Parameters<typeof CreateConnectionFn>[0]>`
- Remove `as never` cast on `createConnection` call

#### 5. [WARNING] Add CJS require comment

- Add inline comment explaining `@playwright/mcp` ships CJS only (no `"type": "module"` in its package.json)

### tool-proxy.ts

#### 6. [WARNING] Add `sessionId` validation to `session_close`

- Add same validation as proxied tool handler: `typeof sessionId !== "string" || sessionId === ""`

#### 7. [WARNING] Include session destruction notice in error response

- When session is destroyed due to broken connection, append notice to error message

#### 8. [INFO] Fix `injectSessionId` spread order

- Reverse spread: put `tool.inputSchema.properties` first, then injected `sessionId` to ensure it always wins

#### 9. [INFO] Extract `__bootstrap__` to constant

- Define `BOOTSTRAP_SESSION_ID` constant

### index.ts

#### 10. [INFO] Call `server.close()` in shutdown

- Add `await server.close()` before `process.exit(0)`

#### 11. [INFO] Remove hardcoded version

- Use `createRequire` to read version from package.json (already available in session-manager.ts pattern)
- Apply to both `Server` in index.ts and `Client` in session-manager.ts

### Test updates

- Add `innerServer.close` mock to `session-manager.spec.ts`
- Verify `innerServer.close()` is called on `destroy()`
