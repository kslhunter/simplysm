# Utilities

Helper classes for metadata management, value type detection, and query result parsing.

## Class: DbDefUtils

**Source:** `src/utils/DbDefUtils.ts`

Static utility class for reading and writing table definition metadata via `Reflect.defineMetadata`. This is the low-level mechanism used by all decorators (`@Table`, `@Column`, `@ForeignKey`, etc.).

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getTableDef` | `(tableType: Type<any>, throws?: boolean) => ITableDef` | Get the table definition metadata for a class. Throws by default if `@Table()` was not applied. Pass `throws: false` to get an empty default definition instead |
| `setTableDef` | `(tableType: Type<any>, tableDef: ITableDef) => void` | Set the table definition metadata on a class |
| `mergeTableDef` | `(tableType: Type<any>, target: Partial<ITableDef>) => void` | Merge partial table definition into existing metadata |
| `addColumnDef` | `(tableType: Type<any>, def: IColumnDef) => void` | Add or merge a column definition. Merges by `propertyKey` |
| `addForeignKeyDef` | `(tableType: Type<any>, def: IForeignKeyDef) => void` | Add or merge a foreign key definition. Merges by `propertyKey` |
| `addForeignKeyTargetDef` | `(tableType: Type<any>, def: IForeignKeyTargetDef) => void` | Add or merge a foreign key target definition. Merges by `propertyKey` |
| `addIndexDef` | `(tableType: Type<any>, def: IIndexDef) => void` | Add or merge an index definition. Composite indexes with the same `name` have their columns merged by `columnPropertyKey` |
| `addReferenceKeyDef` | `(tableType: Type<any>, def: IReferenceKeyDef) => void` | Add or merge a reference key definition. Merges by `propertyKey` |
| `addReferenceKeyTargetDef` | `(tableType: Type<any>, def: IReferenceKeyTargetDef) => void` | Add or merge a reference key target definition. Merges by `propertyKey` |

**Example:**

```typescript
const tableDef = DbDefUtils.getTableDef(Employee);
// tableDef.name => "Employee"
// tableDef.columns => [{ propertyKey: "id", name: "id", ... }, ...]
// tableDef.foreignKeys => [{ name: "department", columnPropertyKeys: ["departmentId"], ... }]
```

---

## Class: SdOrmUtils

**Source:** `src/utils/SdOrmUtils.ts`

Static utility class for value type detection, string escaping, and query result parsing.

### Methods

#### replaceString

Escapes single quotes for SQL string literals by doubling them.

```typescript
static replaceString(str: string): string
```

```typescript
SdOrmUtils.replaceString("it's") // => "it''s"
```

#### canConvertToQueryValue

Checks if a value is a valid query value type. Returns `true` for: `undefined`, `boolean`, `number`, `string`, `QueryUnit`, `Number`, `String`, `Boolean`, `DateOnly`, `DateTime`, `Time`, `Uuid`, `Buffer`.

```typescript
static canConvertToQueryValue(value: any): value is TEntityValue<TQueryValue>
```

#### getQueryValueType

Returns the TypeScript constructor type for a query value (e.g., `Number`, `String`, `DateTime`). Returns `undefined` for `undefined` values. Throws for unsupported types.

```typescript
static getQueryValueType<T extends TQueryValue>(value: TEntityValue<T>): Type<T> | undefined
```

#### getQueryValueFields

Recursively extracts all flat query value fields from an entity object. Optionally limits recursion depth.

```typescript
static getQueryValueFields<T>(entity: TEntity<T>, availableDepth?: number): TEntityValue<any>[]
```

#### parseQueryResultAsync

Parses raw database query results into structured objects. Handles:

- **Type conversion**: Converts string values to `DateTime`, `DateOnly`, `Time`, `Uuid`, `Boolean`, `Number` based on `option.columns` type info
- **JOIN result grouping**: Uses `option.joins` to group flat JOIN results into nested objects (single or array relationships)
- **Async yielding**: Periodically yields control (every `yieldInterval` items) to avoid blocking the event loop on large result sets

```typescript
static async parseQueryResultAsync<T>(
  orgResults: any[],
  option?: IQueryResultParseOption,
  yieldInterval?: number,  // Default: 50
): Promise<T[]>
```
