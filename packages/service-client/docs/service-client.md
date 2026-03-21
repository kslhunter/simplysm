# ServiceClient

Main client class that orchestrates all service communication modules.

```typescript
import { ServiceClient, createServiceClient, type ServiceProxy } from "@simplysm/service-client";
```

## `ServiceProxy<TService>`

Type transformer that wraps all method return types of `TService` with `Promise`.

```typescript
type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};
```

## Class: `ServiceClient`

Extends `EventEmitter<ServiceClientEvents>`.

### Events

```typescript
interface ServiceClientEvents {
  "request-progress": ServiceProgressState;
  "response-progress": ServiceProgressState;
  "state": "connected" | "closed" | "reconnecting";
  "reload": Set<string>;
}
```

### Constructor

```typescript
constructor(name: string, options: ServiceConnectionOptions)
```

- `name` -- Client name (used for identification on the server)
- `options` -- Connection options

### Properties

#### `connected`

```typescript
get connected(): boolean;
```

#### `hostUrl`

```typescript
get hostUrl(): string;
```

Returns the HTTP(S) URL of the server (e.g., `"https://localhost:3000"`).

### Methods

#### `connect`

Connect to the server via WebSocket.

```typescript
async connect(): Promise<void>;
```

#### `close`

Close the WebSocket connection.

```typescript
async close(): Promise<void>;
```

#### `auth`

Authenticate with the server using a JWT token.

```typescript
async auth(token: string): Promise<void>;
```

#### `getService`

Create a type-safe proxy for calling remote service methods.

```typescript
getService<TService>(serviceName: string): ServiceProxy<TService>;
```

**Example:**
```typescript
const userService = client.getService<UserServiceType>("User");
const profile = await userService.getProfile();
```

#### `send`

Send a raw service method call.

```typescript
async send(
  serviceName: string,
  methodName: string,
  params: unknown[],
  progress?: ServiceProgress,
): Promise<unknown>;
```

#### `addListener`

Add a server-side event listener.

```typescript
async addListener<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  info: TInfo,
  cb: (data: TData) => PromiseLike<void>,
): Promise<string>;
```

Returns a listener key (UUID) that can be used with `removeListener`.

#### `removeListener`

Remove a server-side event listener.

```typescript
async removeListener(key: string): Promise<void>;
```

#### `emitEvent`

Emit an event to matching server-side listeners.

```typescript
async emitEvent<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  infoSelector: (item: TInfo) => boolean,
  data: TData,
): Promise<void>;
```

#### `uploadFile`

Upload files to the server. Requires prior authentication via `auth()`.

```typescript
async uploadFile(
  files: File[] | FileList | { name: string; data: BlobPart }[],
): Promise<ServiceUploadResult[]>;
```

#### `downloadFileBuffer`

Download a file from the server as bytes.

```typescript
async downloadFileBuffer(relPath: string): Promise<Bytes>;
```

## `createServiceClient`

Factory function.

```typescript
function createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient;
```

## Example

```typescript
import { createServiceClient, type ServiceProxy } from "@simplysm/service-client";
import { defineEvent } from "@simplysm/service-common";

// Define event
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// Create client
const client = createServiceClient("my-app", {
  host: "localhost",
  port: 3000,
});

// Connect and authenticate
await client.connect();
await client.auth(jwtToken);

// Call service
const orderService = client.getService<OrderServiceType>("Order");
const orders = await orderService.getAll();

// Listen for events
const key = await client.addListener(OrderUpdated, { orderId: 123 }, async (data) => {
  console.log(data.status);
});

// Track progress
client.on("request-progress", (state) => {
  console.log(`Upload: ${state.completedSize}/${state.totalSize}`);
});

// Cleanup
await client.removeListener(key);
await client.close();
```
