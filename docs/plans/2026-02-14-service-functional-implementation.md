# Service Packages Functional Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert service-common, service-client, and service-server packages from class-based to functional style while maintaining 100% backward compatibility in consumer APIs.

**Architecture:** Three-phase bottom-up refactoring (service-common → service-server → service-client), converting classes to closure-based factory functions. EventEmitter inheritance removed but `on/off` API preserved via composition. All public APIs remain unchanged.

**Tech Stack:** TypeScript, EventEmitter (Node.js), Web Workers, Closure patterns, Factory functions

---

## Phase 1: service-common

### Task 1: Remove ServiceEventListener and create ServiceProtocol factory

**Files:**
- Delete: `packages/service-common/src/types.ts` (ServiceEventListener class)
- Modify: `packages/service-common/src/protocol/service-protocol.ts` (convert class to factory)
- Create: `packages/service-common/src/protocol/create-service-protocol.ts`
- Test: `packages/service-common/tests/**/*.spec.ts` (ensure existing tests pass)

**Step 1: Read ServiceEventListener to understand it**

Run: Read `packages/service-common/src/types.ts`
Expected: Understand the class is type-only, just extends with eventName

**Step 2: Check where ServiceEventListener is exported**

Run: `pnpm grep "export.*ServiceEventListener" packages/service-common/src/`
Expected: Find export in index.ts

**Step 3: Check if ServiceEventListener is used anywhere**

Run: `pnpm grep -r "ServiceEventListener" packages/ tests/`
Expected: Should not be used (only defineEvent is used)

**Step 4: Read current ServiceProtocol class**

Run: Read `packages/service-common/src/protocol/service-protocol.ts`
Expected: Understand constructor, encode/decode/dispose methods, _accumulator LazyGcMap state

**Step 5: Create createServiceProtocol factory function**

Create file `packages/service-common/src/protocol/create-service-protocol.ts`:

```typescript
export interface ServiceProtocol {
  encode(uuid: string, message: Uint8Array): Promise<Uint8Array[]>;
  decode(bytes: Uint8Array): Promise<{ uuid: string; message: Uint8Array; isComplete: boolean } | undefined>;
  dispose(): void;
}

export function createServiceProtocol(): ServiceProtocol {
  const accumulator = new LazyGcMap<string, ProtocolChunkAccumulator>(
    60_000, // expiry
    5_000   // gc interval
  );

  return {
    async encode(uuid: string, message: Uint8Array): Promise<Uint8Array[]> {
      // Copy logic from ServiceProtocol.encode()
      if (message.length <= PROTOCOL_TOTAL_SIZE_MAX) {
        return [/* encoded chunks */];
      }
      throw new ArgumentError("Message exceeds maximum size");
    },

    async decode(bytes: Uint8Array): Promise<{ uuid: string; message: Uint8Array; isComplete: boolean } | undefined> {
      // Copy logic from ServiceProtocol.decode()
      // Use accumulator closure
      return { uuid: "", message: new Uint8Array(), isComplete: false };
    },

    dispose(): void {
      accumulator.dispose();
    },
  };
}
```

**Step 6: Replace ServiceProtocol class export**

Modify `packages/service-common/src/protocol/service-protocol.ts`:
- Remove the class definition entirely
- Replace with re-export from createServiceProtocol

```typescript
export type { ServiceProtocol } from "./create-service-protocol";
export { createServiceProtocol } from "./create-service-protocol";
```

**Step 7: Remove ServiceEventListener from types.ts**

Modify `packages/service-common/src/types.ts`:
- Delete the ServiceEventListener abstract class entirely
- Keep ServiceUploadResult interface

**Step 8: Update index.ts exports**

Modify `packages/service-common/src/index.ts`:
- Remove `ServiceEventListener` from exports (if exported)
- Add `createServiceProtocol` if not already exported
- Verify `defineEvent` is exported

**Step 9: Run typecheck to verify no breaking changes**

Run: `pnpm typecheck packages/service-common`
Expected: PASS (no type errors about removed exports since nothing uses ServiceEventListener)

**Step 10: Run service-common tests**

Run: `pnpm vitest packages/service-common --run`
Expected: PASS (all protocol tests still work with factory function)

**Step 11: Commit**

