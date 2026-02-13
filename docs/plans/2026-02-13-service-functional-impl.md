# Service Functional Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Migrate service-server from class-based (`ServiceBase` + `@Authorize`) to functional patterns (`defineService` + `auth()` wrapper).

**Architecture:** `defineService(name, factory)` creates a `ServiceDefinition` object. `auth()` is a generic wrapper that marks functions with auth metadata via Symbol. `ServiceExecutor` reads these markers to perform authorization checks. `defineEvent()` replaces `ServiceEventListener` class.

**Tech Stack:** TypeScript, Fastify, WebSocket, Vitest

---

### Task 1: Core — `auth()` wrapper + `defineService()` + types

**Files:**
- Create: `packages/service-server/src/core/define-service.ts`
- Test: `packages/service-server/tests/define-service.spec.ts`

**Step 1: Write the failing test**

```typescript
// packages/service-server/tests/define-service.spec.ts
import { describe, it, expect } from "vitest";
import { defineService, auth, getServiceAuthPermissions, type ServiceDefinition } from "@simplysm/service-server";

describe("defineService", () => {
  it("creates a service definition with name and factory", () => {
    const svc = defineService("Health", (ctx) => ({
      check: () => "ok",
    }));

    expect(svc.name).toBe("Health");
    expect(typeof svc.factory).toBe("function");
  });

  it("factory produces methods when called with ctx", () => {
    const svc = defineService("Echo", (ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const methods = svc.factory({} as any);
    expect(methods.echo("hello")).toBe("Echo: hello");
  });
});

describe("auth", () => {
  it("marks a function with empty permissions (login only)", () => {
    const fn = auth(() => "result");
    expect(getServiceAuthPermissions(fn)).toEqual([]);
    expect(fn()).toBe("result");
  });

  it("marks a function with specific permissions", () => {
    const fn = auth(["admin"], (id: number) => id * 2);
    expect(getServiceAuthPermissions(fn)).toEqual(["admin"]);
    expect(fn(5)).toBe(10);
  });

  it("returns undefined for unmarked functions", () => {
    const fn = () => "plain";
    expect(getServiceAuthPermissions(fn)).toBeUndefined();
  });

  it("works at service-level (wrapping factory)", () => {
    const svc = defineService("User", auth((ctx) => ({
      getProfile: () => "profile",
    })));

    expect(svc.authPermissions).toEqual([]);
  });

  it("works at service-level with roles", () => {
    const svc = defineService("Admin", auth(["admin"], (ctx) => ({
      manage: () => "managed",
    })));

    expect(svc.authPermissions).toEqual(["admin"]);
  });

  it("service without auth has no authPermissions", () => {
    const svc = defineService("Public", (ctx) => ({
      open: () => "open",
    }));

    expect(svc.authPermissions).toBeUndefined();
  });

  it("method-level auth is readable from returned methods", () => {
    const svc = defineService("Mixed", auth((ctx) => ({
      normal: () => "normal",
      adminOnly: auth(["admin"], () => "admin"),
    })));

    const methods = svc.factory({} as any);
    expect(getServiceAuthPermissions(methods.normal)).toBeUndefined();
    expect(getServiceAuthPermissions(methods.adminOnly)).toEqual(["admin"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm vitest packages/service-server/tests/define-service.spec.ts --project=node --run`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```typescript
// packages/service-server/src/core/define-service.ts
import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { objMerge } from "@simplysm/core-common";
import { ConfigManager } from "../utils/config-manager";
import path from "path";

// ── Context ──

export interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: {
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };

  /** V1 legacy context (auto-update only) */
  legacy?: {
    clientName?: string;
  };

  get authInfo(): TAuthInfo | undefined;
  get clientName(): string | undefined;
  get clientPath(): string | undefined;
  getConfig<T>(section: string): Promise<T>;
}

export function createServiceContext<TAuthInfo = unknown>(
  server: ServiceServer<TAuthInfo>,
  socket?: ServiceSocket,
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> },
  legacy?: { clientName?: string },
): ServiceContext<TAuthInfo> {
  return {
    server,
    socket,
    http,
    legacy,

    get authInfo(): TAuthInfo | undefined {
      return (socket?.authTokenPayload?.data ?? http?.authTokenPayload?.data) as TAuthInfo | undefined;
    },

    get clientName(): string | undefined {
      const name = socket?.clientName ?? http?.clientName ?? legacy?.clientName;
      if (name == null) return undefined;

      if (name === "" || name.includes("..") || name.includes("/") || name.includes("\\")) {
        throw new Error(`유효하지 않은 클라이언트 명입니다: ${name}`);
      }

      return name;
    },

    get clientPath(): string | undefined {
      const name = this.clientName;
      return name == null ? undefined : path.resolve(server.options.rootPath, "www", name);
    },

    async getConfig<T>(section: string): Promise<T> {
      let configParent: Record<string, T | undefined> = {};

      const rootFilePath = path.resolve(server.options.rootPath, ".config.json");
      const rootConfig = await ConfigManager.getConfig<Record<string, T>>(rootFilePath);
      if (rootConfig != null) {
        configParent = rootConfig;
      }

      const targetPath = this.clientPath;
      if (targetPath != null) {
        const clientFilePath = path.resolve(targetPath, ".config.json");
        const clientConfig = await ConfigManager.getConfig<Record<string, T>>(clientFilePath);
        if (clientConfig != null) {
          configParent = objMerge(configParent, clientConfig);
        }
      }

      const config = configParent[section];
      if (config == null) throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
      return config;
    },
  };
}

// ── Auth ──

const AUTH_PERMISSIONS = Symbol("authPermissions");

/** Read auth permissions from an auth()-wrapped function. Returns undefined if not wrapped. */
export function getServiceAuthPermissions(fn: Function): string[] | undefined {
  return (fn as Record<symbol, unknown>)[AUTH_PERMISSIONS] as string[] | undefined;
}

/**
 * Auth wrapper for service factories and methods.
 *
 * - Service-level: `auth((ctx) => ({ ... }))` — all methods require login
 * - Service-level with roles: `auth(["admin"], (ctx) => ({ ... }))`
 * - Method-level: `auth(() => result)` — this method requires login
 * - Method-level with roles: `auth(["admin"], () => result)`
 */
export function auth<T extends (...args: any[]) => any>(fn: T): T;
export function auth<T extends (...args: any[]) => any>(permissions: string[], fn: T): T;
export function auth(permissionsOrFn: string[] | Function, maybeFn?: Function): Function {
  const permissions = Array.isArray(permissionsOrFn) ? permissionsOrFn : [];
  const fn = Array.isArray(permissionsOrFn) ? maybeFn! : permissionsOrFn;

  // Create wrapper that preserves call behavior
  const wrapper = (...args: unknown[]) => fn(...args);
  (wrapper as Record<symbol, unknown>)[AUTH_PERMISSIONS] = permissions;

  return wrapper;
}

// ── Service Definition ──

export interface ServiceDefinition<TMethods = Record<string, (...args: any[]) => any>> {
  name: string;
  factory: (ctx: ServiceContext) => TMethods;
  authPermissions?: string[];
}

/**
 * Define a service with a name and factory function.
 *
 * @example
 * // Basic service
 * const HealthService = defineService("Health", (ctx) => ({
 *   check: () => ({ status: "ok" }),
 * }));
 *
 * // Service with auth
 * const UserService = defineService("User", auth((ctx) => ({
 *   getProfile: () => ctx.authInfo,
 *   adminOnly: auth(["admin"], () => "admin"),
 * })));
 */
export function defineService<TMethods extends Record<string, (...args: any[]) => any>>(
  name: string,
  factory: (ctx: ServiceContext) => TMethods,
): ServiceDefinition<TMethods> {
  return {
    name,
    factory,
    authPermissions: getServiceAuthPermissions(factory),
  };
}

// ── Type Utility ──

/**
 * Extract method signatures from a ServiceDefinition for client-side type sharing.
 *
 * @example
 * export type UserServiceType = ServiceMethods<typeof UserService>;
 * // Client: client.getService<UserServiceType>("User");
 */
export type ServiceMethods<T> = T extends ServiceDefinition<infer M> ? M : never;
```

