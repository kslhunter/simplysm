# service-* API Naming Standardization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename 11 public API identifiers across service-common, service-client, and service-server to align with industry standards and internal consistency.

**Architecture:** Pure rename refactoring — no functional changes. All renames applied atomically in a single commit. Existing tests updated to match new names.

**Tech Stack:** TypeScript, pnpm, vitest

---

### Task 1: Rename EventClient methods (service-client)

**Files:**
- Modify: `packages/service-client/src/features/event-client.ts:15-20,66,92,119-123`

**Step 1: Rename `emitToServer` to `emit` and `reRegisterAll` to `resubscribeAll`**

In `packages/service-client/src/features/event-client.ts`:

Interface (lines 15-20): rename `emitToServer` to `emit` and `reRegisterAll` to `resubscribeAll`:
```typescript
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
  resubscribeAll(): Promise<void>;
```

Function definition (line 66): rename `emitToServer` to `emit`:
```typescript
  async function emit<TInfo, TData>(
```

Function definition (line 92): rename `reRegisterAll` to `resubscribeAll`:
```typescript
  async function resubscribeAll(): Promise<void> {
```

Return object (lines 119-123): update the returned property names:
```typescript
  return {
    addListener,
    removeListener,
    emit,
    resubscribeAll,
  };
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm -F @simplysm/service-client exec tsc --noEmit`
Expected: No errors

---

### Task 2: Rename ServiceClient methods + type (service-client)

**Files:**
- Modify: `packages/service-client/src/service-client.ts:6,43,68,81-82,129-148,165,171`

**Step 1: Rename imports, methods, and types**

In `packages/service-client/src/service-client.ts`:

Line 6 — update import path (will be renamed in Task 5):
```typescript
import type { ServiceConnectionOptions } from "./types/connection-options";
```

Line 43 — update constructor parameter type:
```typescript
    public readonly options: ServiceConnectionOptions,
```

Line 68 — rename `reRegisterAll` call to `resubscribeAll`:
```typescript
          await this._eventClient.resubscribeAll();
```

Lines 81-82 — rename `RemoteService` to `ServiceProxy`:
```typescript
  getService<TService>(serviceName: string): ServiceProxy<TService> {
    return new Proxy({} as ServiceProxy<TService>, {
```

Lines 129-148 — rename 3 methods:
```typescript
  async addListener<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    info: TInfo,
    cb: (data: TData) => PromiseLike<void>,
  ): Promise<string> {
    if (!this.connected) throw new Error("Not connected to the server.");
    return this._eventClient.addListener(eventDef, info, cb);
  }

  async removeListener(key: string): Promise<void> {
    await this._eventClient.removeListener(key);
  }

  async emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void> {
    await this._eventClient.emit(eventDef, infoSelector, data);
  }
```

Lines 164-169 — rename type `RemoteService` to `ServiceProxy`:
```typescript
// Type transformer that wraps all method return types of TService with Promise
export type ServiceProxy<TService> = {
  [K in keyof TService]: TService[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never; // Non-function properties are excluded
};
```

Line 171 — update `createServiceClient` parameter type:
```typescript
export function createServiceClient(name: string, options: ServiceConnectionOptions): ServiceClient {
```

**Step 2: Verify no TypeScript errors**

Run: `pnpm -F @simplysm/service-client exec tsc --noEmit`
Expected: May show errors for missing file (connection-options.ts) — resolved in Task 5

---

### Task 3: Rename ServiceSocket methods (service-server)

**Files:**
- Modify: `packages/service-server/src/transport/socket/service-socket.ts:8,42,47,86,213,217`

**Step 1: Rename import, interface, and implementation**

In `packages/service-server/src/transport/socket/service-socket.ts`:

Line 8 — update import (will be renamed in Task 6):
```typescript
import { createServerProtocolWrapper } from "../../protocol/protocol-wrapper";
```

Lines 42-47 — rename interface methods:
```typescript
  /**
   * Register an event listener with key/name/info
   */
  addListener(key: string, eventName: string, info: unknown): void;

  /**
   * Remove an event listener by key
   */
  removeListener(key: string): void;
```

Line 86 — update factory call (will be renamed in Task 6):
```typescript
  const protocol = createServerProtocolWrapper();
```

Lines 213-221 — rename implementation methods:
```typescript
    addListener(key: string, eventName: string, info: unknown): void {
      listenerInfos.push({ key, eventName, info });
    },

    removeListener(key: string): void {
      const idx = listenerInfos.findIndex((item) => item.key === key);
      if (idx >= 0) {
        listenerInfos.splice(idx, 1);
      }
    },
```

---

### Task 4: Rename WebSocketHandler + update call sites (service-server)

**Files:**
- Modify: `packages/service-server/src/transport/socket/websocket-handler.ts:36,87,91,226`

**Step 1: Rename interface method and call sites**

In `packages/service-server/src/transport/socket/websocket-handler.ts`:

Lines 33-40 — rename interface method `emitToServer` to `emit`:
```typescript
  /**
   * Emit event to matching clients
   */
  emit<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ): Promise<void>;
```

Line 87 — update call site `addEventListener` to `addListener`:
```typescript
        serviceSocket.addListener(key, name, info);
```

Line 91 — update call site `removeEventListener` to `removeListener`:
```typescript
        serviceSocket.removeListener(key);
```

Line 226 — rename implementation `emitToServer` to `emit`:
```typescript
    async emit<TInfo, TData>(
```

---

### Task 5: Rename Config types + files (service-client, service-common)

