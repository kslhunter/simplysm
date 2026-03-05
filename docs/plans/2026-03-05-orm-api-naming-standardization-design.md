# orm-* API Naming Standardization Design

## Background

Industry standard comparison (Drizzle ORM, Kysely, Prisma) revealed naming misalignments and internal inconsistencies in `packages/orm-common` and `packages/orm-node`.

## Changes

### P0: Industry Misalignment

#### 1. `result()` -> `execute()` (Queryable)

- Current: `.result()` returns `Promise<TData[]>`
- All surveyed ORMs use `execute()` or `all()`
- Internal calls (`single()`, `first()`, `count()`) also updated

#### 2. DDL Abbreviations -> Full Words

| Before | After |
|--------|-------|
| `addPk()` | `addPrimaryKey()` |
| `dropPk()` | `dropPrimaryKey()` |
| `addFk()` | `addForeignKey()` |
| `dropFk()` | `dropForeignKey()` |
| `addIdx()` | `addIndex()` |
| `dropIdx()` | `dropIndex()` |

#### 3. Date Function `separator` -> `unit`

- `dateDiff(separator, from, to)` -> `dateDiff(unit, from, to)`
- `dateAdd(separator, source, value)` -> `dateAdd(unit, source, value)`

#### 4. `trans()` -> `transaction()`

- In `DbContextConnectionMethods`

### P1: Internal Inconsistency

#### 5. `fwd` Callback Parameter -> `fn`

| Before | After |
|--------|-------|
| `join(as, fwd)` | `join(as, fn)` |
| `joinSingle(as, fwd)` | `joinSingle(as, fn)` |
| `recursive(fwd)` | `recursive(fn)` |
| `count(fwd?)` | `count(fn?)` |
| `upsert(updateFwd, insertFwd)` | `upsert(updateFn, insertFn)` |

### P2: Optional Improvements

#### 6. `ifNull()` -> `coalesce()` (expr)

- MySQL-specific term -> SQL standard `COALESCE()`

#### 7. `switchFk(table, "on"|"off")` -> `switchFk(table, enabled: boolean)`

- String literal -> boolean parameter

#### 8. `$infer` -> `$inferSelect` (TableBuilder)

- Aligns with Drizzle convention, more explicit

## Internal Type Changes

### types/query-def.ts

| Before | After | Type Literal |
|--------|-------|-------------|
| `AddPkQueryDef` | `AddPrimaryKeyQueryDef` | `"addPk"` -> `"addPrimaryKey"` |
| `DropPkQueryDef` | `DropPrimaryKeyQueryDef` | `"dropPk"` -> `"dropPrimaryKey"` |
| `AddFkQueryDef` | `AddForeignKeyQueryDef` | `"addFk"` -> `"addForeignKey"` |
| `DropFkQueryDef` | `DropForeignKeyQueryDef` | `"dropFk"` -> `"dropForeignKey"` |
| `AddIdxQueryDef` | `AddIndexQueryDef` | `"addIdx"` -> `"addIndex"` |
| `DropIdxQueryDef` | `DropIndexQueryDef` | `"dropIdx"` -> `"dropIndex"` |
| `SwitchFkQueryDef.switch_: "on"\|"off"` | `SwitchFkQueryDef.enabled: boolean` | - |

### types/expr.ts

| Before | After |
|--------|-------|
| `DateSeparator` type | `DateUnit` |
| `ExprDateDiff.separator` field | `ExprDateDiff.unit` |
| `ExprDateAdd.separator` field | `ExprDateAdd.unit` |
| `ExprIfNull` interface (type: `"ifNull"`) | `ExprCoalesce` (type: `"coalesce"`) |

### types/db-context-def.ts

| Before | After |
|--------|-------|
| `DbContextBase.switchFk(table, switch_: "on"\|"off")` | `switchFk(table, enabled: boolean)` |
| `DbContextConnectionMethods.trans()` | `transaction()` |
| `DbContextInstance` refs to `$infer` | `$inferSelect` |

### DDL Helper Functions (ddl/)

| Before | After |
|--------|-------|
| `getAddPkQueryDef()` | `getAddPrimaryKeyQueryDef()` |
| `getDropPkQueryDef()` | `getDropPrimaryKeyQueryDef()` |
| `getAddFkQueryDef()` | `getAddForeignKeyQueryDef()` |
| `getDropFkQueryDef()` | `getDropForeignKeyQueryDef()` |
| `getAddIdxQueryDef()` | `getAddIndexQueryDef()` |
| `getDropIdxQueryDef()` | `getDropIndexQueryDef()` |

## Query Builder & Renderer Impact

### Query Builders (3 dialects)

- Method renames: `addPk()` -> `addPrimaryKey()`, etc.
- `build()` switch-case type literal matching updated
- `switchFk()` internal: `def.switch_` -> `def.enabled`

### Expr Renderers (3 dialects)

- `DateSeparator` import -> `DateUnit`
- `expr.separator` -> `expr.unit` in dateDiff/dateAdd rendering
- `"ifNull"` case -> `"coalesce"` case
- `dateSeparatorToUnit()` method: import type updated

### base/query-builder-base.ts

- Abstract switch-case type literals updated
- `switchFk()`: `def.switch_` -> `def.enabled`

### base/expr-renderer-base.ts

- `render()` switch-case: `"ifNull"` -> `"coalesce"`

## External Package Impact

| Package | Changes |
|---------|---------|
| `packages/orm-node` | Type references |
| `packages/service-server/src/services/orm-service.ts` | ORM type references |
| `packages/solid-demo-server/` | `.result()` -> `.execute()` calls |
| `tests/**/*.spec.ts` | All API call updates |

## Implementation Order

1. **types/** - query-def.ts, expr.ts, db-context-def.ts
2. **schema/** - table-builder.ts (`$infer` -> `$inferSelect`)
3. **ddl/** - Helper function renames
4. **query-builder/** - base -> mysql/mssql/postgresql
5. **expr/** - Public function names, parameter names
6. **exec/** - queryable.ts (`result()` -> `execute()`, `fwd` -> `fn`)
7. **create-db-context.ts** - `trans()` -> `transaction()`, DDL method names
8. **External packages** - orm-node, service-server, solid-demo-server, tests

## Verification

- `/sd-check` - typecheck + lint + test
- Residual reference search: `result()`, `addPk`, `separator`, `trans()`, `fwd`, `ifNull`, `switchFk.*"on"`, `$infer[^CS]`

## Rejected Items

- `clearSchema` - Keep (semantically correct: clears objects within schema, doesn't drop schema)
- `Table()`, `View()`, `Procedure()` PascalCase - Keep (intentional, class-like factory pattern)
- `insertIfNotExists()` - Keep (WHERE EXISTS pattern, distinct from conflict-based)
