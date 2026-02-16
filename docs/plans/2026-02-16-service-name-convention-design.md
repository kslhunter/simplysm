# defineService Name Convention Unification

## Problem

Server and client use mismatched service name strings, causing runtime error:
"서비스[OrmService]를 찾을 수 없습니다."

- Server: `defineService("OrmService", ...)` (inconsistent with JSDoc convention)
- Client: `getService("OrmService")`
- JSDoc examples: `defineService("Health", ...)`, `defineService("User", ...)`
- README examples: `defineService("MyService", ...)` (inconsistent with JSDoc)

## Decision

Use **short names without "Service" suffix** for `defineService` name parameter.

- `defineService("Orm", ...)` ✓
- `defineService("OrmService", ...)` ✗

This aligns with the existing JSDoc examples in `define-service.ts` and the actual
server code convention (`"AutoUpdate"`, not `"AutoUpdateService"`).

## Changes

### Source Code (Bug Fix)

| File | Before | After |
|------|--------|-------|
| `service-server/src/services/orm-service.ts:22` | `"OrmService"` | `"Orm"` |
| `service-client/src/features/orm/orm-client-db-context-executor.ts:21` | `"OrmService"` | `"Orm"` |

### Documentation (Convention Alignment)

| File | Change |
|------|--------|
| `service-server/README.md` | `"MyService"` → `"My"`, `"UserService"` → `"User"`, `"SecureService"` → `"Secure"` |
| `service-server/docs/server.md` | Same pattern |
| `service-server/docs/authentication.md` | Same pattern |
| `service-server/src/core/define-service.ts` | No change (already uses short names) |