```bash
git add packages/service-common/src/
git commit -m "refactor(service-common): convert ServiceProtocol to factory function, remove ServiceEventListener

- Replace ServiceProtocol class with createServiceProtocol() factory
- Remove unused ServiceEventListener abstract class
- Maintain 100% backward compatibility in public API
- Keep defineEvent() as event definition pattern"
```

---

## Phase 2: service-server

### Task 2: Convert stateless utilities to pure functions

**Files:**
- Modify: `packages/service-server/src/auth/jwt-manager.ts` → three pure functions
- Modify: `packages/service-server/src/transport/http/http-request-handler.ts` → single function
- Modify: `packages/service-server/src/transport/http/upload-handler.ts` → single function
- Modify: `packages/service-server/src/transport/http/static-file-handler.ts` → single function
- Modify: `packages/service-server/src/utils/config-manager.ts` → module-level function
- Modify: `packages/service-server/src/core/service-executor.ts` → pure function
- Test: Verify no test failures

**Step 1: Read JwtManager class**

Run: Read `packages/service-server/src/auth/jwt-manager.ts`
Expected: Understand it wraps jose library, three methods (sign/verify/decode)

**Step 2: Create pure functions to replace JwtManager**

Create file `packages/service-server/src/auth/jwt-functions.ts`:

```typescript
export async function signJwt(secret: string, payload: unknown): Promise<string> {
  // Copy from JwtManager.sign()
  const key = await importSPKI(secret, "HS256");
  return sign({ ...payload }, key, { algorithm: "HS256", expirationTime: "12h" });
}

export async function verifyJwt(secret: string, token: string): Promise<unknown> {
  // Copy from JwtManager.verify()
  const key = await importSPKI(secret, "HS256");
  const result = await verify(token, key, { algorithms: ["HS256"] });
  return result.payload;
}

export function decodeJwt(token: string): unknown {
  // Copy from JwtManager.decode()
  const parts = token.split(".");
  return JSON.parse(Buffer.from(parts[1], "base64url").toString());
}
```

**Step 3: Update all JwtManager usages in service-server**

Run: `pnpm grep -r "new JwtManager\|this\._jwtManager" packages/service-server/src/`
Expected: Find references (mainly in service-server.ts)

Modify each usage:
- From: `this._jwtManager = new JwtManager(options.auth.jwtSecret)`
- To: pass secret to functions directly: `signJwt(options.auth.jwtSecret, ...)`

**Step 4: Delete JwtManager class**

Delete file: `packages/service-server/src/auth/jwt-manager.ts`

**Step 5: Read HttpRequestHandler**

Run: Read `packages/service-server/src/transport/http/http-request-handler.ts`
Expected: Understand it's a thin handler, single handle() method

**Step 6: Convert HttpRequestHandler to pure function**

Replace class with:

```typescript
export async function handleHttpRequest(
  req: FastifyRequest,
  reply: FastifyReply,
  options: { executor: ServiceExecutor; jwtSecret: string }
): Promise<void> {
  // Copy handle() logic here
  // No instance state needed
}
```

**Step 7: Similarly convert UploadHandler and StaticFileHandler**

Files:
- `packages/service-server/src/transport/http/upload-handler.ts`
- `packages/service-server/src/transport/http/static-file-handler.ts`

Each becomes a single async function instead of class with handle() method.

**Step 8: Convert ServiceExecutor to pure function**

Read: `packages/service-server/src/core/service-executor.ts`
Replace class with:

```typescript
export async function executeServiceMethod(
  def: { serviceName: string; methodName: string; params: unknown[] },
  options: { services: ServiceDef[]; jwtSecret: string; ... }
): Promise<unknown> {
  // Copy runMethod() logic here
}
```

**Step 9: Convert ConfigManager to module-level function**

Read: `packages/service-server/src/utils/config-manager.ts`
Keep the static pattern but make it simpler:

```typescript
const _cache = new LazyGcMap<string, unknown>(...);
const _watchers = new Map<string, FsWatcher>();

export function getConfig<T>(filePath: string): T {
  // Use closure variables instead of static properties
}
```

**Step 10: Update service-server.ts to use new pure functions**

Modify: `packages/service-server/src/service-server.ts`
- Remove all `this._jwtManager`, `this._httpHandler` etc. instance properties
- Call functions directly instead: `await signJwt(secret, ...)`
- Pass options/config as parameters

