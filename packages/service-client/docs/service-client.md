# ServiceClient

## `ServiceClient`

Main client class that orchestrates all service communication modules. Extends `EventEmitter`.

```typescript
class ServiceClient extends EventEmitter<ServiceClientEvents> {
  readonly name: string;
  readonly options: ServiceConnectionOptions;
  get connected(): boolean;
  get hostUrl(): string;

  constructor(name: string, options: ServiceConnectionOptions);

  getService<TService>(serviceName: string): ServiceProxy<TService>;
  connect(): Promise<void>;
  close(): Promise<void>;
  send(serviceName: string, methodName: string, params: unknown[], progress?: ServiceProgress): Promise<unknown>;
  auth(token: string): Promise<void>;
  addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string>;
  removeListener(key: string): Promise<void>;
  emitEvent<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  uploadFile(files: File[] | FileList | { name: string; data: BlobPart }[]): Promise<ServiceUploadResult[]>;
  downloadFileBuffer(relPath: string): Promise<Bytes>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Client name |
| `options` | `ServiceConnectionOptions` | Connection options |
| `connected` | `boolean` | Whether connected |
| `hostUrl` | `string` | HTTP(S) base URL |

| Method | Description |
|--------|-------------|
| `getService()` | Create a typed service proxy for calling remote methods |
| `connect()` | Establish WebSocket connection |
| `close()` | Close connection |
| `send()` | Send a service method request |
| `auth()` | Authenticate with JWT token |
| `addListener()` | Add event listener |
| `removeListener()` | Remove event listener |
| `emitEvent()` | Emit event to matching listeners |
| `uploadFile()` | Upload files (requires prior auth) |
| `downloadFileBuffer()` | Download file as binary |

## `ServiceClientEvents`

Events emitted by `ServiceClient`.

```typescript
interface ServiceClientEvents {
  "request-progress": ServiceProgressState;
  "response-progress": ServiceProgressState;
  "state": "connected" | "closed" | "reconnecting";
  "reload": Set<string>;
}
```

## `ServiceProxy`

Type transformer that wraps all method return types of a service with `Promise`.

```typescript
type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

## `createServiceClient`

Factory function to create a `ServiceClient` instance.

```typescript
function createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Client name identifier |
| `options` | `ServiceConnectionOptions` | Connection options |