**Files:**
- Rename: `packages/service-client/src/types/connection-config.ts` -> `connection-options.ts`
- Rename: `packages/service-client/src/features/orm/orm-connect-config.ts` -> `orm-connect-options.ts`
- Modify: `packages/service-common/src/service-types/smtp-client-service.types.ts:33`
- Modify: `packages/service-client/src/index.ts:2,15`
- Modify: `packages/service-client/src/features/orm/orm-client-connector.ts:2,8,12,19,34,56`
- Modify: `packages/service-server/src/services/smtp-client-service.ts:4,41`

**Step 1: Create `connection-options.ts` (renamed file)**

Create `packages/service-client/src/types/connection-options.ts`:
```typescript
export interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  /** Set to 0 to disable reconnect; disconnects immediately */
  maxReconnectCount?: number;
}
```

Delete old file `packages/service-client/src/types/connection-config.ts`.

**Step 2: Create `orm-connect-options.ts` (renamed file)**

Create `packages/service-client/src/features/orm/orm-connect-options.ts`:
```typescript
import type { DbContextDef } from "@simplysm/orm-common";
import type { DbConnOptions } from "@simplysm/service-common";

export interface OrmConnectOptions<TDef extends DbContextDef<any, any, any>> {
  dbContextDef: TDef;
  connOpt: DbConnOptions & { configName: string };
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}
```

Delete old file `packages/service-client/src/features/orm/orm-connect-config.ts`.

**Step 3: Rename `SmtpClientDefaultConfig` to `SmtpClientDefaultOptions`**

In `packages/service-common/src/service-types/smtp-client-service.types.ts`, line 33:
```typescript
export interface SmtpClientDefaultOptions {
```

**Step 4: Update `orm-client-connector.ts` imports and usages**

In `packages/service-client/src/features/orm/orm-client-connector.ts`:

Line 2 — update import:
```typescript
import type { OrmConnectOptions } from "./orm-connect-options";
```

All `OrmConnectConfig` references (lines 8, 12, 19, 34, 56) -> `OrmConnectOptions`.

**Step 5: Update `index.ts` re-exports**

In `packages/service-client/src/index.ts`:

Line 2:
```typescript
export * from "./types/connection-options";
```

Line 15:
```typescript
export * from "./features/orm/orm-connect-options";
```

**Step 6: Update `smtp-client-service.ts` import**

In `packages/service-server/src/services/smtp-client-service.ts`:

Line 4:
```typescript
  SmtpClientDefaultOptions,
```

Line 41:
```typescript
      await ctx.getConfig<Record<string, SmtpClientDefaultOptions | undefined>>("smtp")
```

---

### Task 6: Rename ProtocolWrapper + executeServiceMethod + signAuthToken (service-server)

**Files:**
- Modify: `packages/service-server/src/protocol/protocol-wrapper.ts:13,51`
- Modify: `packages/service-server/src/core/service-executor.ts:6`
- Modify: `packages/service-server/src/service-server.ts:4,49,122,213,216`

**Step 1: Rename ProtocolWrapper**

In `packages/service-server/src/protocol/protocol-wrapper.ts`:

Line 13 — rename interface:
```typescript
export interface ServerProtocolWrapper {
```

Line 51 — rename factory function:
```typescript
export function createServerProtocolWrapper(): ServerProtocolWrapper {
```

**Step 2: Rename runServiceMethod**

In `packages/service-server/src/core/service-executor.ts`:

Line 6 — rename function:
```typescript
export async function executeServiceMethod(
```

**Step 3: Update service-server.ts**

In `packages/service-server/src/service-server.ts`:

Line 4 — update import:
```typescript
import { executeServiceMethod } from "./core/service-executor";
```

Line 49 — update constructor call:
```typescript
      (def) => executeServiceMethod(this, def),
```

Lines 121-123 — update API route call:
```typescript
      await handleHttpRequest(req, reply, this.options.auth?.jwtSecret, (def) =>
        executeServiceMethod(this, def),
      );
```

Line 213 — update emitEvent internal call:
```typescript
    await this._wsHandler.emit(eventDef, infoSelector, data);
```

Line 216 — rename method:
```typescript
  async signAuthToken(payload: AuthTokenPayload<TAuthInfo>) {
```

---

### Task 7: Update test files

**Files:**
- Modify: `packages/service-server/tests/service-executor.spec.ts:2,10,17,30,41,55,71,89,105`
- Modify: `tests/service/src/service-client.spec.ts:193,206`

**Step 1: Update service-executor.spec.ts**

In `packages/service-server/tests/service-executor.spec.ts`:

Line 2 — update import:
```typescript
import { executeServiceMethod } from "../src/core/service-executor";
```

Line 10 — update describe:
```typescript
describe("executeServiceMethod with ServiceDefinition", () => {
```

All `runServiceMethod` calls (lines 17, 30, 41, 55, 71, 89, 105) -> `executeServiceMethod`.

**Step 2: Update service-client.spec.ts**

In `tests/service/src/service-client.spec.ts`:

Line 193 — rename method call:
```typescript
      const listenerKey = await client.addListener(
```

Line 206 — rename method call:
```typescript
      await client.removeListener(listenerKey);
```

---

### Task 8: Run type check and existing tests

**Step 1: Type check all 3 packages**

Run: `pnpm -F @simplysm/service-common -F @simplysm/service-client -F @simplysm/service-server exec tsc --noEmit`
Expected: PASS (0 errors)

**Step 2: Run service-server unit tests**

Run: `pnpm -F @simplysm/service-server exec vitest --run`
Expected: All tests pass

**Step 3: Commit all changes**

```bash
git add -A packages/service-common packages/service-client packages/service-server tests/service
git commit -m "refactor(service): rename public API methods to match industry standards"
```