**Step 11: Run typecheck**

Run: `pnpm typecheck packages/service-server`
Expected: PASS

**Step 12: Run tests**

Run: `pnpm vitest --project=orm packages/service-server 2>&1 | head -50`
Expected: Tests should still pass (behavior unchanged)

**Step 13: Commit**

```bash
git add packages/service-server/src/
git commit -m "refactor(service-server): convert stateless utilities to pure functions

- JwtManager → signJwt(), verifyJwt(), decodeJwt()
- HttpRequestHandler → handleHttpRequest()
- UploadHandler → handleUpload()
- StaticFileHandler → handleStaticFile()
- ServiceExecutor → executeServiceMethod()
- ConfigManager → getConfig() with closure state
- No behavior changes, same external API"
```

### Task 3: Convert stateful handlers to factory functions

**Files:**
- Modify: `packages/service-server/src/transport/socket/websocket-handler.ts`
- Modify: `packages/service-server/src/transport/socket/service-socket.ts`
- Modify: `packages/service-server/src/protocol/protocol-wrapper.ts`
- Create: Corresponding interface definitions

**Step 1: Read WebSocketHandler class**

Run: Read `packages/service-server/src/transport/socket/websocket-handler.ts`
Expected: Understand state (_socketMap, methods: addSocket, closeAll, broadcastReload, emitToServer)

**Step 2: Create WebSocketHandler interface**

Create new interface (add to file or new file):

```typescript
export interface WebSocketHandler {
  addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: any): void;
  closeAll(): Promise<void>;
  broadcastReload(clientName: string, changedFileSet: Set<string>): Promise<void>;
  emitToServer<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void>;
}
```

**Step 3: Create createWebSocketHandler factory**

Modify `packages/service-server/src/transport/socket/websocket-handler.ts`:

```typescript
export function createWebSocketHandler(options: { executor: ServiceExecutor; jwtSecret: string; ... }): WebSocketHandler {
  const _socketMap = new Map<string, ServiceSocket>();

  return {
    addSocket(socket: WebSocket, clientId: string, clientName: string, connReq: any): void {
      // Close previous connection if exists
      const prevSocket = _socketMap.get(clientId);
      if (prevSocket) prevSocket.close();

      // Create and store new socket
      const svc = createServiceSocket(socket, clientName, options);
      _socketMap.set(clientId, svc);
    },

    async closeAll(): Promise<void> {
      // Close all sockets
      for (const socket of _socketMap.values()) {
        await socket.close();
      }
      _socketMap.clear();
    },

    async broadcastReload(clientName: string, changedFileSet: Set<string>): Promise<void> {
      // Broadcast to all sockets matching clientName
      for (const socket of _socketMap.values()) {
        if (socket.clientName === clientName) {
          // send reload message
        }
      }
    },

    async emitToServer<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void> {
      // Broadcast event to matching sockets
      for (const socket of _socketMap.values()) {
        // Check listeners and emit
      }
    },
  };
}
```

**Step 4: Read ServiceSocket class and create interface**

Run: Read `packages/service-server/src/transport/socket/service-socket.ts`
Expected: Understand state (_protocol, _listenerInfos, _isAlive, heartbeat logic)

**Step 5: Create ServiceSocket interface and factory**

