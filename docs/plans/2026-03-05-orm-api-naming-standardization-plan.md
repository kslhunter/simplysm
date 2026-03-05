# orm-* API Naming Standardization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Rename public API identifiers across orm-common and orm-node to match industry standards.

**Architecture:** Systematic search-and-replace across type definitions, implementations, and tests following the dependency order: types → schema → ddl → query-builder → expr → exec → db-context → external → tests.

**Tech Stack:** TypeScript, pnpm monorepo, vitest

---

### Task 1: Rename type definitions

Rename all type-level identifiers in the three type files. This establishes the "source of truth" that the TypeScript compiler will use to flag all remaining references.

**Files:**
- Modify: `packages/orm-common/src/types/query-def.ts`
- Modify: `packages/orm-common/src/types/expr.ts`
- Modify: `packages/orm-common/src/types/db-context-def.ts`
- Modify: `packages/orm-common/src/schema/table-builder.ts`

**Step 1: Rename DDL QueryDef types in `query-def.ts`**

Apply these renames:
- `DropPkQueryDef` → `DropPrimaryKeyQueryDef` (interface name + all references in union types)
- `AddPkQueryDef` → `AddPrimaryKeyQueryDef`
- `AddFkQueryDef` → `AddForeignKeyQueryDef`
- `DropFkQueryDef` → `DropForeignKeyQueryDef`
- `AddIdxQueryDef` → `AddIndexQueryDef`
- `DropIdxQueryDef` → `DropIndexQueryDef`
- Each interface's `type` string literal: `"dropPk"` → `"dropPrimaryKey"`, `"addPk"` → `"addPrimaryKey"`, `"addFk"` → `"addForeignKey"`, `"dropFk"` → `"dropForeignKey"`, `"addIdx"` → `"addIndex"`, `"dropIdx"` → `"dropIndex"`
- Update `DDL_TYPES` array string literals to match
- Update `DdlQueryDef` union type references
- Update `QueryDef` union type references

Also rename `SwitchFkQueryDef.switch: "on" | "off"` → `SwitchFkQueryDef.enabled: boolean`

**Step 2: Rename expression types in `expr.ts`**

- `DateSeparator` → `DateUnit` (type alias, line 9)
- `ExprDateDiff.separator` → `ExprDateDiff.unit` (field, line 329)
- `ExprDateAdd.separator` → `ExprDateAdd.unit` (field, line 337)
- `ExprIfNull` → `ExprCoalesce` (interface name, line 354)
- `ExprIfNull.type: "ifNull"` → `ExprCoalesce.type: "coalesce"` (type literal)
- Update `Expr` union type: `ExprIfNull` → `ExprCoalesce`

**Step 3: Rename DbContext types in `db-context-def.ts`**

- `DbContextBase.switchFk(table, switch_: "on" | "off")` → `switchFk(table, enabled: boolean)`
- `DbContextConnectionMethods.trans()` → `transaction()`
- `DbContextInstance`: all `["$infer"]` references → `["$inferSelect"]`
- `DbContextDdlMethods`:
  - `addPk()` → `addPrimaryKey()`
  - `dropPk()` → `dropPrimaryKey()`
  - `addFk()` → `addForeignKey()`
  - `dropFk()` → `dropForeignKey()`
  - `addIdx()` → `addIndex()`
  - `dropIdx()` → `dropIndex()`
  - `switchFk(table, switch_: "on" | "off")` → `switchFk(table, enabled: boolean)`
  - `getAddPkQueryDef()` → `getAddPrimaryKeyQueryDef()`
  - `getDropPkQueryDef()` → `getDropPrimaryKeyQueryDef()`
  - `getAddFkQueryDef()` → `getAddForeignKeyQueryDef()`
  - `getDropFkQueryDef()` → `getDropForeignKeyQueryDef()`
  - `getAddIdxQueryDef()` → `getAddIndexQueryDef()`
  - `getDropIdxQueryDef()` → `getDropIndexQueryDef()`
  - `getSwitchFkQueryDef(table, switch_: "on" | "off")` → `getSwitchFkQueryDef(table, enabled: boolean)`

