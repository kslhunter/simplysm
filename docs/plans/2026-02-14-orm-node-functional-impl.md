# orm-node Functional Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert DbConnFactory static class to createDbConn function and SdOrm class to createOrm factory function.

**Architecture:** Replace class-based factory/builder patterns with module-level functions and closures. Static state becomes module-level state. No behavioral changes—only API style.

**Tech Stack:** TypeScript, Node.js, generic-pool, mysql2, pg, tedious

---

## Task 1: Convert DbConnFactory to createDbConn

**Files:**
- Create: `packages/orm-node/src/create-db-conn.ts`
- Delete: `packages/orm-node/src/db-conn-factory.ts`
- Modify: `packages/orm-node/src/node-db-context-executor.ts:14,35`
- Modify: `packages/orm-node/src/index.ts:10`

**Step 1: Read the original class to understand structure**

Already done in planning—DbConnFactory is a static class with:
- Static `_poolMap` cache
- Public `create()` method
- Three private static helpers: `_getOrCreatePool`, `_createRawConnection`, `_ensureModule`

**Step 2: Create new file with functional implementation**

Create `packages/orm-node/src/create-db-conn.ts`:

```typescript
import type { Pool } from "generic-pool";
import { createPool } from "generic-pool";
import type { DbConn, DbConnConfig } from "./types/db-conn";
import { PooledDbConn } from "./pooled-db-conn";
import { MysqlDbConn } from "./connections/mysql-db-conn";
import { MssqlDbConn } from "./connections/mssql-db-conn";
import { PostgresqlDbConn } from "./connections/postgresql-db-conn";

/**
 * DB 연결 팩토리
 *
 * 데이터베이스 연결 인스턴스를 생성하고 풀링을 관리한다.
 * MSSQL, MySQL, PostgreSQL을 지원한다.
 */

// 설정별 커넥션 풀 캐싱
const poolMap = new Map<string, Pool<DbConn>>();

// 지연 로딩 모듈 캐시
const modules: {
  tedious?: typeof import("tedious");
  mysql?: typeof import("mysql2/promise");
  pg?: typeof import("pg");
  pgCopyStreams?: typeof import("pg-copy-streams");
} = {};

/**
 * DB 연결 생성
 *
 * 커넥션 풀에서 연결을 획득하여 반환한다.
 * 풀이 없는 경우 새로 생성한다.
 *
 * @param config - 데이터베이스 연결 설정
 * @returns 풀링된 DB 연결 객체
 */
export function createDbConn(config: DbConnConfig): Promise<DbConn> {
  // 1. 풀 가져오기 (없으면 생성)
  const pool = getOrCreatePool(config);

  // 2. 래퍼 객체 반환
  return Promise.resolve(new PooledDbConn(pool, config));
}

function getOrCreatePool(config: DbConnConfig): Pool<DbConn> {
  // 객체를 키로 쓰기 위해 문자열 변환 (중첩 객체도 정렬하여 동일 설정의 일관된 키 보장)
  const configKey = JSON.stringify(config, (_, value: unknown) =>
    value != null && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value,
  );

  if (!poolMap.has(configKey)) {
    const pool = createPool<DbConn>(
      {
        create: async () => {
          const conn = await createRawConnection(config);
          await conn.connect();
          return conn;
        },
        destroy: async (conn) => {
          await conn.close(); // 풀에서 제거될 때 실제 연결 종료
        },
        validate: (conn) => {
          // 획득 시 연결 상태 확인 (끊겨있으면 Pool이 폐기하고 새로 만듦)
          return Promise.resolve(conn.isConnected);
        },
      },
      {
        min: config.pool?.min ?? 1,
        max: config.pool?.max ?? 10,
        acquireTimeoutMillis: config.pool?.acquireTimeoutMillis ?? 30000,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis ?? 30000,
        testOnBorrow: true, // [중요] 빌려줄 때 validate 실행 여부
      },
    );

    poolMap.set(configKey, pool);
  }

  return poolMap.get(configKey)!;
}

async function createRawConnection(config: DbConnConfig): Promise<DbConn> {
  if (config.dialect === "mysql") {
    const mysql = await ensureModule("mysql");
    return new MysqlDbConn(mysql, config);
  } else if (config.dialect === "postgresql") {
    const pg = await ensureModule("pg");
    const pgCopyStreams = await ensureModule("pgCopyStreams");
    return new PostgresqlDbConn(pg, pgCopyStreams.from, config);
  } else {
    // mssql, mssql-azure
    const tedious = await ensureModule("tedious");
    return new MssqlDbConn(tedious, config);
  }
}

async function ensureModule<K extends keyof typeof modules>(
  name: K,
): Promise<NonNullable<(typeof modules)[K]>> {
  if (modules[name] == null) {
    if (name === "mysql") {
      modules.mysql = await import("mysql2/promise");
    } else if (name === "pg") {
      modules.pg = await import("pg");
    } else if (name === "pgCopyStreams") {
      modules.pgCopyStreams = await import("pg-copy-streams");
    } else {
      modules.tedious = await import("tedious");
    }
  }
  return modules[name]!;
}
```