Then update `packages/service-server/src/index.ts` to add the new export:

```typescript
// Core
export * from "./core/service-base";
export * from "./core/service-executor";
export * from "./core/define-service";  // NEW
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm vitest packages/service-server/tests/define-service.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/service-server/src/core/define-service.ts packages/service-server/tests/define-service.spec.ts packages/service-server/src/index.ts
git commit -m "feat(service-server): add defineService, auth, ServiceContext core"
```

---

### Task 2: Core — `defineEvent()` in service-common

**Files:**
- Create: `packages/service-common/src/define-event.ts`
- Modify: `packages/service-common/src/index.ts`
- Test: `packages/service-common/tests/define-event.spec.ts`

**Step 1: Write the failing test**

```typescript
// packages/service-common/tests/define-event.spec.ts
import { describe, it, expect } from "vitest";
import { defineEvent, type ServiceEventDef } from "@simplysm/service-common";

describe("defineEvent", () => {
  it("creates an event definition with the given name", () => {
    const evt = defineEvent<{ channel: string }, string>("OrderUpdated");
    expect(evt.eventName).toBe("OrderUpdated");
  });

  it("can be used for type inference (compile-time check)", () => {
    const evt = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

    // Type-level checks — these would fail at compile time if wrong
    const info: typeof evt.$info = { orderId: 123 };
    const data: typeof evt.$data = { status: "shipped" };

    expect(info.orderId).toBe(123);
    expect(data.status).toBe("shipped");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm vitest packages/service-common/tests/define-event.spec.ts --project=node --run`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// packages/service-common/src/define-event.ts

