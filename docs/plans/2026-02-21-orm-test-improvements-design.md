# ORM Integration Test & Implementation Improvements

## Overview

Comprehensive improvements to the ORM integration test suite (`tests/orm`) and underlying ORM implementation. Covers test infrastructure, code quality, coverage expansion, security hardening, and API/DX improvements.

**Breaking changes**: Allowed. All consumers are known.

## Scope

| Category | Priority | Items |
|----------|----------|-------|
| Test Infrastructure | P0 | MSSQL setup error handling, composePath dedup |
| Test Code Quality | P1 | Fixture extraction, test order dependency, it.each, error message constants |
| Test Coverage | P1 | Escape tests for 3 dialects, MSSQL BulkInsert special chars |
| ORM Security | P1 | wrap() escaping, MySQL BulkInsert NULL byte, PostgreSQL BulkInsert \N |
| ORM API/DX | P2 | execute() return type, isOnTransaction rename, PostgresqlDbConn constructor |

---

## 1. Test Infrastructure

### 1-1. MSSQL Setup Error Handling

**File**: `tests/orm/vitest.setup.ts:20-32`

The MSSQL TestDb creation retry loop silently continues when all 10 retries fail. Add success tracking and throw on exhaustion:

```typescript
let mssqlReady = false;
for (let i = 0; i < 10; i++) {
  try {
    execSync(/* ... */);
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
```

### 1-2. composePath Module Constant

Extract duplicate `composePath` computation (lines 10, 44) to module scope:

```typescript
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const composePath = path.resolve(__dirname, "docker-compose.test.yml");
```

---

## 2. Test Code Quality

### 2-1. Fixture Extraction

**New file**: `tests/orm/src/test-fixtures.ts`

Extract repeated `columnMetas` and `records` definitions (21 repetitions across 3 files) into shared fixtures:

```typescript
export const bulkColumnMetas: Record<string, ColumnMeta> = {
  id: { type: "number", dataType: { type: "int" } },
  name: { type: "string", dataType: { type: "varchar", length: 100 } },
  value: { type: "number", dataType: { type: "double" } },
};

export const bulkRecords = [
  { id: 1, name: "bulk1", value: 1.1 },
  { id: 2, name: "bulk2", value: 2.2 },
  { id: 3, name: "bulk3", value: 3.3 },
];

export const typeColumnMetas: Record<string, ColumnMeta> = { ... };
export const nullableColumnMetas: Record<string, ColumnMeta> = { ... };
export const uuidBinaryColumnMetas: Record<string, ColumnMeta> = { ... };
```

### 2-2. Test Order Dependency Removal

**Files**: `db-conn/*.spec.ts`, "connection" describe blocks

Make each test in the "connection" describe block independent by creating its own connection:

```typescript
it("duplicate connection error", async () => {
  const testConn = new MysqlDbConn(mysql2, mysqlConfig);
  await testConn.connect();
  try {
    await expect(testConn.connect()).rejects.toThrow(DB_CONN_ERRORS.ALREADY_CONNECTED);
  } finally {
    await testConn.close();
  }
});
```

### 2-3. escape-integration.spec.ts it.each

Replace 4 repeated test cases with parameterized test:

```typescript
it.each([
  { id: 1, value: "O'Reilly", desc: "single quotes" },
  { id: 2, value: "C:\\path\\to\\file", desc: "backslashes" },
  { id: 3, value: "line1\nline2\ttab\rreturn", desc: "control characters" },
  { id: 4, value: "'; DROP TABLE users; --", desc: "SQL injection" },
])("$desc stored and retrieved correctly", async ({ id, value }) => {
  // common test logic
});
```

### 2-4. Error Message Constants

Replace hardcoded Korean error strings (6 occurrences) with `DB_CONN_ERRORS` constant references:

```typescript
import { DB_CONN_ERRORS } from "@simplysm/orm-node";
await expect(conn.connect()).rejects.toThrow(DB_CONN_ERRORS.ALREADY_CONNECTED);
```

