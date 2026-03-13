# Legacy (v1)

> All types and classes in this section are **deprecated**. They exist for backward compatibility with v1 WebSocket clients. New implementations should use the v2 protocol (see [Transport](transport.md)).

## SdWebSocketHandlerV1

Deprecated WebSocket handler for v1 protocol clients. Manages v1 socket connections using text-based JSON messaging with message splitting.

```typescript
/** @deprecated */
class SdWebSocketHandlerV1
```

### Methods

- `addSocket(socket: WebSocket, remoteAddress: string | undefined): Promise<void>` - Registers a v1 WebSocket. Retrieves client ID via handshake.
- `closeAll(): void` - Terminates all v1 connections.
- `broadcastReload(clientName, changedFileSet): void` - Sends reload command to all v1 clients.
- `emit<T>(eventType, infoSelector, data): void` - Emits event to matching v1 listeners.

---

## SdServiceSocketV1

Deprecated WebSocket wrapper for v1 protocol. Uses JSON text messaging with `SdServiceProtocolV1`.

```typescript
/** @deprecated */
class SdServiceSocketV1 extends EventEmitter
```

### Key Differences from v2

- Text-based JSON protocol (v2 uses binary).
- Client ID is obtained via a handshake message (`client-get-id` / `client-get-id-response`).
- Ping interval is 10 seconds (v2 uses 5 seconds).
- No authentication support (v1 sockets cannot access `@Authorize`-decorated services).

---

## SdServiceProtocolV1

Deprecated text-based protocol with automatic message splitting for large payloads.

```typescript
/** @deprecated */
class SdServiceProtocolV1
```

### Constants

| Constant | Value | Description |
|---|---|---|
| Split threshold | 3 MB | Messages above this size are split. |
| Chunk size | 300 KB | Each split chunk size. |
| Max total size | 100 MB | Maximum message size limit. |

### Methods

- `encode(message): { json: string; chunks: string[] }` - Encodes a message, splitting if necessary.
- `decode(json): ISdServiceProtocolDecodeResult` - Decodes a message, accumulating split chunks.
- `dispose(): void` - Clears GC timer and accumulator.

---

## SdServiceCommandHelperV1

Deprecated utility for parsing v1 command strings.

```typescript
/** @deprecated */
abstract class SdServiceCommandHelperV1
```

### Static Methods

- `buildMethodCommand(cmdInfo): TSdServiceMethodCommand` - Builds `"ServiceName.methodName"` command string.
- `parseMethodCommand(command): ISdServiceMethodCommandInfo | undefined` - Parses a command string into service/method parts.

---

## V1 Types

### Command Types

```typescript
/** @deprecated */
interface ISdServiceMethodCommandInfo {
  serviceName: string;
  methodName: string;
}

/** @deprecated */
type TSdServiceMethodCommand = `${string}.${string}`;
type TSdServiceSpecialCommand = "addEventListener" | "removeEventListener" | "getEventListenerInfos" | "emitEvent";
type TSdServiceCommand = TSdServiceSpecialCommand | TSdServiceMethodCommand;
```

### Protocol Message Types

All v1 message types are deprecated. Key types include:

- `TSdServiceS2CMessage` - Server-to-client messages (reload, response, progress, events, etc.).
- `TSdServiceC2SMessage` - Client-to-server messages (request, ping, client ID response).
- `ISdServiceRequest` - A service method call request with `uuid`, `command`, `params`, and `clientName`.
- `TSdServiceResponse` - Success or error response with `reqUuid`.
- `ISdServiceSplitRequest` / `ISdServiceSplitResponse` - Split message chunks.
- `ISdServiceProtocolDecodeResult` - Decode result: either `"complete"` with the message, or `"accumulating"` with progress info.