```typescript
export interface ServiceSocket {
  readonly clientName: string;
  readonly connectedAtDateTime: DateTime;
  readonly authTokenPayload?: AuthTokenPayload;

  send(uuid: string, msg: Uint8Array): Promise<void>;
  close(): Promise<void>;
  addEventListener(key: string, eventName: string, info: unknown, cb: (data: unknown) => void): void;
  removeEventListener(key: string): void;
  getEventListeners(eventName: string): Array<{ key: string; info: unknown }>;
}

export function createServiceSocket(
  ws: WebSocket,
  clientName: string,
  options: { ... }
): ServiceSocket {
  const protocol = createProtocolWrapper();
  let authTokenPayload: AuthTokenPayload | undefined;
  const listenerInfos: Array<{ eventName: string; key: string; info: unknown; cb: Function }> = [];
  let isAlive = true;
  let pingTimer: NodeJS.Timeout | undefined;

  // Start heartbeat
  pingTimer = setInterval(() => {
    if (!isAlive) {
      ws.close();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 5000);

  ws.on("message", (data: Uint8Array) => {
    // Handle protocol messages
  });

  return {
    get clientName() { return clientName; },
    get connectedAtDateTime() { return new DateTime(); },
    get authTokenPayload() { return authTokenPayload; },

    async send(uuid: string, msg: Uint8Array): Promise<void> {
      const encoded = await protocol.encode(uuid, msg);
      ws.send(encoded);
    },

    async close(): Promise<void> {
      ws.close();
      if (pingTimer) clearInterval(pingTimer);
      protocol.dispose();
    },

    addEventListener(key: string, eventName: string, info: unknown, cb: (data: unknown) => void): void {
      listenerInfos.push({ eventName, key, info, cb });
    },

    removeEventListener(key: string): void {
      const idx = listenerInfos.findIndex(x => x.key === key);
      if (idx >= 0) listenerInfos.splice(idx, 1);
    },

    getEventListeners(eventName: string) {
      return listenerInfos.filter(x => x.eventName === eventName).map(x => ({ key: x.key, info: x.info }));
    },
  };
}
```

**Step 6: Read ProtocolWrapper and convert to factory**

Run: Read `packages/service-server/src/protocol/protocol-wrapper.ts`
Expected: Static worker management, encode/decode with worker decision

```typescript
export interface ProtocolWrapper {
  encode(uuid: string, message: Uint8Array): Promise<Uint8Array[]>;
  decode(bytes: Uint8Array): Promise<{ uuid: string; message: Uint8Array; isComplete: boolean } | undefined>;
  dispose(): void;
}

export function createProtocolWrapper(): ProtocolWrapper {
  const protocol = createServiceProtocol();
  // (static worker singleton logic remains at module level if needed)

  return {
    async encode(uuid: string, message: Uint8Array): Promise<Uint8Array[]> {
      // Encode logic, optionally use worker if > 30KB
      return protocol.encode(uuid, message);
    },
    async decode(bytes: Uint8Array) {
      // Decode logic, optionally use worker
      return protocol.decode(bytes);
    },
    dispose(): void {
      protocol.dispose();
    },
  };
}
```

**Step 7: Update ServiceServer to use factory functions**

Modify: `packages/service-server/src/service-server.ts`

```typescript
export class ServiceServer<TAuthInfo = unknown> extends EventEmitter<ServiceServerEvents> {
  private readonly _websocketHandler: WebSocketHandler;
  private readonly _protocolWrapper: ProtocolWrapper;

  constructor(public readonly options: ServiceServerOptions) {
    super();
    this._websocketHandler = createWebSocketHandler({ executor: this._executor, ... });
    this._protocolWrapper = createProtocolWrapper();
  }

  // ... rest of class remains but uses _websocketHandler and _protocolWrapper factories
}
```

**Step 8: Run typecheck**

Run: `pnpm typecheck packages/service-server`
Expected: PASS

**Step 9: Run tests**

Run: `pnpm vitest --project=orm packages/service-server --run 2>&1 | head -100`
Expected: All tests pass

**Step 10: Commit**

```bash
git add packages/service-server/src/
git commit -m "refactor(service-server): convert stateful handlers to factory functions

- WebSocketHandler → createWebSocketHandler()
- ServiceSocket → createServiceSocket()
- ProtocolWrapper → createProtocolWrapper()
- All state managed via closures, not instance properties
- EventEmitter inheritance on ServiceServer remains for now"
```

### Task 4: Convert ServiceServer class to functional wrapper

**Files:**
- Modify: `packages/service-server/src/service-server.ts` (keep as thin wrapper for now)
- Keep: EventEmitter inheritance (can refactor separately)
- Update: `packages/solid-demo-server/src/main.ts` to use factory

**Step 1: Ensure createServiceServer exists**

Run: Grep for "export function createServiceServer" in service-server.ts
Expected: Should already exist and just call `new ServiceServer()`

**Step 2: Verify solid-demo-server uses createServiceServer**

Run: Read `packages/solid-demo-server/src/main.ts`
Expected: Currently uses `new ServiceServer()`

**Step 3: Update solid-demo-server to use createServiceServer**

Modify `packages/solid-demo-server/src/main.ts`:

