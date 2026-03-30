# Service Socket

## `ServiceSocket`

Manages a single WebSocket connection with protocol encoding/decoding, ping/pong keepalive, and event listener tracking.

```typescript
export interface ServiceSocket {
  readonly connectedAtDateTime: DateTime;
  readonly clientName: string;
  readonly connReq: FastifyRequest;
  authTokenPayload?: AuthTokenPayload;

  close(): void;
  send(uuid: string, msg: ServiceServerMessage): Promise<number>;
  addListener(key: string, eventName: string, info: unknown): void;
  removeListener(key: string): void;
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;
  filterEventTargetKeys(targetKeys: string[]): string[];
  on(event: "error", handler: (err: Error) => void): void;
  on(event: "close", handler: (code: number) => void): void;
  on(event: "message", handler: (data: { uuid: string; msg: ServiceClientMessage }) => void): void;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `connectedAtDateTime` | `DateTime` (readonly) | Timestamp when the connection was established |
| `clientName` | `string` (readonly) | Client identifier name |
| `connReq` | `FastifyRequest` (readonly) | Original Fastify request object |
| `authTokenPayload` | `AuthTokenPayload?` | Authenticated token payload (set via auth message) |

### Methods

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `close` | none | `void` | Terminates the WebSocket connection |
| `send` | `uuid: string, msg: ServiceServerMessage` | `Promise<number>` | Sends a message to the client. Returns total bytes sent |
| `addListener` | `key: string, eventName: string, info: unknown` | `void` | Registers an event listener |
| `removeListener` | `key: string` | `void` | Removes an event listener by key |
| `getEventListeners` | `eventName: string` | `Array<{ key: string; info: unknown }>` | Gets all listeners for an event name |
| `filterEventTargetKeys` | `targetKeys: string[]` | `string[]` | Filters target keys that exist in this socket's listeners |
| `on("error")` | `handler: (err: Error) => void` | `void` | Registers error event handler |
| `on("close")` | `handler: (code: number) => void` | `void` | Registers close event handler |
| `on("message")` | `handler: (data: { uuid: string; msg: ServiceClientMessage }) => void` | `void` | Registers message event handler |

## `createServiceSocket`

Creates a `ServiceSocket` instance wrapping a raw WebSocket.

```typescript
export function createServiceSocket(
  socket: WebSocket,
  clientId: string,
  clientName: string,
  connReq: FastifyRequest,
): ServiceSocket;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `socket` | `WebSocket` (from `ws`) | Raw WebSocket connection |
| `clientId` | `string` | Client unique identifier |
| `clientName` | `string` | Client name |
| `connReq` | `FastifyRequest` | Original request object |

Internal behavior:
- Ping interval: 5 seconds (terminates connection if no pong response)
- Responds to client ping (`0x01`) with pong (`0x02`)
- Uses `ServerProtocolWrapper` for encode/decode
- Reports chunk progress back to client during message reassembly
