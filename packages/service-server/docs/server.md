# Server

`ServiceServer` class and `createServiceServer` factory for `@simplysm/service-server`.

## `ServiceServerOptions`

Configuration options passed to `ServiceServer` or `createServiceServer`.

```typescript
import { ServiceServerOptions } from "@simplysm/service-server";

interface ServiceServerOptions {
  rootPath: string;           // Root directory; static files are served from rootPath/www/
  port: number;               // TCP port to listen on
  ssl?: {
    pfxBytes: Uint8Array;     // PFX certificate bytes
    passphrase: string;       // PFX passphrase
  };
  auth?: {
    jwtSecret: string;        // Secret used for JWT signing/verification
  };
  services: ServiceDefinition[];  // Service definitions to register
}
```

---

## `ServiceServer<TAuthInfo>`

The main server class. Extends `EventEmitter<{ ready: void; close: void }>`. Registers Fastify plugins, mounts all routes, and manages the WebSocket handler.

```typescript
import { ServiceServer } from "@simplysm/service-server";

class ServiceServer<TAuthInfo = unknown> {
  isOpen: boolean;
  readonly fastify: FastifyInstance;
  readonly options: ServiceServerOptions;

  constructor(options: ServiceServerOptions);

  // Start listening on the configured port
  listen(): Promise<void>;

  // Gracefully close all connections and the HTTP server
  close(): Promise<void>;

  // Broadcast a hot-reload signal to all connected WebSocket clients
  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): Promise<void>;

  // Push a server-side event to matching client listeners
  emitEvent<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;

  // Sign an auth token with the configured JWT secret
  generateAuthToken(payload: AuthTokenPayload<TAuthInfo>): Promise<string>;

  // Verify and decode an auth token
  verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>>;
}
```

Example:

```typescript
import { ServiceServer, defineService } from "@simplysm/service-server";

const GreetService = defineService("Greet", (ctx) => ({
  hello: (name: string) => `Hello, ${name}!`,
}));

const server = new ServiceServer({
  rootPath: "./dist",
  port: 3000,
  auth: { jwtSecret: "my-secret" },
  services: [GreetService],
});

await server.listen();
```

---

## `createServiceServer<TAuthInfo>(options)`

Convenience factory function equivalent to `new ServiceServer(options)`.

```typescript
import { createServiceServer } from "@simplysm/service-server";

function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo>;
```

Example:

```typescript
const server = createServiceServer({
  rootPath: "./dist",
  port: 3000,
  services: [OrmService, AutoUpdateService, SmtpClientService],
});

await server.listen();
```

---

## Utils

### `getConfig<TConfig>(filePath)`

Reads and caches a JSON config file from disk. The cache auto-invalidates when the file changes (via file watcher) and expires after 1 hour of no access.

```typescript
import { getConfig } from "@simplysm/service-server";

async function getConfig<TConfig>(filePath: string): Promise<TConfig | undefined>;
```

Example:

```typescript
const config = await getConfig<{ db: DbConnConfig }>("/app/.config.json");
```
