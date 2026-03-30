# Schema Builders

Fluent API builders for defining tables, views, procedures, columns, indexes, and relations.

## Table (function)

```typescript
function Table(name: string): TableBuilder<{}, {}>
```

Creates a new TableBuilder with the given table name.

## TableBuilder

```typescript
class TableBuilder<TColumns extends ColumnBuilderRecord, TRelations extends RelationBuilderRecord>
```

Fluent API for defining database table schema including columns, primary key, indexes, and relations.

### Phantom Type Fields

| Field | Type | Description |
|-------|------|-------------|
| `$columns` | `TColumns` | Column definitions (type inference) |
| `$relations` | `TRelations` | Relation definitions (type inference) |
| `$inferSelect` | `InferColumns<TColumns> & InferDeepRelations<TRelations>` | Full SELECT type |
| `$inferColumns` | `InferColumns<TColumns>` | Column-only type |
| `$inferInsert` | `InferInsertColumns<TColumns>` | INSERT type (AI/nullable/default optional) |
| `$inferUpdate` | `InferUpdateColumns<TColumns>` | UPDATE type (all optional) |

### Constructor

```typescript
constructor(readonly meta: {
  name: string;
  description?: string;
  database?: string;
  schema?: string;
  columns?: TColumns;
  primaryKey?: (keyof TColumns & string)[];
  relations?: TRelations;
  indexes?: IndexBuilder<(keyof TColumns & string)[]>[];
})
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `description` | `(desc: string) => TableBuilder` | Set table description (DDL comment) |
| `database` | `(db: string) => TableBuilder` | Set database name |
| `schema` | `(schema: string) => TableBuilder` | Set schema name (MSSQL/PostgreSQL) |
| `columns` | `<T>(fn: (c: ColumnFactory) => T) => TableBuilder<T, TRelations>` | Define columns via column factory |
| `primaryKey` | `(...columns: (keyof TColumns & string)[]) => TableBuilder` | Set primary key (single or composite) |
| `indexes` | `(fn: (i: IndexFactory) => IndexBuilder[]) => TableBuilder` | Define indexes |
| `relations` | `<T>(fn: (r: RelationFactory) => T) => TableBuilder<TColumns, T>` | Define FK and relation mappings |

## View (function)

```typescript
function View(name: string): ViewBuilder<any, any, {}>
```

Creates a new ViewBuilder with the given view name.

## ViewBuilder

```typescript
class ViewBuilder<TDbContext extends DbContextBase, TData extends DataRecord, TRelations extends RelationBuilderRecord>
```

Fluent API for defining database view schema.

### Phantom Type Fields

| Field | Type | Description |
|-------|------|-------------|
| `$relations` | `TRelations` | Relation definitions |
| `$inferSelect` | `TData` | Full SELECT type |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `description` | `(desc: string) => ViewBuilder` | Set view description |
| `database` | `(db: string) => ViewBuilder` | Set database name |
| `schema` | `(schema: string) => ViewBuilder` | Set schema name |
| `query` | `<TViewData, TDb>(viewFn: (db: TDb) => Queryable<TViewData, any>) => ViewBuilder<TDb, TViewData, TRelations>` | Define the view's SELECT query |
| `relations` | `<T>(fn: (r: RelationFactory) => T) => ViewBuilder` | Define relations (RelationKey only, no FK) |

## Procedure (function)

```typescript
function Procedure(name: string): ProcedureBuilder<never, never>
```

Creates a new ProcedureBuilder with the given procedure name.

## ProcedureBuilder

```typescript
class ProcedureBuilder<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord>
```

Fluent API for defining stored procedure schema.

### Phantom Type Fields

| Field | Type | Description |
|-------|------|-------------|
| `$params` | `TParams` | Parameter definitions |
| `$returns` | `TReturns` | Return type definitions |

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `description` | `(desc: string) => ProcedureBuilder` | Set procedure description |
| `database` | `(db: string) => ProcedureBuilder` | Set database name |
| `schema` | `(schema: string) => ProcedureBuilder` | Set schema name |
| `params` | `<T>(fn: (c: ColumnFactory) => T) => ProcedureBuilder<T, TReturns>` | Define input parameters |
| `returns` | `<T>(fn: (c: ColumnFactory) => T) => ProcedureBuilder<TParams, T>` | Define return columns |
| `body` | `(sql: string) => ProcedureBuilder` | Set procedure body SQL |

## ColumnBuilder

```typescript
class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  constructor(readonly meta: TMeta);
}
```

Column definition builder with fluent API for type modifiers.

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `autoIncrement` | `() => ColumnBuilder<TValue, TMeta & { autoIncrement: true }>` | Set auto-increment (INSERT optional) |
| `nullable` | `() => ColumnBuilder<TValue \| undefined, TMeta & { nullable: true }>` | Allow NULL values |
| `default` | `(value: TValue) => ColumnBuilder<TValue, TMeta & { default: TValue }>` | Set default value (INSERT optional) |
| `description` | `(desc: string) => ColumnBuilder<TValue, TMeta & { description: string }>` | Set column description (DDL comment) |

## createColumnFactory

```typescript
function createColumnFactory(): ColumnFactory
```

Returns a column type factory object. Used inside `TableBuilder.columns()` and `ProcedureBuilder.params()/returns()`.

### Factory Methods

| Method | Signature | SQL Type | TypeScript Type |
|--------|-----------|----------|-----------------|
| `int` | `() => ColumnBuilder<number, ...>` | `INT` | `number` |
| `bigint` | `() => ColumnBuilder<number, ...>` | `BIGINT` | `number` |
| `float` | `() => ColumnBuilder<number, ...>` | `FLOAT` | `number` |
| `double` | `() => ColumnBuilder<number, ...>` | `DOUBLE` | `number` |
| `decimal` | `(precision, scale?) => ColumnBuilder<number, ...>` | `DECIMAL(p,s)` | `number` |
| `varchar` | `(length) => ColumnBuilder<string, ...>` | `VARCHAR(n)` | `string` |
| `char` | `(length) => ColumnBuilder<string, ...>` | `CHAR(n)` | `string` |
| `text` | `() => ColumnBuilder<string, ...>` | `TEXT` | `string` |
| `binary` | `() => ColumnBuilder<Bytes, ...>` | `LONGBLOB`/`BYTEA` | `Bytes` |
| `boolean` | `() => ColumnBuilder<boolean, ...>` | `TINYINT(1)`/`BIT`/`BOOLEAN` | `boolean` |
| `datetime` | `() => ColumnBuilder<DateTime, ...>` | `DATETIME` | `DateTime` |
| `date` | `() => ColumnBuilder<DateOnly, ...>` | `DATE` | `DateOnly` |
| `time` | `() => ColumnBuilder<Time, ...>` | `TIME` | `Time` |
| `uuid` | `() => ColumnBuilder<Uuid, ...>` | `BINARY(16)`/`UNIQUEIDENTIFIER`/`UUID` | `Uuid` |

## IndexBuilder

```typescript
class IndexBuilder<TKeys extends string[]> {
  constructor(readonly meta: {
    columns: TKeys;
    name?: string;
    unique?: boolean;
    orderBy?: { [K in keyof TKeys]: "ASC" | "DESC" };
    description?: string;
  });
}
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `name` | `(name: string) => IndexBuilder<TKeys>` | Set custom index name |
| `unique` | `() => IndexBuilder<TKeys>` | Mark as unique index |
| `orderBy` | `(...orderBy: ("ASC" \| "DESC")[]) => IndexBuilder<TKeys>` | Set sort order per column |
| `description` | `(desc: string) => IndexBuilder<TKeys>` | Set index description |

