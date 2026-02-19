# defineService Name Convention Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix OrmService naming mismatch between server/client and standardize all docs to use short names (no "Service" suffix).

**Architecture:** Change `defineService` name parameter convention from `"XxxService"` to `"Xxx"`. Fix the runtime bug where client calls `getService("OrmService")` but server registers as `"Orm"`.

**Tech Stack:** TypeScript, @simplysm/service-server, @simplysm/service-client

---

### Task 1: Fix OrmService name mismatch (server + client)

**Files:**
- Modify: `packages/service-server/src/services/orm-service.ts:22`
- Modify: `packages/service-client/src/features/orm/orm-client-db-context-executor.ts:20-21`

**Step 1: Fix server — revert to short name**

In `packages/service-server/src/services/orm-service.ts`, line 22:

```typescript
// Before:
  "OrmService",
// After:
  "Orm",
```

**Step 2: Fix client — match server's short name**

In `packages/service-client/src/features/orm/orm-client-db-context-executor.ts`, lines 20-21:

```typescript
// Before:
    // "SdOrmService" → "OrmService" 변경
    this._ormService = _client.getService<OrmService>("OrmService");
// After:
    this._ormService = _client.getService<OrmService>("Orm");
```

Remove the now-outdated comment as well.

**Step 3: Typecheck**

Run: `pnpm typecheck packages/service-server && pnpm typecheck packages/service-client`
Expected: PASS (no type changes, only string literal values)

**Step 4: Commit**

```bash
git add packages/service-server/src/services/orm-service.ts packages/service-client/src/features/orm/orm-client-db-context-executor.ts
git commit -m "fix(service): align OrmService name between server and client"
```

---

### Task 2: Update documentation — short name convention

**Files:**
- Modify: `packages/service-server/README.md`
- Modify: `packages/service-server/docs/server.md`
- Modify: `packages/service-server/docs/authentication.md`

**Step 1: Update README.md**

In `packages/service-server/README.md`, apply these replacements:

| Line(s) | Before | After |
|----------|--------|-------|
| 99 | `defineService("MyService",` | `defineService("My",` |
| 137 | `defineService("UserService",` | `defineService("User",` |
| 155 | `defineService("MyService",` | `defineService("My",` |
| 173 | `defineService("SecureService",` | `defineService("Secure",` |
| 191 | `GET /api/MyService/hello` | `GET /api/My/hello` |
| 192 | `POST /api/MyService/hello` | `POST /api/My/hello` |

**Step 2: Update docs/server.md**

In `packages/service-server/docs/server.md`, apply these replacements:

| Line(s) | Before | After |
|----------|--------|-------|
| 113 | `defineService("MyService",` | `defineService("My",` |
| 153 | `defineService("MyService",` | `defineService("My",` |
| 224 | `defineService("UserService",` | `defineService("User",` |
| 236 | `defineService("PublicService",` | `defineService("Public",` |

**Step 3: Update docs/authentication.md**

In `packages/service-server/docs/authentication.md`, apply these replacements:

| Line(s) | Before | After |
|----------|--------|-------|
| 11 | `defineService("UserService",` | `defineService("User",` |
| 25 | `defineService("PublicService",` | `defineService("Public",` |

**Step 4: Commit**

```bash
git add packages/service-server/README.md packages/service-server/docs/server.md packages/service-server/docs/authentication.md
git commit -m "docs(service-server): use short names in defineService examples"
```
