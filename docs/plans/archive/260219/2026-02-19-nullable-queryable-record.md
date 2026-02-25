# NullableQueryableRecord — Optional Relation NULL Propagation

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Make optional relation fields (LEFT JOIN) propagate `| undefined` to all primitive columns, so `dl.employee!.name` correctly infers `ExprUnit<string | undefined>` instead of `ExprUnit<string>`.

**Architecture:** Add a `NullableQueryableRecord` mapped type that mirrors `QueryableRecord` but wraps all primitive fields with `ExprUnit<TData[K] | undefined>`. Use it in `QueryableRecord`'s optional single-object branch (line 1867-1868) so that accessing fields through `!` on an optional relation produces nullable types. This is a type-only change — no runtime behavior changes.

**Tech Stack:** TypeScript type system (mapped types, conditional types)

---

### Task 1: Add NullableQueryableRecord type

**Files:**
- Modify: `packages/orm-common/src/exec/queryable.ts:1851-1870`

**Step 1: Write the type-level test**

Create a test file that validates the type inference of optional relation fields.

**File:** `packages/orm-common/tests/types/nullable-queryable-record.spec.ts`

```typescript
import { describe, expectTypeOf, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { User } from "../setup/models/User";

describe("NullableQueryableRecord type inference", () => {
  it("optional relation (joinSingle) fields should be ExprUnit<T | undefined>", () => {
    const db = createTestDb();
    const q = db
      .post()
      .joinSingle("user", (qr, c) =>
        qr.from(User).where((u) => [expr.eq(u.id, c.userId)]),
      )
      .select((item) => ({
        title: item.title,
        userName: item.user!.name,
      }));

    // title is from the main table — should remain non-nullable
    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type TitleType = Result extends { title: { $infer: infer T } } ? T : never;
    type UserNameType = Result extends { userName: { $infer: infer T } } ? T : never;

    expectTypeOf<TitleType>().toEqualTypeOf<string>();
    expectTypeOf<UserNameType>().toEqualTypeOf<string | undefined>();
  });

  it("non-optional relation (required object) fields should remain ExprUnit<T>", () => {
    const db = createTestDb();
    // Direct columns — no optional relation involved
    const q = db.post().select((item) => ({
      title: item.title,
      viewCount: item.viewCount,
    }));

    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type TitleType = Result extends { title: { $infer: infer T } } ? T : never;

    expectTypeOf<TitleType>().toEqualTypeOf<string>();
  });

  it("nested optional relation should propagate undefined", () => {
    const db = createTestDb();
    const q = db
      .post()
      .include((item) => item.user.company)
      .select((item) => ({
        companyName: item.user!.company!.name,
      }));

    type Result = typeof q extends { meta: { columns: infer C } } ? C : never;
    type CompanyNameType = Result extends { companyName: { $infer: infer T } } ? T : never;

    expectTypeOf<CompanyNameType>().toEqualTypeOf<string | undefined>();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/orm-common/tests/types/nullable-queryable-record.spec.ts --run --project=node`
Expected: FAIL — `userName` type is `string` (not `string | undefined`) because `NullableQueryableRecord` doesn't exist yet.

**Step 3: Add NullableQueryableRecord type and update QueryableRecord**

In `packages/orm-common/src/exec/queryable.ts`, add `NullableQueryableRecord` right after the existing `QueryableRecord` type (after line 1870), then update line 1868 to use it.

**3a. Add the new type after `QueryableRecord` (after line 1870):**

```typescript
export type NullableQueryableRecord<TData extends DataRecord> = {
  // 1. Primitive — always | undefined (LEFT JOIN NULL propagation)
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K] | undefined>
    : // 2. Array (optional included)
      TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? NullableQueryableRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? NullableQueryableRecord<U>[] | undefined
          : never
        : // 3. Single object (optional included)
          TData[K] extends DataRecord
          ? NullableQueryableRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? NullableQueryableRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};
```

**3b. Update line 1868 in `QueryableRecord`:**

Change:
```typescript
? QueryableRecord<Exclude<TData[K], undefined>> | undefined
```
To:
```typescript
? NullableQueryableRecord<Exclude<TData[K], undefined>> | undefined
```

Also update the optional array branch (line 1862) for consistency:

Change:
```typescript
? QueryableRecord<U>[] | undefined
```
To:
```typescript
? NullableQueryableRecord<U>[] | undefined
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/orm-common/tests/types/nullable-queryable-record.spec.ts --run --project=node`
Expected: PASS

**Step 5: Run full typecheck**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS (or identify downstream type errors to fix in Task 2)

**Step 6: Commit**

```bash
git add packages/orm-common/src/exec/queryable.ts packages/orm-common/tests/types/nullable-queryable-record.spec.ts
git commit -m "feat(orm-common): add NullableQueryableRecord for LEFT JOIN NULL propagation"
```

---

### Task 2: Fix downstream type errors (if any)

**Files:**
- Potentially: `packages/orm-common/tests/select/join.spec.ts` and other test files that access optional relation fields

**Step 1: Run full typecheck and identify errors**

Run: `pnpm typecheck packages/orm-common`

If there are type errors (e.g. existing tests that use `item.user!.name` where the type changed from `ExprUnit<string>` to `ExprUnit<string | undefined>`), the errors will show exactly which files need updates.

**Step 2: Fix type errors**

For each error:
- If the existing code assigns optional-relation fields to non-nullable targets (e.g. `expr.eq(item.user!.isActive, true)`), add type narrowing or use `.n` accessor on `ExprUnit` to strip undefined, e.g.:
  ```typescript
  expr.eq(item.user!.isActive.n, true)
  ```
- `.n` is already defined on `ExprUnit` (line 11 of `expr-unit.ts`) as `get n(): ExprUnit<NonNullable<TPrimitive>>`

**Step 3: Run typecheck again**

Run: `pnpm typecheck packages/orm-common`
Expected: PASS

**Step 4: Run all orm-common tests**

Run: `pnpm vitest packages/orm-common --run --project=node`
Expected: PASS (type-only change, no runtime behavior affected)

**Step 5: Commit**

```bash
git add -A
git commit -m "fix(orm-common): update tests for NullableQueryableRecord type changes"
```

---

### Task 3: Run full project verification

**Step 1: Full typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 2: Lint**

Run: `pnpm lint packages/orm-common`
Expected: PASS

**Step 3: Run all orm-common tests**

Run: `pnpm vitest packages/orm-common --run --project=node`
Expected: PASS

**Step 4: Commit (if any additional fixes)**

```bash
git add -A
git commit -m "chore(orm-common): verify NullableQueryableRecord integration"
```
