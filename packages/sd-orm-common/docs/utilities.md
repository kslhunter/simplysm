# Utilities

Helper classes for metadata management, value type detection, and query result parsing.

## DbDefUtils

Static utility class for reading and writing table definition metadata via `Reflect.defineMetadata`.

**Source:** `src/utils/DbDefUtils.ts`

### Methods

| Method | Signature | Description |
|---|---|---|
| `getTableDef` | `(tableType, throws?) => ITableDef` | Get the table definition metadata for a class. Throws by default if not found. |
| `setTableDef` | `(tableType, tableDef) => void` | Set the table definition metadata on a class. |
| `mergeTableDef` | `(tableType, target) => void` | Merge partial table definition into existing metadata. |
| `addColumnDef` | `(tableType, def) => void` | Add or merge a column definition. |
| `addForeignKeyDef` | `(tableType, def) => void` | Add or merge a foreign key definition. |
| `addForeignKeyTargetDef` | `(tableType, def) => void` | Add or merge a foreign key target definition. |
| `addIndexDef` | `(tableType, def) => void` | Add or merge an index definition. Composite indexes with the same name are merged by column. |
| `addReferenceKeyDef` | `(tableType, def) => void` | Add or merge a reference key definition. |
| `addReferenceKeyTargetDef` | `(tableType, def) => void` | Add or merge a reference key target definition. |

**Example:**

```typescript
const tableDef = DbDefUtils.getTableDef(Employee);
// tableDef.name => "Employee"
// tableDef.columns => [{ propertyKey: "id", name: "id", ... }, ...]
```

## SdOrmUtils

Static utility class for value type detection and query result parsing.

**Source:** `src/utils/SdOrmUtils.ts`

### Methods

#### replaceString

Escapes single quotes for SQL string literals.

```typescript
static replaceString(str: string): string
// "it's" => "it''s"
```

#### canConvertToQueryValue

Checks if a value is a valid query value type (primitive, QueryUnit, DateOnly, DateTime, Time, Uuid, Buffer).

```typescript
static canConvertToQueryValue(value: any): value is TEntityValue<TQueryValue>
```

#### getQueryValueType

Returns the TypeScript constructor type for a query value (e.g., `Number`, `String`, `DateTime`). Returns `undefined` for `undefined` values. Throws for unsupported types.

```typescript
static getQueryValueType<T extends TQueryValue>(value: TEntityValue<T>): Type<T> | undefined
```

#### getQueryValueFields

Recursively extracts all flat query value fields from an entity object.

```typescript
static getQueryValueFields<T>(entity: TEntity<T>, availableDepth?: number): TEntityValue<any>[]
```

#### parseQueryResultAsync

Parses raw database query results into structured objects, handling:
- Type conversion (DateTime, DateOnly, Time, Uuid, Boolean, Number)
- JOIN result grouping and nesting (single vs. array relationships)
- Async yielding for large result sets

```typescript
static async parseQueryResultAsync<T>(
  orgResults: any[],
  option?: IQueryResultParseOption,
  yieldInterval?: number,  // Default: 50
): Promise<T[]>
```

## SystemMigration

Built-in model for the `_migration` system table that tracks applied migrations.

**Source:** `src/models/SystemMigration.ts`

```typescript
@Table({ name: "_migration", description: "Migration" })
class SystemMigration {
  @Column({ primaryKey: 1, description: "Code" })
  code!: string;
}
```

## CaseQueryHelper

Helper class for building `CASE WHEN ... THEN ... ELSE ... END` expressions. Created via `db.qh.case()`.

**Source:** `src/query/case/CaseQueryHelper.ts`

### Methods

| Method | Signature | Description |
|---|---|---|
| `case` | `(predicate, then) => this` | Add a WHEN clause |
| `else` | `(then) => QueryUnit<T>` | End with ELSE and return the QueryUnit |

## CaseWhenQueryHelper

Helper class for building `CASE expr WHEN value THEN ... ELSE ... END` expressions. Created via `db.qh.caseWhen()`.

**Source:** `src/query/case/CaseWhenQueryHelper.ts`

### Methods

| Method | Signature | Description |
|---|---|---|
| `when` | `(arg, then) => CaseWhenQueryHelper<T>` | Add a WHEN value clause |
| `else` | `(then) => QueryUnit<T>` | End with ELSE and return the QueryUnit |
