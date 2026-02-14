# Service Server: Class to Functional Migration Design

## Motivation

- **Framework consistency**: SolidJS frontend uses functional patterns; server should match for a unified mental model across the framework.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Service definition style | Factory function (`defineService`) | Groups methods per service, ctx shared via closure |
| Auth handling | `auth()` wrapper (service + method level) | Opt-in, non-intrusive, consistent at both levels |
| Context (ctx) | Keep existing ServiceBase properties | server, socket, http, authInfo, clientName, getConfig |
| Client type sharing | `typeof` extraction + `ServiceMethods` | Simple, no separate contract package needed |
| Event system | `defineEvent()` function | Matches functional style, same type safety |
| Server creation | `createServiceServer()` function | Consistent with `defineService` pattern |

## API Design

### Service Definition

```typescript
// Basic service (no auth)
const HealthService = defineService("Health", (ctx) => ({
  check: () => ({ status: "ok", timestamp: Date.now() }),
  ping: () => "pong",
}));

// Service with auth
const UserService = defineService("User", auth((ctx) => ({
  // Inherits service-level auth (login required)
  getProfile: () => ({
    id: ctx.authInfo?.userId,
    name: "John",
  }),

  // Method-level override (admin only)
  deleteUser: auth(["admin"], (id: number) => {
    // ...
  }),
})));
```

### Context Interface

```typescript
interface ServiceContext<TAuthInfo = unknown> {
  server: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;
  http?: { clientName: string; authTokenPayload?: AuthTokenPayload<TAuthInfo> };
  authInfo?: TAuthInfo;
  clientName?: string;
  clientPath?: string;
  getConfig<T>(section: string): Promise<T>;
}
```

### Auth Wrapper

`auth()` works at two levels with a single API:

```typescript
// Service-level: wraps the factory function
auth((ctx) => ({ ... }))        // all methods require login
auth(["admin"], (ctx) => ({ ... }))  // all methods require "admin" role

// Method-level: wraps individual method
auth(() => { ... })             // this method requires login
auth(["admin"], () => { ... })  // this method requires "admin" role
```

- No auth needed? Don't wrap. `auth` is completely invisible to services that don't use it.
- Method-level `auth` overrides service-level `auth`.

### Client Type Sharing

```typescript
// Server: export type from defineService return value
const UserService = defineService("User", auth((ctx) => ({
  getProfile: (): { id: number } => ({ id: ctx.authInfo!.userId }),
  deleteUser: auth(["admin"], (id: number): void => { ... }),
})));

export type UserServiceType = ServiceMethods<typeof UserService>;

// Client: import type only
import type { UserServiceType } from "../server/services";
const userSvc = client.getService<UserServiceType>("User");
await userSvc.getProfile(); // fully typed
```

### Event Definition

```typescript
// Before (class-based)
class OrderUpdated extends ServiceEventListener<{ orderId: number }, { status: string }> {
  readonly eventName = "OrderUpdated";
}

// After (functional)
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// Server: emit
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// Client: subscribe
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  console.log(data.status); // typed
});
```

### Server Registration

```typescript
const server = createServiceServer({
  port: 8080,
  rootPath: "/app/data",
  auth: { jwtSecret: "secret-key" },
  services: [HealthService, UserService, OrmService],
});

await server.listen();
```

### Built-in Services

All built-in services (OrmService, CryptoService, SmtpService, AutoUpdateService) migrate to `defineService`:

```typescript
const OrmService = defineService("Orm", auth((ctx) => ({
  async connect(opt: DbConnOptions & { configName: string }): Promise<number> { ... },
  async executeDefs(connId: number, defs: QueryDef[]): Promise<unknown[][]> { ... },
  async beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void> { ... },
  // ...
})));
```

## Before / After Comparison

```typescript
// ========== BEFORE (class-based) ==========
@Authorize()
export class UserService extends ServiceBase<{ userId: number }> {
  async getProfile() {
    return { id: this.authInfo?.userId };
  }
  @Authorize(["admin"])
  async deleteUser(id: number) { ... }
}

new ServiceServer({ services: [UserService] });

// ========== AFTER (functional) ==========
const UserService = defineService("User", auth((ctx) => ({
  getProfile: () => ({ id: ctx.authInfo?.userId }),
  deleteUser: auth(["admin"], (id: number) => { ... }),
})));

export type UserServiceType = ServiceMethods<typeof UserService>;

createServiceServer({ services: [UserService] });
```

## Summary of Changes

| Before | After |
|--------|-------|
| `class XxxService extends ServiceBase` | `defineService(name, factory)` |
| `@Authorize()` decorator | `auth()` wrapper |
| `this.authInfo`, `this.server`, etc. | `ctx.authInfo`, `ctx.server`, etc. |
| `class Event extends ServiceEventListener` | `defineEvent(name)` |
| `new ServiceServer(...)` | `createServiceServer(...)` |

## Affected Packages

- `service-server`: Core implementation (defineService, auth, createServiceServer, defineEvent)
- `service-common`: Event types, ServiceMethods type utility, protocol (mostly unchanged)
- `service-client`: Update getService to work with new type pattern
- `solid-demo`: Update demo services
- `tests/service/`: Update integration tests