---

## 3. Test Coverage Expansion

### 3-1. Escape Tests for All 3 Dialects

**Structure change**:
```
src/
  escape-integration.spec.ts  -> delete
  escape/
    mysql-escape.spec.ts
    mssql-escape.spec.ts
    postgresql-escape.spec.ts
```

Each file uses `it.each` with dialect-specific setup. Additional test cases beyond existing 4:
- NULL byte (`\0`)
- Unicode emoji (`U+1F600`)
- PostgreSQL-specific: `\N` literal (NULL marker confusion)

### 3-2. MSSQL BulkInsert Special Characters

Add "special character data INSERT" test to `mssql-db-conn.spec.ts`, matching the existing tests in MySQL and PostgreSQL specs.

---

## 4. ORM Security Hardening

### 4-1. wrap() Identifier Escaping

**Files**: All 3 `*-expr-renderer.ts`

Escape delimiter characters in identifier wrapping:

```typescript
// MySQL: backtick
wrap(name: string): string {
  return `\`${name.replace(/`/g, "``")}\``;
}

// MSSQL: bracket
wrap(name: string): string {
  return `[${name.replace(/]/g, "]]")}]`;
}

// PostgreSQL: double quote
wrap(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}
```

### 4-2. MySQL BulkInsert NULL Byte

**File**: `packages/orm-node/src/connections/mysql-db-conn.ts`

Add `\0` escaping to LOAD DATA INFILE string formatting:

```typescript
return str
  .replace(/\\/g, "\\\\")
  .replace(/\0/g, "\\0")     // add
  .replace(/\t/g, "\\t")
  .replace(/\n/g, "\\n")
  .replace(/\r/g, "\\r");
```

### 4-3. PostgreSQL BulkInsert \N Handling

**File**: `packages/orm-node/src/connections/postgresql-db-conn.ts`

Add backslash to quoting condition for COPY CSV format:

```typescript
if (str.includes('"') || str.includes(",") || str.includes("\n")
    || str.includes("\r") || str.includes("\\")) {  // add \\
  return '"' + str.replace(/"/g, '""') + '"';
}
```

---

## 5. ORM API/DX Improvements

### 5-1. execute() Return Type

**File**: `packages/orm-node/src/types/db-conn.ts`

Change `unknown[][]` to `Record<string, unknown>[][]`:

```typescript
execute(queries: string[]): Promise<Record<string, unknown>[][]>;
executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
```

**Impact**: Remove 52 `as Record<string, unknown>` casts from test files.
**Scope**: Interface + 3 implementations + all test files.

### 5-2. isOnTransaction -> isInTransaction

**Files**: DbConn interface + 3 implementations + tests + consumers

Rename property to match English idiom and common ORM conventions:

```typescript
isInTransaction: boolean;  // was: isOnTransaction
```

### 5-3. PostgresqlDbConn Constructor Symmetry

**File**: `packages/orm-node/src/connections/postgresql-db-conn.ts`

Accept full `pg-copy-streams` module instead of extracted `from` function:

```typescript
constructor(
  private readonly _pg: typeof import("pg"),
  private readonly _pgCopyStreams: typeof import("pg-copy-streams"),
  readonly config: PostgresqlDbConnConfig,
)
```

Pattern matches MySQL (`mysql2` module) and MSSQL (`tedious` module).
**Impact**: Update `createDbConn()` factory, tests, and consumers.

---

## Implementation Order

1. **ORM API/DX** (5-1, 5-2, 5-3) — change interfaces first
2. **ORM Security** (4-1, 4-2, 4-3) — fix implementation
3. **Test Infrastructure** (1-1, 1-2) — improve setup
4. **Test Code Quality** (2-1, 2-2, 2-3, 2-4) — refactor tests
5. **Test Coverage** (3-1, 3-2) — add new tests

This order ensures API changes propagate cleanly before test refactoring.
