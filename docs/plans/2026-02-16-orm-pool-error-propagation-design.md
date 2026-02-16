# ORM Pool Connection Error Propagation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Expose the original connection error (e.g., ECONNREFUSED) when `generic-pool`'s `pool.acquire()` times out, instead of only showing "ResourceRequest timed out".

**Architecture:** Add a `poolLastErrorMap` alongside the existing `poolMap` to track the last factory creation error per config key. Pass a getter function to `PooledDbConn` so it can retrieve the cause error without circular imports. Wrap `pool.acquire()` in try-catch and throw `SdError` with config details + cause.

**Tech Stack:** generic-pool (factoryCreateError event), SdError (core-common)

---

### Task 1: Add error tracking to pool creation (`create-db-conn.ts`)

**Files:**
- Modify: `packages/orm-node/src/create-db-conn.ts:17` (add map), `:41` (pass getter), `:52-78` (add event listener)

**Step 1: Add `poolLastErrorMap` next to `poolMap`**

At line 17, after the existing `poolMap` declaration, add:

```typescript
// 설정별 커넥션 풀 캐싱
const poolMap = new Map<string, Pool<DbConn>>();

// 풀 생성 실패 시 마지막 에러 캐싱 (configKey 기준)
const poolLastErrorMap = new Map<string, Error>();
```

**Step 2: Register `factoryCreateError` listener on new pool**

In `getOrCreatePool()`, after `createPool(...)` (line 75) and before `poolMap.set(...)` (line 77), add the event listener:

```typescript
    pool.on("factoryCreateError", (err: Error) => {
      poolLastErrorMap.set(configKey, err);
    });
```

**Step 3: Return getter along with pool**

Change `getOrCreatePool` to return both pool and error getter. Update function signature and `createDbConn`:

```typescript
export function createDbConn(config: DbConnConfig): Promise<DbConn> {
  const { pool, getLastCreateError } = getOrCreatePool(config);
  return Promise.resolve(new PooledDbConn(pool, config, getLastCreateError));
}

function getOrCreatePool(config: DbConnConfig): { pool: Pool<DbConn>; getLastCreateError: () => Error | undefined } {
  // ... existing configKey logic ...

  if (!poolMap.has(configKey)) {
    // ... existing pool creation ...

    pool.on("factoryCreateError", (err: Error) => {
      poolLastErrorMap.set(configKey, err);
    });

    poolMap.set(configKey, pool);
  }

  return {
    pool: poolMap.get(configKey)!,
    getLastCreateError: () => poolLastErrorMap.get(configKey),
  };
}
```

**Step 4: Run typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: Fail (PooledDbConn constructor doesn't accept 3rd parameter yet)

---

### Task 2: Add error wrapping to `PooledDbConn.connect()` (`pooled-db-conn.ts`)

**Files:**
- Modify: `packages/orm-node/src/pooled-db-conn.ts:19-24` (constructor), `:46-57` (connect method)

**Step 1: Add `_getLastCreateError` constructor parameter**

```typescript
constructor(
  private readonly _pool: Pool<DbConn>,
  private readonly _initialConfig: DbConnConfig,
  private readonly _getLastCreateError?: () => Error | undefined,
) {
  super();
}
```

**Step 2: Wrap `pool.acquire()` in try-catch**

Replace the `connect()` method body (lines 46-57):

```typescript
async connect(): Promise<void> {
  if (this._rawConn != null) {
    throw new SdError(DB_CONN_ERRORS.ALREADY_CONNECTED);
  }

  // 1. 풀에서 커넥션 획득
  try {
    this._rawConn = await this._pool.acquire();
  } catch (err) {
    const { dialect, host, port, database } = this._initialConfig;
    const cause = this._getLastCreateError?.() ?? (err instanceof Error ? err : undefined);
    throw new SdError(
      ...(cause != null ? [cause] : []),
      `DB 연결 실패 [${dialect}://${host}:${port ?? ""}/${database ?? ""}]`,
    );
  }

  // 2. 물리 연결이 (타임아웃 등으로) 끊어질 경우를 대비해 리스너 등록
  //    만약 사용 중에 끊기면 PooledDbConn도 close 이벤트를 발생시켜야 함
  this._rawConn.on("close", this._onRawConnClose);
}
```

Note: `SdError` constructor accepts `(cause: Error, ...messages: string[])` or `(...messages: string[])`. The spread handles both cases — when `cause` exists, it chains `"DB 연결 실패 [...] => connect ECONNREFUSED ..."`. When no cause, just the message.

**Step 3: Run typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 4: Run lint**

Run: `pnpm lint packages/orm-node`
Expected: PASS

---

### Task 3: Verify with existing tests

**Step 1: Run orm-node related tests**

Run: `pnpm vitest packages/orm-node --run --project=node`
Expected: PASS (or no test files found — orm-node tests are integration tests in `tests/orm/`)

Note: Full integration tests (`tests/orm/`) require Docker DB. The changes are backward-compatible — `_getLastCreateError` is optional, so existing `PooledDbConn` usage without the 3rd param still works. The try-catch only adds error enrichment; if no factory error was captured, the original acquire error is used as cause.