```typescript
// Before
import { ServiceServer } from "@simplysm/service-server";
export const server = new ServiceServer({ ... });

// After
import { createServiceServer } from "@simplysm/service-server";
export const server = createServiceServer({ ... });
```

**Step 4: Check for any other direct ServiceServer() usages**

Run: `pnpm grep -r "new ServiceServer" packages/ tests/`
Expected: Should only find deprecated pattern or build files

**Step 5: Run typecheck for solid-demo-server**

Run: `pnpm typecheck packages/solid-demo-server`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid-demo-server/src/main.ts
git commit -m "refactor(solid-demo-server): use createServiceServer factory function"
```

---

## Phase 3: service-client

### Task 5: Convert service-client internal classes to factories

**Files:**
- Modify: `packages/service-client/src/transport/socket-provider.ts`
- Modify: `packages/service-client/src/transport/service-transport.ts`
- Modify: `packages/service-client/src/protocol/client-protocol-wrapper.ts`
- Modify: `packages/service-client/src/features/event-client.ts`
- Modify: `packages/service-client/src/features/file-client.ts`
- Modify: `packages/service-client/src/features/orm/orm-client-connector.ts`

**Step 1: Create SocketProvider interface and factory**

Read: `packages/service-client/src/transport/socket-provider.ts`
Expected: Understand WebSocket management, reconnect logic, heartbeat

```typescript
export interface SocketProvider {
  readonly connected: boolean;
  readonly clientName: string;

  connect(): Promise<void>;
  close(): Promise<void>;
  send(data: Uint8Array): Promise<void>;

  on<K extends keyof SocketProviderEvents>(event: K, handler: (data: SocketProviderEvents[K]) => void): void;
  off<K extends keyof SocketProviderEvents>(event: K, handler: (data: SocketProviderEvents[K]) => void): void;
}

export function createSocketProvider(
  wsUrl: string,
  clientName: string,
  maxReconnectCount: number
): SocketProvider {
  let ws: WebSocket | undefined;
  let reconnectCount = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let isManualClose = false;
  let lastHeartbeatTime = Date.now();
  const listeners = new Map<string, Set<Function>>();

  return {
    get connected(): boolean { return ws?.readyState === WebSocket.OPEN; },
    get clientName() { return clientName; },

    async connect(): Promise<void> {
      // Copy connect logic from class
      ws = new WebSocket(wsUrl);
      // ... event handlers
      // Start heartbeat
      heartbeatTimer = setInterval(() => {
        if (Date.now() - lastHeartbeatTime > 30_000) {
          ws?.close();
        }
      }, 5000);
    },

    async close(): Promise<void> {
      isManualClose = true;
      ws?.close();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },

    async send(data: Uint8Array): Promise<void> {
      ws?.send(data);
    },

    on(event: any, handler: any) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },

    off(event: any, handler: any) {
      listeners.get(event)?.delete(handler);
    },
  };
}
```

**Step 2: Create ServiceTransport factory**

Read: `packages/service-client/src/transport/service-transport.ts`
Expected: Understand request/response tracking, protocol wrapper

```typescript
export interface ServiceTransport {
  send(message: ServiceMessage, progress?: ServiceProgress): Promise<unknown>;

  on<K extends keyof ServiceTransportEvents>(event: K, handler: (data: ServiceTransportEvents[K]) => void): void;
  off<K extends keyof ServiceTransportEvents>(event: K, handler: (data: ServiceTransportEvents[K]) => void): void;
}

export function createServiceTransport(socket: SocketProvider): ServiceTransport {
  const protocol = createClientProtocolWrapper();
  const pendingRequests = new Map<string, { resolve: Function; reject: Function; progress?: ServiceProgress }>();
  const listeners = new Map<string, Set<Function>>();

  socket.on("message", (bytes) => {
    // Decode and resolve pending requests
  });

  return {
    async send(message: ServiceMessage, progress?: ServiceProgress): Promise<unknown> {
      // Send and await response
    },

    on(event: any, handler: any) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },

    off(event: any, handler: any) {
      listeners.get(event)?.delete(handler);
    },
  };
}
```

**Step 3: Create ClientProtocolWrapper factory**

Similar pattern with worker singleton management.

**Step 4: Create EventClient factory**

```typescript
export interface EventClient {
  addListener<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, info: TInfo, cb: (data: TData) => PromiseLike<void>): Promise<string>;
  removeListener(key: string): Promise<void>;
  emitToServer<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void>;
  reRegisterAll(): Promise<void>;
}

