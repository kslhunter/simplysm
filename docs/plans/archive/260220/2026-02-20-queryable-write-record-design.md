# QueryableWriteRecord Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Allow update/upsert callbacks to accept plain values without `expr.val()` wrapping.

**Architecture:** Add `QueryableWriteRecord<TData>` type that maps fields to `ExprInput<T>` (accepts both `ExprUnit<T>` and plain `T`). Change update/upsert callback return types. Fix `_buildSelectDef` to handle plain values via `toExpr()`.

**Tech Stack:** TypeScript type system, orm-common query builder

---

### Task 1: Add `QueryableWriteRecord` type and update method signatures

**Files:**
- Modify: `packages/orm-common/src/exec/queryable.ts`

**Step 1: Add `QueryableWriteRecord` type after `QueryableRecord` (line ~1867)**

```typescript
export type QueryableWriteRecord<TData> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprInput<TData[K]>
    : never;
};
```

This is a flat record type (no nested objects/arrays) since update/upsert only operate on flat column sets.

**Step 2: Add `ExprInput` import**

Add `ExprInput` to the existing import from `"../expr/expr-unit"` at line 22:

```typescript
import type { WhereExprUnit, ExprInput } from "../expr/expr-unit";
```

**Step 3: Change `update()` overload signatures (lines 1478-1486)**

Replace all three `update` signatures — change callback return type from `QueryableRecord<TFrom["$inferUpdate"]>` to `QueryableWriteRecord<TFrom["$inferUpdate"]>`:

```typescript
async update(
  recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
): Promise<void>;
async update<K extends keyof TFrom["$columns"] & string>(
  recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  outputColumns: K[],
): Promise<Pick<TFrom["$columns"], K>[]>;
async update<K extends keyof TFrom["$columns"] & string>(
  recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  outputColumns?: K[],
): Promise<Pick<TFrom["$columns"], K>[] | void> {
```

**Step 4: Change `getUpdateQueryDef` parameter type (line 1535-1536)**

```typescript
getUpdateQueryDef(
  recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
): UpdateQueryDef {
```

**Step 5: Change `upsert()` overload signatures (lines 1616-1644)**

Replace all callback return types to use `QueryableWriteRecord`:

```typescript
async upsert(
  updateFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
): Promise<void>;
async upsert<K extends keyof TFrom["$inferColumns"] & string>(
  insertFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferInsert"]>,
  outputColumns?: K[],
): Promise<Pick<TFrom["$inferColumns"], K>[]>;
async upsert<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(
  updateFwd: (cols: QueryableRecord<TData>) => U,
  insertFwd: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
): Promise<void>;
async upsert<
  U extends QueryableWriteRecord<TFrom["$inferUpdate"]>,
  K extends keyof TFrom["$inferColumns"] & string,
>(
  updateFwd: (cols: QueryableRecord<TData>) => U,
  insertFwd: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
  outputColumns?: K[],
): Promise<Pick<TFrom["$inferColumns"], K>[]>;
async upsert<
  U extends QueryableWriteRecord<TFrom["$inferUpdate"]>,
  K extends keyof TFrom["$inferColumns"] & string,
>(
  updateFwdOrInsertFwd:
    | ((cols: QueryableRecord<TData>) => U)
    | ((cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferInsert"]>),
  insertFwdOrOutputColumns?: ((updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>) | K[],
  outputColumns?: K[],
): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
```

**Step 6: Change `getUpsertQueryDef` parameter types (line 1664-1666)**

```typescript
getUpsertQueryDef<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(
  updateRecordFwd: (cols: QueryableRecord<TData>) => U,
  insertRecordFwd: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
  outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
): UpsertQueryDef {
```

**Step 7: Fix `_buildSelectDef` to handle plain values (line 1178-1196)**

The `_buildSelectDef` method (used by `getUpdateQueryDef`) only handles `ExprUnit` instances currently. Add a fallback for plain values:

```typescript
private _buildSelectDef(columns: QueryableRecord<any> | QueryableWriteRecord<any>, prefix: string): Record<string, Expr> {
  const result: Record<string, Expr> = {};

  for (const [key, val] of Object.entries(columns)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (val instanceof ExprUnit) {
      result[fullKey] = val.expr;
    } else if (Array.isArray(val)) {
      if (val.length > 0) {
        Object.assign(result, this._buildSelectDef(val[0], fullKey));
      }
    } else if (typeof val === "object" && val != null) {
      Object.assign(result, this._buildSelectDef(val, fullKey));
    } else {
      // Plain value (string, number, boolean, etc.) — convert to Expr
      result[fullKey] = expr.toExpr(val);
    }
  }

  return result;
}
```

**Step 8: Run typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS (all existing tests should still compile since `ExprUnit<T>` is assignable to `ExprInput<T>`)

### Task 2: Add tests for plain value usage in update/upsert

**Files:**
- Modify: `packages/orm-common/tests/dml/update.spec.ts`
- Modify: `packages/orm-common/tests/dml/upsert.spec.ts`
- Modify: `packages/orm-common/tests/dml/update.expected.ts`
- Modify: `packages/orm-common/tests/dml/upsert.expected.ts`

**Step 1: Add plain value update test to `update.spec.ts`**

Add after the "여러 컬럼 UPDATE" describe block (after line 78):

