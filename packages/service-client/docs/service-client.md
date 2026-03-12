# Service Client

The main entry point for connecting to and communicating with a `@simplysm/service-server` instance.

## `ServiceClient`

**Class** -- extends `EventEmitter<ServiceClientEvents>`

The primary facade that orchestrates WebSocket connectivity, RPC calls, authentication, event subscriptions, and file operations.

### Constructor

```typescript
new ServiceClient(name: string, options: ServiceConnectionOptions)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Client identifier (sent to server on connection) |
| `options` | `ServiceConnectionOptions` | Connection configuration (see [Types](types.md)) |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Client name (readonly) |
| `options` | `ServiceConnectionOptions` | Connection options (readonly) |
| `connected` | `boolean` | Whether the WebSocket is currently open |
| `hostUrl` | `string` | Computed HTTP(S) base URL (e.g. `https://localhost:3000`) |

### Methods

#### `connect()`

Opens the WebSocket connection to the server.

```typescript
await client.connect();
```

#### `close()`

Gracefully closes the WebSocket connection.

```typescript
await client.close();
```

#### `auth(token)`

Authenticates the connection with the server. The token is stored internally and automatically re-sent on reconnection.

```typescript
await client.auth(token: string): Promise<void>
```

#### `getService<TService>(serviceName)`

Creates a type-safe proxy for calling remote service methods. Every property access on the returned proxy returns an async function that sends an RPC request to the server.

```typescript
const proxy = client.getService<MyService>("MyService");
const result = await proxy.someMethod(arg1, arg2);
```

**Returns:** `ServiceProxy<TService>` -- all methods wrapped to return `Promise<Awaited<R>>`

#### `send(serviceName, methodName, params, progress?)`

Low-level method to send an RPC request. Prefer `getService()` for type safety.

```typescript
await client.send(
  serviceName: string,
  methodName: string,
  params: unknown[],
  progress?: ServiceProgress,
): Promise<unknown>
```

#### `addListener(eventDef, info, cb)`

Subscribes to a server-sent event. Automatically re-subscribes on reconnection.

```typescript
const key = await client.addListener<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  info: TInfo,
  cb: (data: TData) => PromiseLike<void>,
): Promise<string>
```

**Returns:** A unique listener key for later removal.

**Throws:** `Error` if not connected.

#### `removeListener(key)`

Unsubscribes from a previously registered event listener.

```typescript
await client.removeListener(key: string): Promise<void>
```

#### `emitEvent(eventDef, infoSelector, data)`

Emits an event to other connected clients that match the selector.

```typescript
await client.emitEvent<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  infoSelector: (item: TInfo) => boolean,
  data: TData,
): Promise<void>
```

#### `uploadFile(files)`

Uploads files to the server via HTTP POST. Requires prior authentication via `auth()`.

```typescript
const results = await client.uploadFile(
  files: File[] | FileList | { name: string; data: BlobPart }[],
): Promise<ServiceUploadResult[]>
```

**Throws:** `Error` if no auth token is set.

#### `downloadFileBuffer(relPath)`

Downloads a file from the server as a `Uint8Array`.

```typescript
const bytes = await client.downloadFileBuffer(relPath: string): Promise<Bytes>
```

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `state` | `"connected" \| "closed" \| "reconnecting"` | Connection state changes |
| `reload` | `Set<string>` | Server-triggered reload with changed file paths |
| `request-progress` | `ServiceProgressState` | Upload/request progress updates |
| `response-progress` | `ServiceProgressState` | Download/response progress updates |

### Reconnection Behavior

- On reconnect, `auth()` is automatically re-called if a token was previously set.
- All event listeners registered via `addListener()` are automatically re-subscribed.

---

## `createServiceClient()`

**Factory function** -- convenience wrapper for the constructor.

```typescript
function createServiceClient(
  name: string,
  options: ServiceConnectionOptions,
): ServiceClient
```

---

## `ServiceProxy<TService>`

**Type** -- transforms a service interface so that all methods return `Promise<Awaited<R>>`. Non-function properties are excluded.

```typescript
type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```
