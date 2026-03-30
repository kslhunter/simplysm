# WebSocket Handler

## `WebSocketHandler`

Manages multiple WebSocket connections, routes messages to services, and handles event broadcasting.

```typescript
export interface WebSocketHandler {
  addSocket(
    socket: WebSocket,
    clientId: string,
    clientName: string,
    connReq: FastifyRequest,
  ): void;
  closeAll(): void;
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `addSocket` | `socket: WebSocket, clientId: string, clientName: string, connReq: FastifyRequest` | `void` | Registers a new WebSocket connection. Closes any existing connection with the same `clientId` |
| `closeAll` | none | `void` | Closes all active WebSocket connections |
| `emit` | `eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData` | `Promise<void>` | Broadcasts an event to all sockets that have matching event listeners |

## `createWebSocketHandler`

Creates a `WebSocketHandler` instance.

```typescript
export function createWebSocketHandler(
  runMethod: (def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
  }) => Promise<unknown>,
  jwtSecret: string | undefined,
): WebSocketHandler;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `runMethod` | `(def: { serviceName; methodName; params; socket? }) => Promise<unknown>` | Callback to execute service methods |
| `jwtSecret` | `string \| undefined` | JWT secret for auth message verification |

Message routing:
- `${service}.${method}` -- Invokes `runMethod` and sends response
- `evt:add` -- Registers an event listener on the socket
- `evt:remove` -- Removes an event listener from the socket
- `evt:gets` -- Returns all listener infos for an event name across all sockets
- `evt:emit` -- Dispatches an event to target listener keys across all sockets
- `auth` -- Verifies JWT token and stores payload on the socket
- Other -- Returns `BAD_MESSAGE` error
