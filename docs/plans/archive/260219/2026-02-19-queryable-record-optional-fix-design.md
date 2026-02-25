# QueryableRecord Optional Modifier Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Strip optional modifiers from `QueryableRecord` so query column access never has spurious `| undefined`, while preserving optionality for write operations (update/insert).

**Architecture:** Add `-?` to `QueryableRecord`/`NullableQueryableRecord` (already done). Create `QueryableWriteRecord` (without `-?`) for update/insert callback return types. Update method signatures in `update()`/`upsert()`.

**Tech Stack:** TypeScript type system only — no runtime changes.

---

### Task 1: Add `QueryableWriteRecord` type

**Files:**
- Modify: `packages/orm-common/src/exec/queryable.ts:1870` (after `QueryableRecord` closing brace)

**Step 1: Write the type**

Add `QueryableWriteRecord` right after `QueryableRecord` (before `NullableQueryableRecord`). Same conditional logic, but NO `-?`:

```typescript
export type QueryableWriteRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? QueryableWriteRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? NullableQueryableWriteRecord<U>[] | undefined
          : never
        : TData[K] extends DataRecord
          ? QueryableWriteRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? NullableQueryableWriteRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};
```

Also add `NullableQueryableWriteRecord` after `NullableQueryableRecord` — same logic as `NullableQueryableRecord` but referencing `QueryableWriteRecord`/`NullableQueryableWriteRecord` internally:

```typescript
export type NullableQueryableWriteRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K] | undefined>
    : TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? NullableQueryableWriteRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? NullableQueryableWriteRecord<U>[] | undefined
          : never
        : TData[K] extends DataRecord
          ? NullableQueryableWriteRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? NullableQueryableWriteRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};
```

**Step 2: Run typecheck to verify new types compile**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS (new types are unused so far, just need to compile)

---

### Task 2: Update `update()` and `getUpdateQueryDef()` signatures

**Files:**
- Modify: `packages/orm-common/src/exec/queryable.ts:1479,1482,1486,1536`

**Step 1: Replace return types**

Change callback return types from `QueryableRecord<TFrom["$inferUpdate"]>` to `QueryableWriteRecord<TFrom["$inferUpdate"]>` in these lines:

- L1479: `recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>`
- L1482: `recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>`
- L1486: `recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>`
- L1536: `recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>`

Note: The `cols` parameter stays as `QueryableRecord<TData>` (read context — `-?` is correct).

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 3: Run existing update tests**

Run: `pnpm vitest packages/orm-common/tests/dml/update.spec.ts --project=node --run`
Expected: All tests pass (runtime unchanged)

---

### Task 3: Update `upsert()` and `getUpsertQueryDef()` signatures

**Files:**
- Modify: `packages/orm-common/src/exec/queryable.ts:1617,1620,1623-1666`

**Step 1: Replace return types**

Change all callback return types for update/insert records in upsert methods. Replace `QueryableRecord<TFrom["$inferUpdate"]>` with `QueryableWriteRecord<TFrom["$inferUpdate"]>` and `QueryableRecord<TFrom["$inferInsert"]>` with `QueryableWriteRecord<TFrom["$inferInsert"]>`:

```
L1617: ... => QueryableWriteRecord<TFrom["$inferUpdate"]>
L1620: ... => QueryableWriteRecord<TFrom["$inferInsert"]>
L1623: U extends QueryableWriteRecord<TFrom["$inferUpdate"]>
L1624: ... => U
L1625: ... => QueryableWriteRecord<TFrom["$inferInsert"]>
L1628: U extends QueryableWriteRecord<TFrom["$inferUpdate"]>
L1631: ... => U
L1632: ... => QueryableWriteRecord<TFrom["$inferInsert"]>
L1636: U extends QueryableWriteRecord<TFrom["$inferUpdate"]>
L1640: ... => U
L1641: ... => QueryableWriteRecord<TFrom["$inferInsert"]>
L1642: ... => QueryableWriteRecord<TFrom["$inferInsert"]>
L1645: as (cols: QueryableRecord<TData>) => U
L1649: as (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>
L1664: U extends QueryableWriteRecord<TFrom["$inferUpdate"]>
L1665: ... => U
L1666: ... => QueryableWriteRecord<TFrom["$inferInsert"]>
```

Note: `cols` parameters stay as `QueryableRecord<TData>`.

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 3: Run existing upsert tests**

Run: `pnpm vitest packages/orm-common/tests/dml/upsert.spec.ts --project=node --run`
Expected: All tests pass (runtime unchanged)

---

### Task 4: Add type-level test for `QueryableRecord` `-?` behavior

**Files:**
- Modify: `packages/orm-common/tests/types/nullable-queryable-record.spec.ts`

**Step 1: Add test for optional property stripping**

Add a test case that verifies optional properties in source data are always present (non-optional) in `QueryableRecord`:

```typescript
it("QueryableRecord strips optional modifier from source properties", () => {
  type OptionalData = { id?: number; name: string };
  type Result = QueryableRecord<OptionalData>;

  // id was optional in source, but QueryableRecord strips ?
  // so accessing id always gives ExprUnit, never | undefined from optionality
  expectTypeOf<Result["id"]>().toMatchTypeOf<{ $infer: number | undefined }>();
  expectTypeOf<Result["name"]>().toMatchTypeOf<{ $infer: string }>();

  expect(true).toBe(true);
});
```

Add the `QueryableRecord` import alongside existing `NullableQueryableRecord` import at the top.

**Step 2: Run tests**

Run: `pnpm vitest packages/orm-common/tests/types/nullable-queryable-record.spec.ts --project=node --run`
Expected: PASS

---

### Task 5: Full verification

**Step 1: Run full typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 2: Run all orm-common tests**

Run: `pnpm vitest packages/orm-common --project=node --run`
Expected: All tests pass

**Step 3: Run lint**

Run: `pnpm lint packages/orm-common`
Expected: PASS