**Step 3: Update node-db-context-executor.ts**

Replace line 14:
```typescript
import { DbConnFactory } from "./db-conn-factory";
```

With:
```typescript
import { createDbConn } from "./create-db-conn";
```

Replace line 35:
```typescript
this._conn = await DbConnFactory.create(this._config);
```

With:
```typescript
this._conn = await createDbConn(this._config);
```

**Step 4: Update index.ts export**

Replace line 10:
```typescript
export * from "./db-conn-factory";
```

With:
```typescript
export * from "./create-db-conn";
```

**Step 5: Delete old file**

Delete: `packages/orm-node/src/db-conn-factory.ts`

**Step 6: Verify no typecheck errors**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/orm-node/src/create-db-conn.ts packages/orm-node/src/node-db-context-executor.ts packages/orm-node/src/index.ts
git rm packages/orm-node/src/db-conn-factory.ts
git commit -m "refactor(orm-node): convert DbConnFactory to createDbConn function"
```

---

## Task 2: Update orm-service.ts to use createDbConn

**Files:**
- Modify: `packages/service-server/src/services/orm-service.ts:1,92`

**Step 1: Update import**

Replace line 1:
```typescript
import { DbConnFactory, type DbConnConfig, type DbConn } from "@simplysm/orm-node";
```

With:
```typescript
import { createDbConn, type DbConnConfig, type DbConn } from "@simplysm/orm-node";
```

**Step 2: Update usage**

Replace line 92:
```typescript
const dbConn = await DbConnFactory.create(config);
```

With:
```typescript
const dbConn = await createDbConn(config);
```

**Step 3: Verify no typecheck errors**

Run: `pnpm typecheck packages/service-server`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/service-server/src/services/orm-service.ts
git commit -m "refactor(service-server): use createDbConn instead of DbConnFactory.create"
```

---

## Task 3: Convert SdOrm to createOrm

**Files:**
- Create: `packages/orm-node/src/create-orm.ts`
- Delete: `packages/orm-node/src/sd-orm.ts`
- Modify: `packages/orm-node/src/index.ts:13`

**Step 1: Create interface and factory function**

Create `packages/orm-node/src/create-orm.ts`:

```typescript
import { createDbContext, type DbContextDef, type DbContextInstance, type IsolationLevel } from "@simplysm/orm-common";
import type { DbConnConfig } from "./types/db-conn";
import { NodeDbContextExecutor } from "./node-db-context-executor";

/**
 * Orm 옵션
 *
 * DbConnConfig보다 우선 적용되는 DbContext 옵션
 */
export interface OrmOptions {
  /**
   * 데이터베이스 이름 (DbConnConfig의 database 대신 사용)
   */
  database?: string;

  /**
   * 스키마 이름 (MSSQL: dbo, PostgreSQL: public)
   */
  schema?: string;
}

/**
 * Orm 인스턴스 타입
 *
 * createOrm에서 반환되는 객체의 타입
 */
export interface Orm<TDef extends DbContextDef<any, any, any>> {
  readonly dbContextDef: TDef;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;

  /**
   * 트랜잭션 내에서 콜백 실행
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @param isolationLevel - 트랜잭션 격리 수준
   * @returns 콜백 결과
   */
  connect<R>(
    callback: (conn: DbContextInstance<TDef>) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R>;

  /**
   * 트랜잭션 없이 콜백 실행
   *
   * @param callback - DB 연결 후 실행할 콜백
   * @returns 콜백 결과
   */
  connectWithoutTransaction<R>(callback: (conn: DbContextInstance<TDef>) => Promise<R>): Promise<R>;
}

/**
 * Node.js ORM 팩토리 함수
 *
 * DbContext와 DB 연결을 관리하는 인스턴스를 생성합니다.
 * DbContext 정의와 연결 설정을 받아 트랜잭션을 관리합니다.
 *
 * @example
 * ```typescript
 * const MyDb = defineDbContext({
 *   user: (db) => queryable(db, User),
 * });
 *
 * const orm = createOrm(MyDb, {
 *   dialect: "mysql",
 *   host: "localhost",
 *   port: 3306,
 *   username: "root",
 *   password: "password",
 *   database: "mydb",
 * });
 *
 * // 트랜잭션 내에서 실행
 * await orm.connect(async (db) => {
 *   const users = await db.user().result();
 *   return users;
 * });
 *
 * // 트랜잭션 없이 실행
 * await orm.connectWithoutTransaction(async (db) => {
 *   const users = await db.user().result();
 *   return users;
 * });
 * ```
 */
export function createOrm<TDef extends DbContextDef<any, any, any>>(
  dbContextDef: TDef,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<TDef> {
  function _createDbContext(): DbContextInstance<TDef> {
    // database는 options에서 우선, 없으면 config에서
    const database = options?.database ?? ("database" in config ? config.database : undefined);
    if (database == null || database === "") {
      throw new Error("database is required");
    }

    // schema는 options에서 우선, 없으면 config에서
    const schema = options?.schema ?? ("schema" in config ? config.schema : undefined);

    return createDbContext(dbContextDef, new NodeDbContextExecutor(config), {
      database,
      schema,
    });
  }

  return {
    dbContextDef,
    config,
    options,
    async connect(callback, isolationLevel?) {
      const db = _createDbContext();
      return db.connect(async () => callback(db), isolationLevel);
    },
    async connectWithoutTransaction(callback) {
      const db = _createDbContext();
      return db.connectWithoutTransaction(async () => callback(db));
    },
  };
}
```

**Step 2: Update index.ts export**

Replace line 13:
```typescript
export * from "./sd-orm";
```

With:
```typescript
export * from "./create-orm";
```

**Step 3: Delete old file**

Delete: `packages/orm-node/src/sd-orm.ts`

**Step 4: Verify no typecheck errors**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/orm-node/src/create-orm.ts packages/orm-node/src/index.ts
git rm packages/orm-node/src/sd-orm.ts
git commit -m "refactor(orm-node): convert SdOrm class to createOrm factory function"
```

---

## Task 4: Update README.md examples

**Files:**
- Modify: `packages/orm-node/README.md` (update all SdOrm examples to createOrm)

**Step 1: Find all SdOrm usages in README**

Run: `grep -n "SdOrm\|DbConnFactory" packages/orm-node/README.md`
Expected: Multiple matches

**Step 2: Update all examples**

Replace all instances of:
- `new SdOrm(` → `createOrm(`
- `DbConnFactory.create(` → `createDbConn(`
- Import lines: `import { SdOrm, DbConnFactory }` → `import { createOrm, createDbConn }`
- Import lines: `type SdOrmOptions` → `type OrmOptions` (if used)

**Step 3: Verify README renders correctly**

Visually inspect the updated markdown

**Step 4: Commit**

```bash
git add packages/orm-node/README.md
git commit -m "docs(orm-node): update README examples for functional API"
```

---

## Task 5: Run full test suite to verify no regressions

**Files:**
- Test: All orm-node and integration tests

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: Run linter**

Run: `pnpm lint`
Expected: PASS

**Step 3: Run integration tests (requires Docker DB)**

Run: `pnpm vitest tests/orm --project=orm --run`
Expected: PASS (or SKIP if Docker not available)

**Step 4: If all pass, done!**

All tasks complete. Proceed to merge.

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `create-db-conn.ts` | NEW (replaces db-conn-factory.ts) | Public API |
| `db-conn-factory.ts` | DELETED | Breaking change |
| `create-orm.ts` | NEW (replaces sd-orm.ts) | Public API |
| `sd-orm.ts` | DELETED | Breaking change |
| `node-db-context-executor.ts` | Import updated | Internal |
| `orm-service.ts` | Import + usage updated | Internal (service-server) |
| `index.ts` (orm-node) | Export updated | Public API |
| `README.md` (orm-node) | Examples updated | Documentation |

**Type Compatibility:** Both APIs remain fully type-safe. Return types unchanged (`Promise<DbConn>` and `Orm<TDef>`).

**Migration Path for Users:** Single find-and-replace patterns needed. No behavioral changes.