/**
 * Event definition created by defineEvent().
 * $info and $data are type-only markers (not used at runtime).
 */
export interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  /** Type extraction only (not used at runtime) */
  readonly $info: TInfo;
  /** Type extraction only (not used at runtime) */
  readonly $data: TData;
}

/**
 * Define a service event with type-safe info and data.
 *
 * @example
 * const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");
 *
 * // Server emit
 * ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });
 *
 * // Client subscribe
 * await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
 *   console.log(data.status); // typed
 * });
 */
export function defineEvent<TInfo = unknown, TData = unknown>(eventName: string): ServiceEventDef<TInfo, TData> {
  return {
    eventName,
    $info: undefined as unknown as TInfo,
    $data: undefined as unknown as TData,
  };
}
```

Update index:

```typescript
// packages/service-common/src/index.ts — add line:
export * from "./define-event";
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm vitest packages/service-common/tests/define-event.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/service-common/src/define-event.ts packages/service-common/tests/define-event.spec.ts packages/service-common/src/index.ts
git commit -m "feat(service-common): add defineEvent for functional event definitions"
```

---

### Task 3: Refactor `ServiceExecutor` to support `ServiceDefinition`

**Files:**
- Modify: `packages/service-server/src/core/service-executor.ts`
- Modify: `packages/service-server/src/types/server-options.ts`

**Step 1: Write the failing test**

```typescript
// packages/service-server/tests/service-executor.spec.ts
import { describe, it, expect } from "vitest";
import { ServiceExecutor, defineService, auth } from "@simplysm/service-server";

// Minimal mock server
function createMockServer(services: any[]) {
  return { options: { services, auth: { jwtSecret: "test" } } } as any;
}