export function createEventClient(transport: ServiceTransport): EventClient {
  const listenerMap = new Map<string, { eventName: string; info: unknown; cb: Function }>();

  return {
    async addListener(eventDef, info, cb) {
      const key = crypto.randomUUID();
      listenerMap.set(key, { eventName: eventDef.eventName, info, cb });
      // Send to server
      return key;
    },

    async removeListener(key) {
      listenerMap.delete(key);
      // Send to server
    },

    async emitToServer(eventDef, infoSelector, data) {
      // Send event to server
    },

    async reRegisterAll() {
      // Re-register all listeners on reconnection
    },
  };
}
```

**Step 5: Convert FileClient to factory**

Already mostly stateless, just wrap:

```typescript
export function createFileClient(hostUrl: string, clientName: string): FileClient {
  return {
    async upload(files, authToken) {
      // HTTP multipart upload
    },

    async download(relPath) {
      // HTTP GET
    },
  };
}
```

**Step 6: Convert OrmClientConnector to pure function**

```typescript
export async function connectOrm<R>(
  client: ServiceClient,
  config: DbConnectConfig,
  callback: (db: DbContext) => Promise<R>
): Promise<R> {
  const executor = new OrmClientDbContextExecutor(client);
  const db = createDbContext(DbContextDef, executor, config);
  return db.connect(callback);
}
```

**Step 7: Update ServiceClient class to use factories**

Modify: `packages/service-client/src/service-client.ts`

```typescript
export class ServiceClient extends EventEmitter<ServiceClientEvents> {
  private readonly _socket: SocketProvider;
  private readonly _transport: ServiceTransport;
  private readonly _eventClient: EventClient;
  private readonly _fileClient: FileClient;
  private _authToken?: string;

  constructor(public readonly name: string, public readonly options: ServiceConnectionConfig) {
    super();
    const wsProtocol = options.ssl ? "wss" : "ws";
    const wsUrl = `${wsProtocol}://${options.host}:${options.port}/ws`;

    this._socket = createSocketProvider(wsUrl, name, options.maxReconnectCount ?? 10);
    this._transport = createServiceTransport(this._socket);
    this._eventClient = createEventClient(this._transport);
    this._fileClient = createFileClient(this.hostUrl, name);

    // Event forwarding
    this._socket.on("state", (state) => {
      this.emit("state", state);
      // Re-auth and re-register on reconnect
    });

    this._transport.on("reload", (files) => {
      this.emit("reload", files);
    });
  }

  // ... rest of methods unchanged
}
```

**Step 8: Create and export createServiceClient factory**

Already exists but ensure it's just:

```typescript
export function createServiceClient(
  name: string,
  options: ServiceConnectionConfig
): ServiceClient {
  return new ServiceClient(name, options);
}

export type { ServiceClient };
export type { RemoteService };
```

**Step 9: Create ServiceClient interface**

Add explicit interface in types file (or same file):

```typescript
export interface ServiceClient {
  readonly name: string;
  readonly options: ServiceConnectionConfig;
  readonly connected: boolean;
  readonly hostUrl: string;

  connect(): Promise<void>;
  close(): Promise<void>;
  send(serviceName: string, methodName: string, params: unknown[], progress?: ServiceProgress): Promise<unknown>;
  auth(token: string): Promise<void>;
  getService<T>(serviceName: string): RemoteService<T>;
  addEventListener<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, info: TInfo, cb: (data: TData) => PromiseLike<void>): Promise<string>;
  removeEventListener(key: string): Promise<void>;
  emitToServer<TInfo, TData>(eventDef: ServiceEventDef<TInfo, TData>, infoSelector: (item: TInfo) => boolean, data: TData): Promise<void>;
  uploadFile(files: File[] | FileList | { name: string; data: BlobPart }[]): Promise<ServiceUploadResult[]>;
  downloadFileBuffer(relPath: string): Promise<Uint8Array>;

  on<K extends keyof ServiceClientEvents>(event: K, handler: (data: ServiceClientEvents[K]) => void): void;
  off<K extends keyof ServiceClientEvents>(event: K, handler: (data: ServiceClientEvents[K]) => void): void;
}
```

**Step 10: Run typecheck**

Run: `pnpm typecheck packages/service-client`
Expected: PASS

**Step 11: Run tests**

Run: `pnpm vitest packages/service-client --run 2>&1 | head -100`
Expected: Tests pass

**Step 12: Commit**

```bash
git add packages/service-client/src/
git commit -m "refactor(service-client): convert internal classes to factory functions

