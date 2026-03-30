# Main ServiceClient

## `ServiceClient`

Main service client class. Extends `EventEmitter` with progress and state events. Composes `SocketProvider`, `ServiceTransport`, `EventClient`, `FileClient`, and `ClientProtocolWrapper` internally.

```typescript
export class ServiceClient extends EventEmitter<{
  "request-progress": ServiceProgressState;
  "response-progress": ServiceProgressState;
  "server-progress": ServiceProgressState;
  "state": "connected" | "closed" | "reconnecting";
}> {
  constructor(name: string, options: ServiceConnectionOptions);
}
```

### Events

| Event | Data Type | Description |
|-------|-----------|-------------|
| `request-progress` | `ServiceProgressState` | Request sending progress (chunked messages) |
| `response-progress` | `ServiceProgressState` | Response receiving progress (chunked messages) |
| `server-progress` | `ServiceProgressState` | Server-side chunk reception progress |
| `state` | `"connected" \| "closed" \| "reconnecting"` | Connection state change |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` (readonly) | Client name |
| `options` | `ServiceConnectionOptions` (readonly) | Connection options |
| `connected` | `boolean` (readonly, getter) | Whether the client is currently connected |
| `hostUrl` | `string` (readonly, getter) | Full host URL computed from options (e.g., `https://host:port`) |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getService` | `getService<TService>(serviceName: string): ServiceProxy<TService>` | Returns a type-safe proxy that maps method calls to RPC requests |
| `connect` | `connect(): Promise<void>` | Opens the WebSocket connection |
| `close` | `close(): Promise<void>` | Closes the connection and disposes protocol resources |
| `send` | `send(serviceName: string, methodName: string, params: unknown[], progress?: ServiceProgress): Promise<unknown>` | Sends an RPC call directly |
| `auth` | `auth(token: string): Promise<void>` | Authenticates with a JWT token. Token is cached for reconnection |
| `addListener` | `addListener<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, info: TInfo, cb: (data: TData) => PromiseLike<void>): Promise<string>` | Subscribes to an event. Returns listener key. Throws if not connected |
| `removeListener` | `removeListener(key: string): Promise<void>` | Unsubscribes from an event by key |
| `emitEvent` | `emitEvent<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void>` | Emits an event to matching listeners |
| `uploadFile` | `uploadFile(files: File[] \| FileCollection \| { name: string; data: BlobInput }[]): Promise<ServiceUploadResult[]>` | Uploads files. Requires prior `auth()` call |
| `downloadFileBuffer` | `downloadFileBuffer(relPath: string): Promise<Bytes>` | Downloads a file as `Uint8Array` |

### Reconnection Behavior

On reconnection (`state === "connected"` after a disconnect):
1. Re-authenticates with the cached token (if `auth()` was previously called)
2. Re-subscribes all event listeners via `EventClient.resubscribeAll()`

## `ServiceProxy`

Type utility that wraps all methods of a service interface to return `Promise<Awaited<R>>`.

```typescript
export type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

Non-function properties are mapped to `never`.

## `createServiceClient`

Factory function to create a `ServiceClient` instance.

```typescript
export function createServiceClient(
  name: string,
  options: ServiceConnectionOptions,
): ServiceClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Client identifier name |
| `options` | `ServiceConnectionOptions` | Connection options (host, port, SSL, maxReconnectCount) |

**Returns:** `ServiceClient`

Default `maxReconnectCount` is `10` if not specified in options.