**Step 4: Rename `$infer` in `table-builder.ts`**

- `readonly $infer!:` → `readonly $inferSelect!:` (line 61)
- Keep `$inferColumns`, `$inferInsert`, `$inferUpdate` as-is

**Step 5: Verify types compile**

Run: `pnpm -F @simplysm/orm-common exec tsc --noEmit 2>&1 | head -20`
Expected: Type errors in downstream files (implementations not yet renamed) — this is expected and OK at this stage.

---

### Task 2: Rename DDL helper functions and query builder base

Rename the DDL helper functions that generate QueryDef objects, and the abstract methods in query builder base.

**Files:**
- Modify: `packages/orm-common/src/ddl/relation-ddl.ts`
- Modify: `packages/orm-common/src/ddl/schema-ddl.ts`
- Modify: `packages/orm-common/src/ddl/initialize.ts`
- Modify: `packages/orm-common/src/query-builder/base/query-builder-base.ts`
- Modify: `packages/orm-common/src/query-builder/base/expr-renderer-base.ts`

**Step 1: Rename functions in `relation-ddl.ts`**

- `getDropPkQueryDef()` → `getDropPrimaryKeyQueryDef()`
- `getAddPkQueryDef()` → `getAddPrimaryKeyQueryDef()`
- `getAddFkQueryDef()` → `getAddForeignKeyQueryDef()` — also update internal `type: "addFk"` → `type: "addForeignKey"`
- `getAddIdxQueryDef()` → `getAddIndexQueryDef()` — also update internal `type: "addIdx"` → `type: "addIndex"`
- `getDropFkQueryDef()` → `getDropForeignKeyQueryDef()` — also update internal `type: "dropFk"` → `type: "dropForeignKey"`
- `getDropIdxQueryDef()` → `getDropIndexQueryDef()` — also update internal `type: "dropIdx"` → `type: "dropIndex"`
- Update return type annotations from old names to new names
- Update `type:` string literals inside each function to match new QueryDef type literals

**Step 2: Rename in `schema-ddl.ts`**

- `getSwitchFkQueryDef(params: { table, switch_: "on" | "off" })` → parameter `switch_` → `enabled`, and return `{ ..., enabled: params.enabled }` instead of `{ ..., switch: params.switch_ }`
- Update return type to match renamed `SwitchFkQueryDef`

**Step 3: Rename `result()` call in `initialize.ts`**

- `._migration().result()` → `._migration().execute()` (line 75)

**Step 4: Rename abstract methods in `query-builder-base.ts`**

In the `build()` method's switch-case:
- `case "addPk":` → `case "addPrimaryKey":`
- `case "dropPk":` → `case "dropPrimaryKey":`
- `case "addFk":` → `case "addForeignKey":`
- `case "dropFk":` → `case "dropForeignKey":`
- `case "addIdx":` → `case "addIndex":`
- `case "dropIdx":` → `case "dropIndex":`

Abstract method signatures:
- `protected abstract addPk(def: AddPkQueryDef)` → `addPrimaryKey(def: AddPrimaryKeyQueryDef)`
- Similarly for `dropPk`, `addFk`, `dropFk`, `addIdx`, `dropIdx`
- `protected abstract switchFk(def: SwitchFkQueryDef)` — parameter type already renamed in Task 1, the method name stays `switchFk`

Update import statements for renamed types.

**Step 5: Rename abstract methods in `expr-renderer-base.ts`**

In the `render()` method's switch-case:
- `case "ifNull":` → `case "coalesce":`
- Update `DateSeparator` import → `DateUnit`
- Update `ExprDateDiff`/`ExprDateAdd` references if used
- Abstract method signatures: update parameter type annotations for `dateDiff`, `dateAdd` to use `unit` field, and `ifNull` → `coalesce`

---

### Task 3: Rename in dialect query builders (MySQL, MSSQL, PostgreSQL)

