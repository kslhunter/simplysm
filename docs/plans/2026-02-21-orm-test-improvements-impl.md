# ORM Integration Test & Implementation Improvements - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Improve ORM test quality, coverage, security hardening, and API/DX across orm-common, orm-node, and tests/orm.

**Architecture:** Change ORM library APIs first (breaking changes allowed), then fix security issues, then refactor tests to use improved APIs, then expand coverage.

**Tech Stack:** TypeScript, Vitest, Docker (MySQL, MSSQL, PostgreSQL), @simplysm/orm-common, @simplysm/orm-node

---

### Task 1: Rename `isOnTransaction` → `isInTransaction`

Global rename across the ORM library. This is a simple find-and-replace.

**Files:**
- Modify: `packages/orm-node/src/types/db-conn.ts:55`
- Modify: `packages/orm-node/src/connections/mysql-db-conn.ts` (lines 40, 112, 118, 124, 302)
- Modify: `packages/orm-node/src/connections/mssql-db-conn.ts` (lines 39, 100, 146, 170, 189, 376)
- Modify: `packages/orm-node/src/connections/postgresql-db-conn.ts` (lines 38, 104, 110, 116, 248)
- Modify: `packages/orm-node/src/pooled-db-conn.ts` (lines 37, 38, 39, 75)
- Modify: `packages/orm-node/README.md` (lines 228, 373)
- Modify: `tests/orm/src/db-conn/mysql-db-conn.spec.ts` (12 occurrences)
- Modify: `tests/orm/src/db-conn/mssql-db-conn.spec.ts` (12 occurrences)
- Modify: `tests/orm/src/db-conn/postgresql-db-conn.spec.ts` (11 occurrences)

**Step 1: Replace all occurrences**

Use `replace_all` on each file to replace `isOnTransaction` with `isInTransaction`.

