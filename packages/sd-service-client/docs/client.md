# Client

## SdServiceClient

Main client class for connecting to a Simplysm service server via WebSocket. Extends `EventEmitter`. Orchestrates socket connection, transport, event subscription, file operations, and authentication.

### Constructor

```typescript
constructor(
  public readonly name: string,
  public readonly options: ISdServiceConnectionConfig,
)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Client application name, sent to the server on connection |
| `options` | `ISdServiceConnectionConfig` | Connection configuration (host, port, SSL, reconnect count) |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Client application name |
| `options` | `ISdServiceConnectionConfig` | Connection configuration |
| `connected` | `boolean` | Whether the WebSocket is currently open |
| `hostUrl` | `string` | Computed HTTP(S) URL (e.g. `https://localhost:3000`) |

### Methods

#### `connectAsync()`

```typescript
async connectAsync(): Promise<void>
```

Establishes the WebSocket connection to the server.

#### `closeAsync()`

```typescript
async closeAsync(): Promise<void>
```

Gracefully closes the WebSocket connection.

#### `getService<T>(serviceName)`

```typescript
getService<T>(serviceName: string): TRemoteService<T>
```

Returns a `Proxy` object where every property access becomes an async RPC call to `serviceName.methodName` on the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceName` | `string` | Name of the server-side service class |

**Returns:** `TRemoteService<T>` -- a proxy with all methods of `T` returning `Promise`.

#### `sendAsync(serviceName, methodName, params, progress?)`

```typescript
async sendAsync(
  serviceName: string,
  methodName: string,
  params: any[],
  progress?: ISdServiceProgress,
): Promise<any>
```

Sends a raw RPC request to the server.

| Parameter | Type | Description |
|-----------|------|-------------|
| `serviceName` | `string` | Server-side service class name |
| `methodName` | `string` | Method name to invoke |
| `params` | `any[]` | Method arguments |
| `progress` | `ISdServiceProgress` | Optional progress callbacks for request/response |

#### `authAsync(token)`

```typescript
async authAsync(token: string): Promise<void>
```

Authenticates with the server using a JWT token. The token is persisted and automatically re-sent on reconnect.

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | `string` | JWT authentication token |

#### `addEventListenerAsync(eventType, info, cb)`

```typescript
async addEventListenerAsync<T extends SdServiceEventListenerBase<any, any>>(
  eventType: Type<T>,
  info: T["info"],
  cb: (data: T["data"]) => PromiseLike<void>,
): Promise<string>
```

Registers an event listener on the server. Returns a unique key for later removal.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class (extends `SdServiceEventListenerBase`) |
| `info` | `T["info"]` | Filter/subscription info for the event |
| `cb` | `(data: T["data"]) => PromiseLike<void>` | Callback invoked when the event fires |

**Returns:** `Promise<string>` -- the listener key.

#### `removeEventListenerAsync(key)`

```typescript
async removeEventListenerAsync(key: string): Promise<void>
```

Removes a previously registered event listener by key.

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Listener key returned from `addEventListenerAsync` |

#### `emitAsync(eventType, infoSelector, data)`

```typescript
async emitAsync<T extends SdServiceEventListenerBase<any, any>>(
  eventType: Type<T>,
  infoSelector: (item: T["info"]) => boolean,
  data: T["data"],
): Promise<void>
```

Emits an event to all matching listeners across all connected clients.

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventType` | `Type<T>` | Event listener class |
| `infoSelector` | `(item: T["info"]) => boolean` | Filter function to select target listeners |
| `data` | `T["data"]` | Event payload |

#### `uploadFileAsync(files)`

```typescript
async uploadFileAsync(
  files: File[] | FileList | { name: string; data: BlobPart }[],
): Promise<ISdServiceUploadResult[]>
```

Uploads files to the server via HTTP multipart. Requires prior authentication via `authAsync()`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `files` | `File[] \| FileList \| { name: string; data: BlobPart }[]` | Files to upload |

**Returns:** `Promise<ISdServiceUploadResult[]>` -- upload results with path, filename, and size.

#### `downloadFileBufferAsync(relPath)`

```typescript
async downloadFileBufferAsync(relPath: string): Promise<Buffer>
```

Downloads a file from the server as a `Buffer`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `relPath` | `string` | Relative path of the file on the server |

### Events

| Event | Listener Signature | Description |
|-------|-------------------|-------------|
| `"request-progress"` | `(state: ISdServiceProgressState) => void` | Fired during request upload progress |
| `"response-progress"` | `(state: ISdServiceProgressState) => void` | Fired during response download progress |
| `"state"` | `(state: "connected" \| "closed" \| "reconnecting") => void` | Fired on connection state changes |
| `"reload"` | `(changedFileSet: Set<string>) => void` | Fired when the server broadcasts a reload command |

---

## TRemoteService\<T\>

Utility type that converts all methods of `T` so their return types are wrapped in `Promise`. Non-function properties become `never`.

```typescript
type TRemoteService<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (...args: Parameters<T[K]>) => Promise<Awaited<ReturnType<T[K]>>>
    : never;
};
```

Used by `SdServiceClient.getService<T>()` to provide type-safe remote service proxies.
