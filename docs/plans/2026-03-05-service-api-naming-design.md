# service-* API Naming Standardization Design

## Background

Public API names in `packages/service-common`, `packages/service-client`, `packages/service-server` are reviewed against industry standards and internal consistency. This document captures the confirmed changes.

## Approach

**Option B: Atomic** - All renames in a single commit. Pure renames with no functional changes.

## Change Summary

| # | Priority | Current | Proposed | Packages |
|---|----------|---------|----------|----------|
| 1 | P0 | `addEventListener` / `removeEventListener` | `addListener` / `removeListener` | service-client, service-server |
| 2 | P0 | `emitToServer` (client) | `emit` | service-client |
| 3 | P0 | `emitToServer` (WebSocketHandler) | `emit` | service-server |
| 4 | P0 | `runServiceMethod` | `executeServiceMethod` | service-server |
| 5 | P1 | `ServiceConnectionConfig` | `ServiceConnectionOptions` | service-client |
| 6 | P1 | `OrmConnectConfig` | `OrmConnectOptions` | service-client |
| 7 | P1 | `SmtpClientDefaultConfig` | `SmtpClientDefaultOptions` | service-common |
| 8 | P1 | `ProtocolWrapper` / `createProtocolWrapper` | `ServerProtocolWrapper` / `createServerProtocolWrapper` | service-server |
| 9 | P1 | `generateAuthToken` | `signAuthToken` | service-server |
| 10 | P2 | `reRegisterAll` | `resubscribeAll` | service-client |
| 11 | P2 | `RemoteService<T>` | `ServiceProxy<T>` | service-client |

### Kept (no change)

- `ServiceServer.emitEvent` - kept due to `EventEmitter.emit` signature conflict
- `broadcastReload` - specific event method, name conveys intent clearly

## Detailed Change Map

### P0-1: addEventListener/removeEventListener -> addListener/removeListener

**Rationale:** DOM Web API pattern; WebSocket/RPC industry standard (Node.js EventEmitter) uses `addListener`/`removeListener`.

| File | Change |
|------|--------|
| `service-client/src/service-client.ts` | Rename methods |
| `service-server/src/transport/socket/service-socket.ts` | Rename interface + implementation |
| `service-server/src/transport/socket/websocket-handler.ts` | Update call sites |
| `tests/service/src/service-client.spec.ts` | Update call sites |

### P0-2: emitToServer -> emit (client-side + WebSocketHandler)

**Rationale:** Direction hardcoded in method name. Socket.IO, Node.js EventEmitter all use `emit`.

| File | Change |
|------|--------|
| `service-client/src/features/event-client.ts` | Rename interface + function |
| `service-client/src/service-client.ts` | Rename method + update internal call |
| `service-server/src/transport/socket/websocket-handler.ts` | Rename interface + implementation |
| `service-server/src/service-server.ts` | Update internal call `_wsHandler.emitToServer` -> `_wsHandler.emit` |

> Note: `ServiceServer.emitEvent` is NOT renamed due to `EventEmitter.emit` signature conflict.

### P0-4: runServiceMethod -> executeServiceMethod

**Rationale:** `run` is non-standard for method invocation. NestJS CQRS, Java Executor use `execute`.

| File | Change |
|------|--------|
| `service-server/src/core/service-executor.ts` | Rename function |
| `service-server/src/service-server.ts` | Update import + 2 call sites |
| `service-server/tests/service-executor.spec.ts` | Update import + 7 call sites |

> `http-request-handler.ts` uses local param `runMethod` - no change needed.

### P1-1: Config -> Options (+ file renames)

**Rationale:** `ServiceServerOptions` and `DbConnOptions` already use `Options`. Socket.IO, Fastify, ws, gRPC all use `Options`.

| Current File | New File | Type Change |
|-------------|----------|-------------|
| `service-client/src/types/connection-config.ts` | `connection-options.ts` | `ServiceConnectionConfig` -> `ServiceConnectionOptions` |
| `service-client/src/features/orm/orm-connect-config.ts` | `orm-connect-options.ts` | `OrmConnectConfig` -> `OrmConnectOptions` |
| `service-common/src/service-types/smtp-client-service.types.ts` | (same file) | `SmtpClientDefaultConfig` -> `SmtpClientDefaultOptions` |

Import updates needed in:
- `service-client/src/service-client.ts`
- `service-client/src/index.ts`
- `service-client/src/features/orm/orm-client-connector.ts`

### P1-2: ProtocolWrapper -> ServerProtocolWrapper

**Rationale:** Asymmetric with `ClientProtocolWrapper` in service-client. Add `Server` prefix for symmetry.

| File | Change |
|------|--------|
| `service-server/src/protocol/protocol-wrapper.ts` | Rename interface + factory function |
| `service-server/src/transport/socket/service-socket.ts` | Update import + call |

### P1-3: generateAuthToken -> signAuthToken

**Rationale:** Unify verb with `signJwt` (jsonwebtoken standard).

| File | Change |
|------|--------|
| `service-server/src/service-server.ts` | Rename method |

### P2-2: reRegisterAll -> resubscribeAll

**Rationale:** Internal implementation detail leaks to API. `resubscribe` is standard in event streaming.

| File | Change |
|------|--------|
| `service-client/src/features/event-client.ts` | Rename interface + function |
| `service-client/src/service-client.ts` | Update internal call |

### P2-3: RemoteService -> ServiceProxy

**Rationale:** "Remote" prefix non-standard. Proxy pattern is explicit.

| File | Change |
|------|--------|
| `service-client/src/service-client.ts` | Rename type + usage in `getService` |

## Industry Research Summary

Libraries surveyed: Socket.IO, gRPC, tRPC, NestJS, ws, Fastify, jsonwebtoken, jose, Java ExecutorService.

Key findings:
- Event listener: `on`/`off` or `addListener`/`removeListener` (NOT `addEventListener`)
- Event emission: `emit` (NOT `emitToServer`)
- Method execution: `execute` (NOT `run`)
- Configuration objects: `Options` suffix (NOT `Config`)
- JWT operations: `sign`/`verify`/`decode` verbs