**Step 2: Typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/orm-node tests/orm
git commit -m "refactor(orm-node): rename isOnTransaction to isInTransaction"
```

---

### Task 2: Change `execute()` / `executeParametrized()` return type

Change `unknown[][]` → `Record<string, unknown>[][]` in DbConn interface and all implementations.

**Files:**
- Modify: `packages/orm-node/src/types/db-conn.ts:90,99` — interface signatures
- Modify: `packages/orm-node/src/connections/mysql-db-conn.ts` — method signatures
- Modify: `packages/orm-node/src/connections/mssql-db-conn.ts` — method signatures
- Modify: `packages/orm-node/src/connections/postgresql-db-conn.ts` — method signatures
- Modify: `packages/orm-node/src/pooled-db-conn.ts` — delegating method signatures
- Modify: `packages/orm-node/README.md` — update return type docs

**Step 1: Update interface in db-conn.ts**

Change line 90:
```typescript
// Before
execute(queries: string[]): Promise<unknown[][]>;
// After
execute(queries: string[]): Promise<Record<string, unknown>[][]>;
```

Change line 99:
```typescript
// Before
executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]>;
// After
executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
```

**Step 2: Update all implementations**

In each connection file and pooled-db-conn.ts, update the method return type to match the interface:
```typescript
async execute(queries: string[]): Promise<Record<string, unknown>[][]> {
```

**Step 3: Remove casts in tests**

In all `tests/orm/src/db-conn/*.spec.ts` files, remove all `as Record<string, unknown>` casts since the return type now matches.

Before:
```typescript
expect((results[0][0] as Record<string, unknown>)["bool_val"]).toBe(1);
```
After:
```typescript
expect(results[0][0]["bool_val"]).toBe(1);
```

**Step 4: Typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/orm-node tests/orm
git commit -m "refactor(orm-node): change execute() return type to Record<string, unknown>[][]"
```

---

### Task 3: Symmetrize `PostgresqlDbConn` constructor

Change from `(pg, pgCopyFrom, config)` to `(pg, pgCopyStreams, config)` to match MySQL/MSSQL pattern.

**Files:**
- Modify: `packages/orm-node/src/connections/postgresql-db-conn.ts:40-46` — constructor
- Modify: `packages/orm-node/src/connections/postgresql-db-conn.ts:161` — usage of `_pgCopyFrom`
- Modify: `packages/orm-node/src/create-db-conn.ts:100-103` — factory
- Modify: `tests/orm/src/db-conn/postgresql-db-conn.spec.ts` — test setup
- Modify: `tests/orm/src/db-context/postgresql-db-context.spec.ts` — test setup (if uses PostgresqlDbConn directly)
- Modify: `packages/orm-node/README.md` — update constructor docs

**Step 1: Change constructor**

In `postgresql-db-conn.ts`, change:
```typescript
// Before (lines 40-46)
constructor(
  private readonly _pg: typeof import("pg"),
  private readonly _pgCopyFrom: (queryText: string) => CopyStreamQuery,
  readonly config: PostgresqlDbConnConfig,
) {
  super();
}

// After
constructor(
  private readonly _pg: typeof import("pg"),
  private readonly _pgCopyStreams: typeof import("pg-copy-streams"),
  readonly config: PostgresqlDbConnConfig,
) {
  super();
}
```

Change line 161 usage:
```typescript
// Before
const stream = this._client!.query(this._pgCopyFrom(copyQuery));
// After
const stream = this._client!.query(this._pgCopyStreams.from(copyQuery));
```

Remove the `CopyStreamQuery` type import if no longer needed (check).

**Step 2: Update factory in create-db-conn.ts**

Change lines 100-103:
```typescript
// Before
const pg = await ensureModule("pg");
const pgCopyStreams = await ensureModule("pgCopyStreams");
return new PostgresqlDbConn(pg, pgCopyStreams.from, config);

// After
const pg = await ensureModule("pg");
const pgCopyStreams = await ensureModule("pgCopyStreams");
return new PostgresqlDbConn(pg, pgCopyStreams, config);
```

**Step 3: Update tests**

In `postgresql-db-conn.spec.ts`, change the setup:
```typescript
// Before
let pgCopyFrom: ...;
beforeAll(async () => {
  pg = await import("pg");
  const pgCopyStreams = await import("pg-copy-streams");
  pgCopyFrom = pgCopyStreams.from;
  conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
});

// After
let pgCopyStreams: typeof import("pg-copy-streams");
beforeAll(async () => {
  pg = await import("pg");
  pgCopyStreams = await import("pg-copy-streams");
  conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
});
```

Apply same pattern to all beforeAll blocks that create PostgresqlDbConn.

**Step 4: Typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/orm-node tests/orm
git commit -m "refactor(orm-node): accept pg-copy-streams module in PostgresqlDbConn constructor"
```

---

### Task 4: Fix `wrap()` identifier escaping in all 3 expr renderers

**Files:**
- Modify: `packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts:77-79`
- Modify: `packages/orm-common/src/query-builder/mssql/mssql-expr-renderer.ts:77-79`
- Modify: `packages/orm-common/src/query-builder/postgresql/postgresql-expr-renderer.ts:77-79`

**Step 1: Fix MySQL wrap()**

```typescript
// Before (line 77-79)
wrap(name: string): string {
  return `\`${name}\``;
}

// After
wrap(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``;
}
```

**Step 2: Fix MSSQL wrap()**

```typescript
// Before (line 77-79)
wrap(name: string): string {
  return `[${name}]`;
}

// After
wrap(name: string): string {
  return `[${name.replace(/]/g, "]]")}]`;
}
```

**Step 3: Fix PostgreSQL wrap()**

```typescript
// Before (line 77-79)
wrap(name: string): string {
  return `"${name}"`;
}

// After
wrap(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
```

**Step 4: Typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/orm-common
git commit -m "fix(orm-common): escape delimiter characters in wrap() identifiers"
```

---

### Task 5: Fix MySQL BulkInsert NULL byte escaping

**Files:**
- Modify: `packages/orm-node/src/connections/mysql-db-conn.ts:260-270`

**Step 1: Add \0 escaping**

```typescript
// Before (lines 265-269)
return str
  .replace(/\\/g, "\\\\")
  .replace(/\t/g, "\\t")
  .replace(/\n/g, "\\n")
  .replace(/\r/g, "\\r");

// After
return str
  .replace(/\\/g, "\\\\")
  .replace(/\0/g, "\\0")
  .replace(/\t/g, "\\t")
  .replace(/\n/g, "\\n")
  .replace(/\r/g, "\\r");
```

**Step 2: Typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/orm-node
git commit -m "fix(orm-node): escape NULL bytes in MySQL bulkInsert"
```

---

### Task 6: Fix PostgreSQL BulkInsert `\N` handling

**Files:**
- Modify: `packages/orm-node/src/connections/postgresql-db-conn.ts:208-217`

**Step 1: Add backslash to quoting condition**

```typescript
// Before (lines 213-216)
if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
  return '"' + str.replace(/"/g, '""') + '"';
}
return str;

// After
if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r") || str.includes("\\")) {
  return '"' + str.replace(/"/g, '""') + '"';
}
return str;
```

**Step 2: Typecheck**

Run: `pnpm typecheck packages/orm-node`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/orm-node
git commit -m "fix(orm-node): quote strings with backslashes in PostgreSQL bulkInsert"
```

---

### Task 7: Fix test infrastructure — vitest.setup.ts

**Files:**
- Modify: `tests/orm/vitest.setup.ts`

**Step 1: Extract composePath to module scope and add MSSQL error handling**

```typescript
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const composePath = path.resolve(__dirname, "docker-compose.test.yml");

export async function setup() {
  console.log("[orm] Starting Docker containers...");

  try {
    execSync(`docker compose -f "${composePath}" up -d --wait`, {
      stdio: "inherit",
    });

    console.log("[orm] Docker containers started, creating MSSQL database...");

    // MSSQL TestDb 생성 (MySQL, PostgreSQL은 docker compose에서 자동 생성)
    let mssqlReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        execSync(
          `docker compose -f "${composePath}" exec -T mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestDb') CREATE DATABASE TestDb"`,
          { stdio: "pipe" },
        );
        console.log("[orm] MSSQL TestDb created.");
        mssqlReady = true;
        break;
      } catch {
        console.log(`[orm] MSSQL not ready, retrying... (${i + 1}/10)`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!mssqlReady) {
      throw new Error("[orm] Failed to create MSSQL TestDb after 10 retries");
    }

    console.log("[orm] All databases ready.");
  } catch (err) {
    console.error("[orm] Failed to start Docker containers:", err);
    throw err;
  }
}

export function teardown() {
  console.log("[orm] Stopping Docker containers...");

  try {
    execSync(`docker compose -f "${composePath}" down`, {
      stdio: "inherit",
    });
    console.log("[orm] Docker containers stopped.");
  } catch (err) {
    console.error("[orm] Failed to stop Docker containers:", err);
  }
}
```

**Step 2: Commit**

```bash
git add tests/orm/vitest.setup.ts
git commit -m "fix(orm-test): add MSSQL setup failure handling and dedup composePath"
```

---

### Task 8: Extract shared test fixtures

**Files:**
- Create: `tests/orm/src/test-fixtures.ts`
- Modify: `tests/orm/src/db-conn/mysql-db-conn.spec.ts`
- Modify: `tests/orm/src/db-conn/mssql-db-conn.spec.ts`
- Modify: `tests/orm/src/db-conn/postgresql-db-conn.spec.ts`

**Step 1: Read all 3 spec files to catalog exact columnMetas definitions**

Read the full contents of all 3 db-conn spec files to identify every `columnMetas` and `records` definition.

**Step 2: Create test-fixtures.ts**

Extract all shared data definitions. Include:
- `bulkColumnMetas` + `bulkRecords` (basic bulk insert)
- `typeColumnMetas` + `typeRecords` (diverse type test)
- `nullableColumnMetas` + `nullableRecords` (null handling)
- `uuidBinaryColumnMetas` (UUID + binary types)

Use exact values from the existing specs (they are identical across all 3 files).

**Step 3: Update all 3 spec files to import from test-fixtures.ts**

Replace inline `columnMetas` and `records` definitions with imports. Keep dialect-specific differences (SQL DDL, result assertions) in each file.

**Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (tests/orm is covered by the orm vitest project)

**Step 5: Commit**

```bash
git add tests/orm
git commit -m "refactor(orm-test): extract shared columnMetas and records to test-fixtures"
```

---

### Task 9: Remove test order dependency in connection tests

**Files:**
- Modify: `tests/orm/src/db-conn/mysql-db-conn.spec.ts` (lines 22-36)
- Modify: `tests/orm/src/db-conn/mssql-db-conn.spec.ts` (lines 22-36)
- Modify: `tests/orm/src/db-conn/postgresql-db-conn.spec.ts` (lines 25-38)

**Step 1: Make each connection test independent**

For all 3 files, replace the "연결" describe block. Each `it` creates its own connection:

```typescript
describe("연결", () => {
  it("연결 성공", async () => {
    const testConn = new XxxDbConn(driver, config);
    await testConn.connect();
    expect(testConn.isConnected).toBe(true);
    await testConn.close();
  });

  it("중복 연결 시 에러", async () => {
    const testConn = new XxxDbConn(driver, config);
    await testConn.connect();
    try {
      await expect(testConn.connect()).rejects.toThrow(DB_CONN_ERRORS.ALREADY_CONNECTED);
    } finally {
      await testConn.close();
    }
  });

  it("연결 종료", async () => {
    const testConn = new XxxDbConn(driver, config);
    await testConn.connect();
    await testConn.close();
    expect(testConn.isConnected).toBe(false);
  });
});
```

Note: Use `DB_CONN_ERRORS.ALREADY_CONNECTED` constant (Task 10 handles the remaining error message constants, but this one is included here since we're touching this block).

For PostgreSQL, the `XxxDbConn` constructor takes `(pg, pgCopyStreams, config)` (after Task 3).

**Step 2: Add DB_CONN_ERRORS import to each spec file**

```typescript
import { DB_CONN_ERRORS } from "@simplysm/orm-node";
```

**Step 3: Commit**

```bash
git add tests/orm
git commit -m "test(orm-test): make connection tests independent of execution order"
```

---

### Task 10: Replace hardcoded error strings with DB_CONN_ERRORS constants

**Files:**
- Modify: `tests/orm/src/db-conn/mysql-db-conn.spec.ts`
- Modify: `tests/orm/src/db-conn/mssql-db-conn.spec.ts`
- Modify: `tests/orm/src/db-conn/postgresql-db-conn.spec.ts`

**Step 1: Replace remaining hardcoded error strings**

After Task 9, the connection tests already use `DB_CONN_ERRORS.ALREADY_CONNECTED`. Now replace the remaining NOT_CONNECTED error strings (in "연결 오류 처리" describe blocks).

Search for Korean error strings like `"'Connection'이 연결되어있지 않습니다"` and replace with `DB_CONN_ERRORS.NOT_CONNECTED`.

**Step 2: Commit**

```bash
git add tests/orm
git commit -m "refactor(orm-test): use DB_CONN_ERRORS constants instead of hardcoded strings"
```

---

### Task 11: Apply `it.each` to escape-integration.spec.ts

**Files:**
- Modify: `tests/orm/src/escape-integration.spec.ts`

**Step 1: Replace 4 test cases with parameterized test**

```typescript
it.each([
  { id: 1, value: "O'Reilly", desc: "따옴표가 포함된 값" },
  { id: 2, value: "C:\\path\\to\\file", desc: "백슬래시가 포함된 값" },
  { id: 3, value: "line1\nline2\ttab\rreturn", desc: "제어 문자가 포함된 값" },
  { id: 4, value: "'; DROP TABLE users; --", desc: "SQL 인젝션 시도" },
])("$desc을 저장하고 조회할 수 있어야 함", async ({ id, value }) => {
  await db.connectWithoutTransaction(async () => {
    await db.trans(async () => {
      await db.escapeTest().insert([{ id, value }]);
    });

    const result = await db
      .escapeTest()
      .where((item) => [expr.eq(item.id, id)])
      .result();
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(value);
  });
});
```

**Step 2: Commit**

```bash
git add tests/orm
git commit -m "refactor(orm-test): use it.each for escape integration tests"
```

---

### Task 12: Expand escape tests to all 3 dialects

**Files:**
- Delete: `tests/orm/src/escape-integration.spec.ts`
- Create: `tests/orm/src/escape/mysql-escape.spec.ts`
- Create: `tests/orm/src/escape/mssql-escape.spec.ts`
- Create: `tests/orm/src/escape/postgresql-escape.spec.ts`

**Step 1: Create mysql-escape.spec.ts**

Move the existing escape test logic (with `it.each` from Task 11) into `escape/mysql-escape.spec.ts`. Add new test cases:
- NULL byte: `{ id: 5, value: "null\0byte", desc: "NULL 바이트" }`
- Unicode emoji: `{ id: 6, value: "emoji😀test", desc: "유니코드 이모지" }`

**Step 2: Create mssql-escape.spec.ts**

Same structure but using MSSQL:
- Import `MssqlDbConn` and `mssqlConfig`
- Table DDL uses MSSQL syntax: `IF OBJECT_ID(...) IS NOT NULL DROP TABLE`, `NVARCHAR(200)`, `.schema("dbo")`
- Same `it.each` test cases

**Step 3: Create postgresql-escape.spec.ts**

Same structure but using PostgreSQL:
- Import `PostgresqlDbConn` and `postgresqlConfig`
- Table DDL uses PostgreSQL syntax: double-quoted identifiers, `VARCHAR(200)`, `.schema("public")`
- Add PostgreSQL-specific test: `{ id: 7, value: "\\N", desc: "PostgreSQL NULL 마커 리터럴" }`
- Same `it.each` test cases

**Step 4: Delete old file**

Remove `tests/orm/src/escape-integration.spec.ts`.

**Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add tests/orm
git commit -m "test(orm-test): expand escape tests to all 3 dialects with new edge cases"
```

---

### Task 13: Add MSSQL BulkInsert special characters test

**Files:**
- Modify: `tests/orm/src/db-conn/mssql-db-conn.spec.ts`

**Step 1: Add special characters test**

In the `bulkInsert` describe block (after the basic test and empty-array test), add:

```typescript
it("특수 문자 포함 데이터 INSERT", async () => {
  await conn.execute([
    `IF OBJECT_ID('TestDb.dbo.BulkSpecialTable') IS NOT NULL DROP TABLE [TestDb].[dbo].[BulkSpecialTable]`,
    `CREATE TABLE [TestDb].[dbo].[BulkSpecialTable] (
      id INT,
      name NVARCHAR(200)
    )`,
  ]);

  const columnMetas: Record<string, ColumnMeta> = {
    id: { type: "number", dataType: { type: "int" } },
    name: { type: "string", dataType: { type: "varchar", length: 200 } },
  };

  const records = [
    { id: 1, name: "tab\there" },
    { id: 2, name: "new\nline" },
    { id: 3, name: 'quote"here' },
    { id: 4, name: "back\\slash" },
  ];

  await conn.bulkInsert("[TestDb].[dbo].[BulkSpecialTable]", columnMetas, records);

  const results = await conn.execute([`SELECT * FROM [TestDb].[dbo].[BulkSpecialTable] ORDER BY id`]);
  expect(results[0]).toHaveLength(4);
  expect(results[0][0]["name"]).toBe("tab\there");
  expect(results[0][1]["name"]).toBe("new\nline");
  expect(results[0][2]["name"]).toBe('quote"here');
  expect(results[0][3]["name"]).toBe("back\\slash");

  await conn.execute([
    `IF OBJECT_ID('TestDb.dbo.BulkSpecialTable') IS NOT NULL DROP TABLE [TestDb].[dbo].[BulkSpecialTable]`,
  ]);
});
```

**Step 2: Commit**

```bash
git add tests/orm
git commit -m "test(orm-test): add MSSQL bulkInsert special characters test"
```

---

### Task 14: Update README.md for API changes

**Files:**
- Modify: `packages/orm-node/README.md`
- Modify: `packages/orm-common/README.md` (if wrap() is documented)

**Step 1: Update orm-node README**

- Replace all `isOnTransaction` → `isInTransaction`
- Update `execute()` return type: `unknown[][]` → `Record<string, unknown>[][]`
- Update `executeParametrized()` return type
- Update `PostgresqlDbConn` constructor docs to show `pgCopyStreams` module parameter

**Step 2: Commit**

```bash
git add packages/orm-node/README.md packages/orm-common/README.md
git commit -m "docs(orm): update README for API changes"
```