- SocketProvider → createSocketProvider()
- ServiceTransport → createServiceTransport()
- ClientProtocolWrapper → createClientProtocolWrapper()
- EventClient → createEventClient()
- FileClient → createFileClient()
- OrmClientConnector → connectOrm() pure function
- ServiceClient class now uses factories internally
- All state managed via closures
- Public API unchanged (on/off for event handling)"
```

---

## Phase 4: Consumer Updates

### Task 6: Update solid and tests to use new APIs

**Files:**
- Modify: `packages/solid/src/providers/ServiceClientProvider.tsx`
- Modify: `tests/service/src/service-client.spec.ts`
- Modify: `tests/service/vitest.setup.ts`
- Update: All package README.md files

**Step 1: Update ServiceClientProvider**

Modify: `packages/solid/src/providers/ServiceClientProvider.tsx`

```typescript
// Before
const client = new ServiceClient(config.clientName, { ... });

// After
const client = createServiceClient(config.clientName, { ... });
```

Also ensure imports change:
```typescript
import { createServiceClient, type ServiceClient } from "@simplysm/service-client";
```

**Step 2: Run typecheck for solid**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: Update test setup**

Modify: `tests/service/vitest.setup.ts`

Change from:
```typescript
import { ServiceClient } from "@simplysm/service-client";
client = new ServiceClient("test-client", { ... });
```

To:
```typescript
import { createServiceClient } from "@simplysm/service-client";
client = createServiceClient("test-client", { ... });
```

**Step 4: Update test usage**

Modify: `tests/service/src/service-client.spec.ts`

Change all:
```typescript
new ServiceClient(...) → createServiceClient(...)
new OrmClientConnector(...) → connectOrm(...)
```

**Step 5: Run service tests**

Run: `pnpm vitest --project=service tests/service --run 2>&1 | head -50`
Expected: All tests pass (behavior unchanged)

**Step 6: Update README.md files**

Modify:
- `packages/service-common/README.md`
- `packages/service-client/README.md`
- `packages/service-server/README.md`

Update API examples to show:
```typescript
import { createServiceClient, type ServiceClient } from "@simplysm/service-client";
const client = createServiceClient("my-app", { ... });

import { createServiceServer } from "@simplysm/service-server";
const server = createServiceServer({ ... });

import { connectOrm } from "@simplysm/service-client";
await connectOrm(client, config, async (db) => { ... });
```

**Step 7: Commit all consumer updates**

```bash
git add packages/solid/src/ tests/service/ packages/*/README.md
git commit -m "docs(service): update consumer APIs and README examples

- Update ServiceClientProvider to use createServiceClient()
- Update test setup to use factory functions
- Update README examples for all service packages
- Update OrmClientConnector usage to connectOrm() function"
```

---

## Verification

### Task 7: Final verification and test suite

**Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors across all packages)

**Step 2: Full lint**

Run: `pnpm lint`
Expected: PASS

**Step 3: Build all packages**

Run: `pnpm build`
Expected: PASS

**Step 4: Run all tests**

Run: `pnpm vitest --run 2>&1 | tail -50`
Expected: All tests pass

**Step 5: Verify no breaking changes for consumers**

Check that all exports are available:
```typescript
import { createServiceClient, type ServiceClient } from "@simplysm/service-client";
import { createServiceServer } from "@simplysm/service-server";
import { defineEvent, createServiceProtocol } from "@simplysm/service-common";
import { connectOrm } from "@simplysm/service-client";
```

**Step 6: Final commit message**

```bash
git log --oneline | head -10
# Should show our 7 commits in order
```

---

## Notes

- ServiceClient class still exists internally (extends EventEmitter) for easier refactoring
- EventEmitter inheritance can be removed in future PR after verifying all event forwarding works
- All state is now managed via closures instead of instance properties
- Pure functions have no side effects outside their scope
- Factory functions create new instances with isolated state
- Consumer API is 100% backward compatible (same on/off for events)