describe("ServiceExecutor with ServiceDefinition", () => {
  it("executes a basic service method", async () => {
    const EchoService = defineService("Echo", (ctx) => ({
      echo: (msg: string) => `Echo: ${msg}`,
    }));

    const executor = new ServiceExecutor(createMockServer([EchoService]));
    const result = await executor.runMethod({
      serviceName: "Echo",
      methodName: "echo",
      params: ["hello"],
    });

    expect(result).toBe("Echo: hello");
  });

  it("throws when service not found", async () => {
    const executor = new ServiceExecutor(createMockServer([]));

    await expect(
      executor.runMethod({ serviceName: "Unknown", methodName: "test", params: [] }),
    ).rejects.toThrow("서비스[Unknown]를 찾을 수 없습니다.");
  });

  it("throws when method not found", async () => {
    const svc = defineService("Test", (ctx) => ({
      existing: () => "ok",
    }));
    const executor = new ServiceExecutor(createMockServer([svc]));

    await expect(
      executor.runMethod({ serviceName: "Test", methodName: "nonexistent", params: [] }),
    ).rejects.toThrow("메소드[Test.nonexistent]를 찾을 수 없습니다.");
  });

  it("blocks unauthenticated access to auth-required service", async () => {
    const svc = defineService("Protected", auth((ctx) => ({
      secret: () => "secret",
    })));
    const executor = new ServiceExecutor(createMockServer([svc]));

    await expect(
      executor.runMethod({ serviceName: "Protected", methodName: "secret", params: [] }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("blocks unauthorized role access", async () => {
    const svc = defineService("Admin", auth((ctx) => ({
      manage: auth(["admin"], () => "managed"),
      view: () => "viewed",
    })));
    const executor = new ServiceExecutor(createMockServer([svc]));

    // Has auth but wrong role
    await expect(
      executor.runMethod({
        serviceName: "Admin",
        methodName: "manage",
        params: [],
        http: { clientName: "test", authTokenPayload: { roles: ["user"], data: {} } as any },
      }),
    ).rejects.toThrow("권한이 부족합니다.");
  });

  it("allows access with correct role", async () => {
    const svc = defineService("Admin", auth((ctx) => ({
      manage: auth(["admin"], () => "managed"),
    })));
    const executor = new ServiceExecutor(createMockServer([svc]));

    const result = await executor.runMethod({
      serviceName: "Admin",
      methodName: "manage",
      params: [],
      http: { clientName: "test", authTokenPayload: { roles: ["admin"], data: {} } as any },
    });

    expect(result).toBe("managed");
  });

  it("provides context to factory", async () => {
    const svc = defineService("Ctx", (ctx) => ({
      getClientName: () => ctx.clientName,
    }));
    const executor = new ServiceExecutor(createMockServer([svc]));

    const result = await executor.runMethod({
      serviceName: "Ctx",
      methodName: "getClientName",
      params: [],
      http: { clientName: "my-app", authTokenPayload: undefined },
    });

    expect(result).toBe("my-app");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm vitest packages/service-server/tests/service-executor.spec.ts --project=node --run`
Expected: FAIL

**Step 3: Write implementation**

Update `packages/service-server/src/types/server-options.ts`:

```typescript
import type { ServiceDefinition } from "../core/define-service";

export interface ServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBytes: Uint8Array;
    passphrase: string;
  };
  auth?: {
    jwtSecret: string;
  };
  services: ServiceDefinition[];
}
```

Rewrite `packages/service-server/src/core/service-executor.ts`:

```typescript
import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { createServiceContext, getServiceAuthPermissions } from "./define-service";

export class ServiceExecutor {
  constructor(private readonly _server: ServiceServer) {}

  async runMethod(def: {
    serviceName: string;
    methodName: string;
    params: unknown[];
    socket?: ServiceSocket;
    http?: { clientName: string; authTokenPayload?: AuthTokenPayload };
  }): Promise<unknown> {
    // 서비스 정의 찾기
    const serviceDef = this._server.options.services.find((item) => item.name === def.serviceName);

    if (serviceDef == null) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    // 요청 검증 (Gatekeeper)
    const clientName = def.socket?.clientName ?? def.http?.clientName;
    if (clientName != null) {
      if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
        throw new Error(`[Security] 유효하지 않은 클라이언트명입니다: ${clientName}`);
      }
    }

    // Context 생성
    const ctx = createServiceContext(this._server, def.socket, def.http);

    // Factory 호출하여 메서드 객체 생성
    const methods = serviceDef.factory(ctx);

    // 메서드 찾기
    const method = (methods as Record<string, unknown>)[def.methodName];
    if (typeof method !== "function") {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 인증 검사
    if (this._server.options.auth != null) {
      // 메서드 레벨 auth 먼저 확인, 없으면 서비스 레벨 확인
      const methodPerms = getServiceAuthPermissions(method);
      const requiredPerms = methodPerms ?? serviceDef.authPermissions;

      if (requiredPerms != null) {
        const authTokenPayload = def.socket?.authTokenPayload ?? def.http?.authTokenPayload;

        if (authTokenPayload == null) {
          throw new Error("로그인이 필요합니다.");
        }

        if (requiredPerms.length > 0) {
          const hasPerm = requiredPerms.some((perm) => authTokenPayload.roles.includes(perm));
          if (!hasPerm) {
            throw new Error("권한이 부족합니다.");
          }
        }
      }
    }

    // 실행
    return await (method as Function)(...def.params);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm vitest packages/service-server/tests/service-executor.spec.ts --project=node --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/service-server/src/core/service-executor.ts packages/service-server/src/types/server-options.ts packages/service-server/tests/service-executor.spec.ts
git commit -m "refactor(service-server): ServiceExecutor supports ServiceDefinition"
```

---

### Task 4: Refactor `ServiceServer` + `createServiceServer()`

**Files:**
- Modify: `packages/service-server/src/service-server.ts`
- Modify: `packages/service-server/src/index.ts`

**Step 1: Update ServiceServer**

In `packages/service-server/src/service-server.ts`:

1. Replace the `ServiceEventListener` class-based `emitEvent` with `ServiceEventDef`-based.
2. Update the V1 legacy handler to use functional auto-update service.
3. Add `createServiceServer()` function.

Key changes:

```typescript
import type { ServiceEventDef } from "@simplysm/service-common";
// Remove: import type { Type } from "@simplysm/core-common";
// Remove: import type { ServiceEventListener } from "@simplysm/service-common";

// emitEvent changes signature:
async emitEvent<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  infoSelector: (item: TInfo) => boolean,
  data: TData,
) {
  await this._wsHandler.emitToServer(eventDef, infoSelector, data);
}

// V1 legacy: find AutoUpdate service definition and create context
// In WebSocket route handler, replace:
//   const autoUpdateService = new AutoUpdateService();
//   autoUpdateService.server = this;
// With:
//   const autoUpdateDef = this.options.services.find((s) => s.name === "AutoUpdate");
//   const ctx = createServiceContext(this);
//   const methods = autoUpdateDef?.factory(ctx);
```

Add at the bottom of the file:

```typescript
export function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo> {
  return new ServiceServer<TAuthInfo>(options);
}
```

**Step 2: Update WebSocketHandler emitToServer**

In `packages/service-server/src/transport/socket/websocket-handler.ts`:

```typescript
import type { ServiceEventDef } from "@simplysm/service-common";
// Remove: import type { Type } from "@simplysm/core-common";
// Remove: import type { ServiceEventListener } from "@simplysm/service-common";

async emitToServer<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  infoSelector: (item: TInfo) => boolean,
  data: TData,
) {
  const eventName = eventDef.eventName;
  // ... rest stays the same but uses eventName directly instead of eventType.prototype.eventName
}
```

**Step 3: Update legacy V1 handler**

In `packages/service-server/src/legacy/v1-auto-update-handler.ts`:

```typescript
// Change parameter type
export function handleV1Connection(
  socket: WebSocket,
  autoUpdateMethods: { getLastVersion: (platform: string) => Promise<any> },
  clientNameSetter?: (clientName: string | undefined) => void,
) {
  // Replace autoUpdateService.getLastVersion with autoUpdateMethods.getLastVersion
  // Replace autoUpdateService.legacy = ... with clientNameSetter?.()
}
```

**Step 4: Run typecheck**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm typecheck packages/service-server`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/service-server/src/service-server.ts packages/service-server/src/transport/socket/websocket-handler.ts packages/service-server/src/legacy/v1-auto-update-handler.ts packages/service-server/src/index.ts
git commit -m "refactor(service-server): ServiceServer uses ServiceDefinition + createServiceServer"
```

---

### Task 5: Migrate built-in services to `defineService`

**Files:**
- Modify: `packages/service-server/src/services/orm-service.ts`
- Modify: `packages/service-server/src/services/crypto-service.ts`
- Modify: `packages/service-server/src/services/smtp-service.ts`
- Modify: `packages/service-server/src/services/auto-update-service.ts`

**Step 1: Migrate OrmService**

Rewrite `packages/service-server/src/services/orm-service.ts` using `defineService` + `auth`:

Key pattern:
```typescript
import { defineService, auth, type ServiceContext } from "../core/define-service";

// Static state needs to live outside the factory (shared across calls)
const socketConns = new WeakMap<ServiceSocket, Map<number, DbConn>>();

export const OrmService = defineService("Orm", auth((ctx) => {
  const sock = (): ServiceSocket => {
    const socket = ctx.socket;
    if (socket == null) {
      throw new Error("WebSocket 연결이 필요합니다. HTTP로는 ORM 서비스를 사용할 수 없습니다.");
    }
    return socket;
  };

  // ... helper functions using ctx and closures

  return {
    async getInfo(opt) { ... },
    async connect(opt) { ... },
    async close(connId) { ... },
    async beginTransaction(connId, isolationLevel?) { ... },
    async commitTransaction(connId) { ... },
    async rollbackTransaction(connId) { ... },
    async executeParametrized(connId, query, params?) { ... },
    async executeDefs(connId, defs, options?) { ... },
    async bulkInsert(connId, tableName, columnDefs, records) { ... },
  };
}));

export type OrmServiceType = ServiceMethods<typeof OrmService>;
```

**Step 2: Migrate CryptoService**

```typescript
export const CryptoService = defineService("Crypto", (ctx) => ({
  async encrypt(data: string | Bytes): Promise<string> { ... },
  async encryptAes(data: Bytes): Promise<string> { ... },
  async decryptAes(encText: string): Promise<Bytes> { ... },
}));
```

**Step 3: Migrate SmtpService**

```typescript
export const SmtpService = defineService("Smtp", (ctx) => ({
  async send(options: SmtpSendOption): Promise<string> { ... },
  async sendByConfig(configName: string, options: SmtpSendByConfigOption): Promise<string> { ... },
}));
```

**Step 4: Migrate AutoUpdateService**

```typescript
export const AutoUpdateService = defineService("AutoUpdate", (ctx) => ({
  async getLastVersion(platform: string) { ... },
}));
```

**Step 5: Run typecheck**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm typecheck packages/service-server`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/service-server/src/services/
git commit -m "refactor(service-server): migrate built-in services to defineService"
```

---

### Task 6: Update `service-client` to support `ServiceEventDef`

**Files:**
- Modify: `packages/service-client/src/service-client.ts`
- Modify: `packages/service-client/src/features/event-client.ts`

**Step 1: Update EventClient.addListener**

In `packages/service-client/src/features/event-client.ts`:

```typescript
import type { ServiceEventDef } from "@simplysm/service-common";
// Remove: import type { Type } from "@simplysm/core-common";
// Remove: import type { ServiceEventListener } from "@simplysm/service-common";

async addListener<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  info: TInfo,
  cb: (data: TData) => PromiseLike<void>,
): Promise<string> {
  const key = Uuid.new().toString();
  const eventName = eventDef.eventName;  // Direct property instead of prototype access

  await this._transport.send({
    name: "evt:add",
    body: { key, name: eventName, info },
  });

  this._listenerMap.set(key, { eventName, info, cb });
  return key;
}

async emitToServer<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  infoSelector: (item: TInfo) => boolean,
  data: TData,
): Promise<void> {
  const eventName = eventDef.eventName;
  // ... rest same
}
```

**Step 2: Update ServiceClient**

In `packages/service-client/src/service-client.ts`:

```typescript
import type { ServiceEventDef } from "@simplysm/service-common";
// Remove ServiceEventListener import

async addEventListener<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  info: TInfo,
  cb: (data: TData) => PromiseLike<void>,
): Promise<string> {
  if (!this.connected) throw new Error("서버와 연결되어있지 않습니다.");
  return this._eventClient.addListener(eventDef, info, cb);
}

async emitToServer<TInfo, TData>(
  eventDef: ServiceEventDef<TInfo, TData>,
  infoSelector: (item: TInfo) => boolean,
  data: TData,
): Promise<void> {
  await this._eventClient.emitToServer(eventDef, infoSelector, data);
}
```

**Step 3: Run typecheck**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm typecheck packages/service-client`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/service-client/src/service-client.ts packages/service-client/src/features/event-client.ts
git commit -m "refactor(service-client): use ServiceEventDef instead of ServiceEventListener"
```

---

### Task 7: Migrate integration tests

**Files:**
- Modify: `tests/service/src/test-service.ts`
- Modify: `tests/service/vitest.setup.ts`
- Modify: `tests/service/src/service-client.spec.ts`

**Step 1: Rewrite TestService**

```typescript
// tests/service/src/test-service.ts
import { defineService, auth } from "@simplysm/service-server";

export interface TestAuthInfo {
  userId: string;
  userName: string;
  roles: string[];
}

export const TestService = defineService("TestService", (ctx) => ({
  echo: (message: string): Promise<string> => {
    return Promise.resolve(`Echo: ${message}`);
  },

  getComplexData: (): Promise<{
    number: number;
    string: string;
    array: number[];
    nested: { a: string; b: number };
    date: Date;
  }> => {
    return Promise.resolve({
      number: 42,
      string: "hello",
      array: [1, 2, 3],
      nested: { a: "nested", b: 99 },
      date: new Date("2026-01-08T12:00:00Z"),
    });
  },

  throwError: (message: string): Promise<void> => {
    return Promise.reject(new Error(message));
  },

  delayedResponse: async (ms: number): Promise<string> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return `Delayed ${ms}ms`;
  },

  getAuthInfo: auth((): Promise<TestAuthInfo | undefined> => {
    return Promise.resolve(ctx.authInfo as TestAuthInfo | undefined);
  }),

  adminOnly: auth(["admin"], (): Promise<string> => {
    return Promise.resolve("Admin access granted");
  }),

  getClientName: (): Promise<string | undefined> => {
    return Promise.resolve(ctx.clientName);
  },

  getLargeData: (sizeKb: number): Promise<string> => {
    return Promise.resolve("A".repeat(sizeKb * 1024));
  },
}));

export type TestServiceMethods = import("@simplysm/service-server").ServiceMethods<typeof TestService>;
```

**Step 2: Update vitest.setup.ts**

```typescript
// Replace: new ServiceServer<TestAuthInfo>({...})
// With: createServiceServer<TestAuthInfo>({...})
// Replace: services: [TestService]
// (TestService is now a ServiceDefinition, not a class — works as-is)
import { createServiceServer } from "@simplysm/service-server";
```

**Step 3: Update spec file**

```typescript
// Replace: import type { TestService, TestAuthInfo } from "./test-service";
// With: import type { TestServiceMethods, TestAuthInfo } from "./test-service";

// Replace: import { ServiceEventListener } from "@simplysm/service-common";
// With: import { defineEvent } from "@simplysm/service-common";

// Replace: class TestEvent extends ServiceEventListener<...> { ... }
// With: const TestEvent = defineEvent<{ channel: string }, string>("TestEvent");

// Replace: client.getService<TestService>("TestService")
// With: client.getService<TestServiceMethods>("TestService")
```

**Step 4: Run integration tests**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm vitest tests/service --project=service --run`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/service/
git commit -m "test(service): migrate integration tests to functional service pattern"
```

---

### Task 8: Cleanup old code + update exports

**Files:**
- Delete: `packages/service-server/src/core/service-base.ts`
- Delete: `packages/service-server/src/auth/auth.decorators.ts`
- Modify: `packages/service-server/src/index.ts`

**Step 1: Remove old files**

Delete `service-base.ts` and `auth.decorators.ts`.

**Step 2: Update index.ts**

```typescript
// packages/service-server/src/index.ts

// Types
export * from "./types/server-options";

// Auth
export * from "./auth/auth-token-payload";
export * from "./auth/jwt-manager";
// REMOVED: export * from "./auth/auth.decorators";

// Core
export * from "./core/define-service";
export * from "./core/service-executor";
// REMOVED: export * from "./core/service-base";

// Transport - Socket
export * from "./transport/socket/websocket-handler";
export * from "./transport/socket/service-socket";

// Transport - HTTP
export * from "./transport/http/http-request-handler";
export * from "./transport/http/upload-handler";
export * from "./transport/http/static-file-handler";

// Protocol
export * from "./protocol/protocol-wrapper";

// Services
export * from "./services/orm-service";
export * from "./services/crypto-service";
export * from "./services/smtp-service";
export * from "./services/auto-update-service";

// Utils
export * from "./utils/config-manager";

// Legacy
export * from "./legacy/v1-auto-update-handler";

// Main
export * from "./service-server";
```

**Step 3: Verify no remaining references**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && grep -r "ServiceBase\|@Authorize\|Authorize(" packages/ tests/ --include="*.ts" --include="*.tsx" -l`
Expected: No results (or only CLAUDE.md / README references)

**Step 4: Run full typecheck**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm typecheck`
Expected: PASS

**Step 5: Run lint**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/service-refactor && pnpm lint`
Expected: PASS (or auto-fixable only)

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(service-server): remove ServiceBase, Authorize decorator"
```

---

### Task 9: Update README.md for service-server, service-common, service-client

**Files:**
- Modify: `packages/service-server/README.md`
- Modify: `packages/service-common/README.md`
- Modify: `packages/service-client/README.md`

**Step 1: Read existing READMEs**

Read all three READMEs to understand current structure.

**Step 2: Update service-server README**

- Replace `ServiceBase` class examples with `defineService` + `auth` patterns
- Replace `@Authorize()` examples with `auth()` wrapper
- Document `createServiceServer()`, `defineService()`, `auth()`, `ServiceContext`, `ServiceMethods`
- Keep English, include import paths

**Step 3: Update service-common README**

- Add `defineEvent()` documentation
- Keep `ServiceEventListener` as deprecated reference (if still exported) or remove

**Step 4: Update service-client README**

- Update `addEventListener` signature to use `ServiceEventDef`
- Update `getService` examples with `ServiceMethods` type

**Step 5: Commit**

```bash
git add packages/service-server/README.md packages/service-common/README.md packages/service-client/README.md
git commit -m "docs: update service package READMEs for functional API"
```

---

## Dependency Graph

```
Task 1 (defineService + auth + types) ─┬─→ Task 3 (ServiceExecutor) ─→ Task 4 (ServiceServer)
                                        ├─→ Task 5 (built-in services)
Task 2 (defineEvent) ──────────────────┬┤─→ Task 6 (service-client)
                                       │└─→ Task 4 (ServiceServer)
                                       │
Task 3 + 4 + 5 + 6 ───────────────────→ Task 7 (integration tests)
Task 7 ────────────────────────────────→ Task 8 (cleanup)
Task 8 ────────────────────────────────→ Task 9 (README)
```

**Parallelizable groups:**
- Task 1 & Task 2 (independent)
- Task 5 & Task 6 (after Task 1-3 complete)