Rename method implementations in all 3 dialect query builders and expr renderers.

**Files:**
- Modify: `packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts`
- Modify: `packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts`
- Modify: `packages/orm-common/src/query-builder/mssql/mssql-query-builder.ts`
- Modify: `packages/orm-common/src/query-builder/mssql/mssql-expr-renderer.ts`
- Modify: `packages/orm-common/src/query-builder/postgresql/postgresql-query-builder.ts`
- Modify: `packages/orm-common/src/query-builder/postgresql/postgresql-expr-renderer.ts`

**Step 1: Rename in each query builder (3 files)**

For each of `mysql-query-builder.ts`, `mssql-query-builder.ts`, `postgresql-query-builder.ts`:
- Method names: `addPk` → `addPrimaryKey`, `dropPk` → `dropPrimaryKey`, `addFk` → `addForeignKey`, `dropFk` → `dropForeignKey`, `addIdx` → `addIndex`, `dropIdx` → `dropIndex`
- Parameter types: `AddPkQueryDef` → `AddPrimaryKeyQueryDef`, etc.
- `switchFk` method: change `def.switch` → `def.enabled` references (e.g., `def.switch === "on"` → `def.enabled === true` or `def.enabled`)
- Update import statements for renamed types

**Step 2: Rename in each expr renderer (3 files)**

For each of `mysql-expr-renderer.ts`, `mssql-expr-renderer.ts`, `postgresql-expr-renderer.ts`:
- Method names in abstract overrides: `ifNull(expr: ExprIfNull)` → `coalesce(expr: ExprCoalesce)`
- `dateDiff` / `dateAdd` methods: `expr.separator` → `expr.unit`
- `dateSeparatorToUnit(sep: DateSeparator)` → `dateSeparatorToUnit(sep: DateUnit)` (or rename method to `dateUnitToSql`)
- Update import statements: `DateSeparator` → `DateUnit`, `ExprIfNull` → `ExprCoalesce`

**Step 3: Verify typecheck**

Run: `pnpm -F @simplysm/orm-common exec tsc --noEmit 2>&1 | head -20`
Expected: Errors should be limited to expr.ts, queryable.ts, create-db-context.ts, and test files.

---

### Task 4: Rename in expression builder and queryable

Rename public API functions in `expr.ts` and methods/parameters in `queryable.ts`.

**Files:**
- Modify: `packages/orm-common/src/expr/expr.ts`
- Modify: `packages/orm-common/src/exec/queryable.ts`

**Step 1: Rename in `expr.ts`**

- `dateDiff` method: parameter `separator: DateSeparator` → `unit: DateUnit`
  - Internal: `separator` → `unit` in the ExprUnit constructor object
- `dateAdd` method: parameter `separator: DateSeparator` → `unit: DateUnit`
  - Internal: `separator` → `unit` in the ExprUnit constructor object
- `ifNull` function → rename to `coalesce`:
  - All 3 overload signatures: `function ifNull` → `function coalesce`
  - Implementation: `function ifNull` → `function coalesce`
  - Internal `type: "ifNull"` → `type: "coalesce"`
  - Export in the `expr` object: `ifNull,` → `coalesce,`
  - JSDoc comment: update references
- Update import: `DateSeparator` → `DateUnit`

**Step 2: Rename in `queryable.ts`**

Public API method:
- `async result(): Promise<TData[]>` → `async execute(): Promise<TData[]>`
- Internal calls: `this.top(2).result()` → `this.top(2).execute()` (in `single()`)
- Internal calls: `this.top(1).result()` → `this.top(1).execute()` (in `first()`)
- All JSDoc example `.result()` → `.execute()`