```typescript
describe("일반 값으로 UPDATE (expr.val 없이)", () => {
  const db = createTestDb();

  const def = db
    .employee()
    .where((e) => [expr.eq(e.id, 1)])
    .getUpdateQueryDef(() => ({
      name: "새이름",
      departmentId: 2,
    }));

  it("QueryDef 검증", () => {
    expect(def).toEqual({
      type: "update",
      table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
      as: "T1",
      record: {
        name: { type: "value", value: "새이름" },
        departmentId: { type: "value", value: 2 },
      },
      where: [
        {
          type: "eq",
          source: { type: "column", path: ["T1", "id"] },
          target: { type: "value", value: 1 },
        },
      ],
    });
  });

  it.each(dialects)("[%s] SQL 검증", (dialect) => {
    const builder = createQueryBuilder(dialect);
    expect(builder.build(def)).toMatchSql(expected.updatePlainValues[dialect]);
  });
});

describe("일반 값과 expr 혼합 UPDATE", () => {
  const db = createTestDb();

  const def = db
    .employee()
    .where((e) => [expr.eq(e.id, 1)])
    .getUpdateQueryDef((e) => ({
      name: "새이름",
      managerId: expr.raw("number")`${e.managerId} + 1`,
    }));

  it("QueryDef 검증", () => {
    expect(def).toEqual({
      type: "update",
      table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
      as: "T1",
      record: {
        name: { type: "value", value: "새이름" },
        managerId: {
          type: "raw",
          sql: "$1 + 1",
          params: [{ type: "column", path: ["T1", "managerId"] }],
        },
      },
      where: [
        {
          type: "eq",
          source: { type: "column", path: ["T1", "id"] },
          target: { type: "value", value: 1 },
        },
      ],
    });
  });

  it.each(dialects)("[%s] SQL 검증", (dialect) => {
    const builder = createQueryBuilder(dialect);
    expect(builder.build(def)).toMatchSql(expected.updateMixed[dialect]);
  });
});
```

**Step 2: Add expected SQL for plain value update tests to `update.expected.ts`**

Add the following entries. `updatePlainValues` should produce the same SQL as `updateMultiCol` since the QueryDef is identical. `updateMixed` should produce the same SQL as `updateWithRef`.

```typescript
export const updatePlainValues: SqlExpected = {
  mysql: { sql: "UPDATE ... SET ... WHERE ..." },  // same as updateMultiCol
  mssql: { sql: "UPDATE ... SET ... WHERE ..." },
  postgresql: { sql: "UPDATE ... SET ... WHERE ..." },
};

export const updateMixed: SqlExpected = {
  mysql: { sql: "UPDATE ... SET ... WHERE ..." },  // same as updateWithRef
  mssql: { sql: "UPDATE ... SET ... WHERE ..." },
  postgresql: { sql: "UPDATE ... SET ... WHERE ..." },
};
```

> **Note:** Read `update.expected.ts` to get exact SQL format, then duplicate from `updateMultiCol` and `updateWithRef` respectively.

**Step 3: Add plain value upsert test to `upsert.spec.ts`**

Add after the last describe block:

```typescript
describe("일반 값으로 UPSERT (expr.val 없이)", () => {
  const db = createTestDb();
  const def = db
    .employee()
    .where((e) => [expr.eq(e.id, 1)])
    .getUpsertQueryDef(
      () => ({ name: "새이름" }),
      (upd) => ({ name: upd.name, departmentId: 1 }),
    );

  it("QueryDef 검증", () => {
    expect(def).toEqual({
      type: "upsert",
      table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
      existsSelectQuery: {
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      },
      updateRecord: {
        name: { type: "value", value: "새이름" },
      },
      insertRecord: {
        name: { type: "value", value: "새이름" },
        departmentId: { type: "value", value: 1 },
      },
    });
  });

  it.each(dialects)("[%s] SQL 검증", (dialect) => {
    const builder = createQueryBuilder(dialect);
    expect(builder.build(def)).toMatchSql(expected.upsertPlainValues[dialect]);
  });
});
```

**Step 4: Add expected SQL for plain value upsert test to `upsert.expected.ts`**

> Same SQL as `upsertSimple` since the QueryDef structure is identical.

**Step 5: Run tests**

Run: `pnpm vitest packages/orm-common/tests/dml/update.spec.ts packages/orm-common/tests/dml/upsert.spec.ts --project=node --run`
Expected: PASS

**Step 6: Run full typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

### Task 3: Update documentation

**Files:**
- Modify: `packages/orm-common/docs/queries.md`
- Modify: `packages/orm-common/README.md`

**Step 1: Update UPDATE examples in `queries.md`**

In the UPDATE section, update examples to show plain value usage as the primary pattern and `expr.val()` as optional:

```markdown
## UPDATE

```typescript
// Plain values (recommended)
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update(() => ({
    name: "새이름",
    updatedAt: DateTime.now(),
  }));

// Column reference (use ExprUnit from callback parameter)
await db.product()
  .update((p) => ({
    price: expr.mul(p.price, 1.1),
  }));

// Mixed: plain values + expressions
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update((u) => ({
    name: "새이름",
    loginCount: expr.raw("number")`${u.loginCount} + 1`,
  }));
```

**Step 2: Update UPSERT examples in `queries.md`**

```markdown
## UPSERT

```typescript
// Same data for UPDATE/INSERT
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(() => ({
    name: "Test",
    email: "test@test.com",
  }));

// Different data for UPDATE/INSERT
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(
    () => ({ loginCount: 1 }),
    (update) => ({ ...update, email: "test@test.com" }),
  );
```

**Step 3: Update README.md type reference**

In the "Schema Builder Types" section, add `QueryableWriteRecord`:

```markdown
| `QueryableWriteRecord<TData>` | Write-side record type for update/upsert callbacks (accepts `ExprInput<T>` — both `ExprUnit<T>` and plain values) |
```

Also update the Quick Start UPDATE example to use plain values.

**Step 4: Commit**

```bash
git add packages/orm-common/src/exec/queryable.ts packages/orm-common/tests/dml/ packages/orm-common/docs/queries.md packages/orm-common/README.md
git commit -m "feat(orm-common): allow plain values in update/upsert callbacks via QueryableWriteRecord"
```