## createIndexFactory

```typescript
function createIndexFactory<TColumnKey extends string>(): { index: (...columns: TColumnKey[]) => IndexBuilder }
```

Returns an index factory. Used inside `TableBuilder.indexes()`.

## ForeignKeyBuilder

```typescript
class ForeignKeyBuilder<TOwner extends TableBuilder<any, any>, TTargetFn extends () => TableBuilder<any, any>> {
  constructor(readonly meta: {
    ownerFn: () => TOwner;
    columns: string[];
    targetFn: TTargetFn;
    description?: string;
  });
}
```

N:1 FK relation builder. Creates an actual DB foreign key constraint.

| Method | Signature | Description |
|--------|-----------|-------------|
| `description` | `(desc: string) => ForeignKeyBuilder` | Set relation description |

## ForeignKeyTargetBuilder

```typescript
class ForeignKeyTargetBuilder<TTargetTableFn extends () => TableBuilder<any, any>, TIsSingle extends boolean> {
  constructor(readonly meta: {
    targetTableFn: TTargetTableFn;
    relationName: string;
    description?: string;
    isSingle?: TIsSingle;
  });
}
```

1:N FK reverse-reference builder. Loaded as array by default, single object with `.single()`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `description` | `(desc: string) => ForeignKeyTargetBuilder` | Set relation description |
| `single` | `() => ForeignKeyTargetBuilder<..., true>` | Change to 1:1 (single object) |

## RelationKeyBuilder

```typescript
class RelationKeyBuilder<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
>
```

Logical N:1 relation builder (no DB FK constraint). Works with both Tables and Views.

| Method | Signature | Description |
|--------|-----------|-------------|
| `description` | `(desc: string) => RelationKeyBuilder` | Set relation description |

## RelationKeyTargetBuilder

```typescript
class RelationKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TIsSingle extends boolean,
>
```

Logical 1:N reverse-reference builder (no DB FK constraint). Works with both Tables and Views.

| Method | Signature | Description |
|--------|-----------|-------------|
| `description` | `(desc: string) => RelationKeyTargetBuilder` | Set relation description |
| `single` | `() => RelationKeyTargetBuilder<..., true>` | Change to 1:1 (single object) |

## createRelationFactory

```typescript
function createRelationFactory<TOwner, TColumnKey extends string>(
  ownerFn: () => TOwner,
): RelationFactory
```

Creates a relation factory. For `TableBuilder`: provides `foreignKey`, `foreignKeyTarget`, `relationKey`, `relationKeyTarget`. For `ViewBuilder`: provides only `relationKey`, `relationKeyTarget`.

### Factory Methods (Table)

| Method | Signature | Description |
|--------|-----------|-------------|
| `foreignKey` | `(columns: TColumnKey[], targetFn: () => TableBuilder) => ForeignKeyBuilder` | N:1 FK (creates DB constraint) |
| `foreignKeyTarget` | `(targetTableFn: () => TableBuilder, relationName: string) => ForeignKeyTargetBuilder` | 1:N FK reverse-reference |
| `relationKey` | `(columns: TColumnKey[], targetFn: () => TableBuilder \| ViewBuilder) => RelationKeyBuilder` | N:1 logical relation (no DB FK) |
| `relationKeyTarget` | `(targetTableFn: () => TableBuilder \| ViewBuilder, relationName: string) => RelationKeyTargetBuilder` | 1:N logical reverse-reference |

### Factory Methods (View)

Only `relationKey` and `relationKeyTarget` are available for ViewBuilder.