Parameter renames (`fwd` → `fn`):
- `join(as, fwd)` → `join(as, fn)` — update parameter name, internal references, JSDoc
- `joinSingle(as, fwd)` → `joinSingle(as, fn)` — same
- `recursive(fwd)` → `recursive(fn)` — same
- `count(fwd?)` → `count(fn?)` — same
- `upsert(updateFwd, ...)` → `upsert(updateFn, ...)` — all overloads
- `upsert` implementation: `insertFwdOrOutputColumns` → `insertFnOrOutputColumns`, `updateFwdOrInsertFwd` → `updateFnOrInsertFn`, etc.
- `getUpsertQueryDef(updateRecordFwd, insertRecordFwd, ...)` → `getUpsertQueryDef(updateRecordFn, insertRecordFn, ...)`

**Step 3: Verify typecheck**

Run: `pnpm -F @simplysm/orm-common exec tsc --noEmit 2>&1 | head -20`
Expected: Errors limited to `create-db-context.ts` and test files.

---

### Task 5: Rename in DbContext and orm-node

Rename methods in `create-db-context.ts` and update `orm-node` references.

**Files:**
- Modify: `packages/orm-common/src/create-db-context.ts`
- Modify: `packages/orm-node/src/create-orm.ts`
- Modify: `packages/orm-node/src/node-db-context-executor.ts` (if references exist)

**Step 1: Rename in `create-db-context.ts`**

Connection methods:
- `trans(` → `transaction(` (method definition + any internal references)

DDL methods:
- `addPk(` → `addPrimaryKey(`
- `dropPk(` → `dropPrimaryKey(`
- `addFk(` → `addForeignKey(`
- `dropFk(` → `dropForeignKey(`
- `addIdx(` → `addIndex(`
- `dropIdx(` → `dropIndex(`

DDL QueryDef getters:
- `getAddPkQueryDef` → `getAddPrimaryKeyQueryDef`
- `getDropPkQueryDef` → `getDropPrimaryKeyQueryDef`
- `getAddFkQueryDef` → `getAddForeignKeyQueryDef`
- `getDropFkQueryDef` → `getDropForeignKeyQueryDef`
- `getAddIdxQueryDef` → `getAddIndexQueryDef`
- `getDropIdxQueryDef` → `getDropIndexQueryDef`

switchFk:
- `switchFk(table, switch_: "on" | "off")` → `switchFk(table, enabled: boolean)`
- `getSwitchFkQueryDef(table, switch_)` → `getSwitchFkQueryDef(table, enabled)`

JSDoc examples:
- `.result()` → `.execute()`
- Any `$infer` references → `$inferSelect`

Update imports for renamed types.

**Step 2: Rename in `orm-node/src/create-orm.ts`**

- JSDoc example `.result()` → `.execute()`
- Any other references to renamed APIs

**Step 3: Verify both packages typecheck**

Run: `pnpm -F @simplysm/orm-common -F @simplysm/orm-node exec tsc --noEmit 2>&1 | head -20`
Expected: Only test files and possibly service-server should have errors.

---

### Task 6: Update test files

Update all test files to use the new API names.

**Files:**
- Modify: `packages/orm-common/tests/ddl/basic.expected.ts`
- Modify: `packages/orm-common/tests/ddl/basic.spec.ts`
- Modify: `packages/orm-common/tests/ddl/index-builder.spec.ts`
- Modify: `packages/orm-common/tests/ddl/relation-builder.spec.ts`
- Modify: `packages/orm-common/tests/expr/conditional.expected.ts`
- Modify: `packages/orm-common/tests/expr/conditional.spec.ts`
- Modify: `packages/orm-common/tests/expr/date.spec.ts`
- Modify: `packages/orm-common/tests/expr/date.expected.ts`
- Modify: `packages/orm-common/tests/select/basic.spec.ts`
- Modify: `packages/orm-common/tests/dml/update.spec.ts`
- Modify: `packages/orm-common/tests/db-context/create-db-context.spec.ts` (if references exist)
- Modify: Any other test files with references to renamed APIs

**Step 1: Update DDL test expected values**

In `tests/ddl/basic.expected.ts`:
- Rename export names: `dropPk` → `dropPrimaryKey`, `addPk` → `addPrimaryKey`, `addPkComposite` → `addPrimaryKeyComposite`, `addFk` → `addForeignKey`, `dropFk` → `dropForeignKey`, `addIdx` → `addIndex`, `dropIdx` → `dropIndex`, `dropIdxComposite` → `dropIndexComposite`
- Rename `switchFkOn` → keep name (it's just a test variable) or update consistently

**Step 2: Update DDL test specs**

In `tests/ddl/basic.spec.ts`:
- `type: "dropPk"` → `type: "dropPrimaryKey"`
- `type: "addPk"` → `type: "addPrimaryKey"`
- `type: "addFk"` → `type: "addForeignKey"`
- `type: "dropFk"` → `type: "dropForeignKey"`
- `type: "addIdx"` → `type: "addIndex"`
- `type: "dropIdx"` → `type: "dropIndex"`
- `type: "switchFk"` — stays (only the property changes)
- Update `expected.dropPk` → `expected.dropPrimaryKey` etc. (property accessor)
- Update `switch: "on"` → `enabled: true`, `switch: "off"` → `enabled: false`

In `tests/ddl/index-builder.spec.ts`:
- `type: "addIdx"` → `type: "addIndex"` (5 occurrences)

In `tests/ddl/relation-builder.spec.ts`:
- `type: "addFk"` → `type: "addForeignKey"` (2 occurrences)

**Step 3: Update expression test expected values and specs**

In `tests/expr/conditional.expected.ts`:
- Rename export: `ifNull` → `coalesce`, `ifNullMultiple` → `coalesceMultiple`

In `tests/expr/conditional.spec.ts`:
- `describe("ifNull"` → `describe("coalesce"`
- `expr.ifNull(` → `expr.coalesce(`
- `type: "ifNull"` → `type: "coalesce"`
- `expected.ifNull` → `expected.coalesce`
- `expected.ifNullMultiple` → `expected.coalesceMultiple`

In `tests/expr/date.spec.ts`:
- `separator:` → `unit:` (5 occurrences)

In `tests/select/basic.spec.ts`:
- `describe("ifNull"` → `describe("coalesce"`
- `expr.ifNull(` → `expr.coalesce(`
- `type: "ifNull"` → `type: "coalesce"`

In `tests/dml/update.spec.ts`:
- `type: "switchFk"` → stays, but update `switch: "on"` → `enabled: true`

**Step 4: Update db-context test spec**

In `tests/db-context/create-db-context.spec.ts`:
- Any `.result()` → `.execute()`
- Any `switchFk` parameter changes
- Any `clearSchema` → stays
- Any `trans(` → `transaction(`

**Step 5: Run all tests**

Run: `pnpm -F @simplysm/orm-common run test`
Expected: All tests pass.

---

### Task 7: Update external packages and verify

Update references in packages outside orm-common that use the renamed APIs.

**Files:**
- Modify: `packages/service-server/src/services/orm-service.ts` (if references exist)
- Modify: `packages/orm-common/src/schema/procedure-builder.ts` (JSDoc `.result()` example)
- Modify: `packages/orm-common/src/schema/view-builder.ts` (if `$infer` references exist)

**Step 1: Search and fix remaining references**

Run grep across entire `packages/` directory for old names:
- `\.result()` (in non-test TypeScript files)
- `addPk\b|dropPk\b|addFk\b|dropFk\b|addIdx\b|dropIdx\b` (excluding DDL type string literals which are already updated)
- `\.trans(` (method call)
- `separator` (in expr context)
- `ifNull` (in expr context)
- `\$infer[^CIU]` (matches `$infer` but not `$inferColumns`, `$inferInsert`, `$inferUpdate`)
- `DateSeparator`
- `switch_`

Fix any remaining references found.

**Step 2: Full typecheck**

Run: `pnpm -F @simplysm/orm-common -F @simplysm/orm-node exec tsc --noEmit`
Expected: No errors.

**Step 3: Run full test suite**

Run: `pnpm -F @simplysm/orm-common run test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add packages/orm-common packages/orm-node packages/service-server
git commit -m "refactor(orm): rename public API methods to match industry standards"
```
