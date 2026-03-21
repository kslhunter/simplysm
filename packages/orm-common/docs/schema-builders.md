# Schema Builders

## `Table`

Table builder factory function. Creates a `TableBuilder` for defining table schema via fluent API.

```typescript
function Table(name: string): TableBuilder<{}, {}>;
```

## `TableBuilder`

Database table definition builder. Define columns, PK, indexes, and relations via fluent API.

```typescript
class TableBuilder<
  TColumns extends ColumnBuilderRecord,
  TRelations extends RelationBuilderRecord,
> {
  readonly $columns!: TColumns;
  readonly $relations!: TRelations;
  readonly $inferSelect!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  readonly $inferColumns!: InferColumns<TColumns>;
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;

  constructor(readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    columns?: TColumns;
    primaryKey?: (keyof TColumns & string)[];
    relations?: TRelations;
    indexes?: IndexBuilder<(keyof TColumns & string)[]>[];
  });

  description(desc: string): TableBuilder<TColumns, TRelations>;
  database(db: string): TableBuilder<TColumns, TRelations>;
  schema(schema: string): TableBuilder<TColumns, TRelations>;
  columns<TNewColumnDefs extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => TNewColumnDefs,
  ): TableBuilder<TNewColumnDefs, TRelations>;
  primaryKey(...columns: (keyof TColumns & string)[]): TableBuilder<TColumns, TRelations>;
  indexes(fn: (i: ...) => IndexBuilder<string[]>[]): TableBuilder<TColumns, TRelations>;
  relations<T extends RelationBuilderRecord>(fn: (r: ...) => T): TableBuilder<TColumns, T>;
}
```

| Method | Description |
|--------|-------------|
| `description()` | Set table description (DDL comment) |
| `database()` | Set database name |
| `schema()` | Set schema name (MSSQL/PostgreSQL) |
| `columns()` | Define columns using the column factory |
| `primaryKey()` | Set primary key columns (composite PK supported) |
| `indexes()` | Define indexes using the index factory |
| `relations()` | Define relations using the relation factory |

## `View`

View builder factory function. Creates a `ViewBuilder` for defining view schema via fluent API.

```typescript
function View(name: string): ViewBuilder<any, any, {}>;
```

## `ViewBuilder`

Database view definition builder. Define view query and relations via fluent API.

```typescript
class ViewBuilder<
  TDbContext extends DbContextBase,
  TData extends DataRecord,
  TRelations extends RelationBuilderRecord,
> {
  readonly $relations!: TRelations;
  readonly $inferSelect!: TData;

  constructor(readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    viewFn?: (db: TDbContext) => Queryable<TData, any>;
    relations?: TRelations;
  });

  description(desc: string): ViewBuilder<TDbContext, TData, TRelations>;
  database(db: string): ViewBuilder<TDbContext, TData, TRelations>;
  schema(schema: string): ViewBuilder<TDbContext, TData, TRelations>;
  query<TViewData extends DataRecord, TDb extends DbContextBase>(
    viewFn: (db: TDb) => Queryable<TViewData, any>,
  ): ViewBuilder<TDb, TViewData, TRelations>;
  relations<T extends RelationBuilderRecord>(fn: (r: ...) => T): ViewBuilder<TDbContext, TData & InferDeepRelations<T>, TRelations>;
}
```

| Method | Description |
|--------|-------------|
| `description()` | Set view description (DDL comment) |
| `database()` | Set database name |
| `schema()` | Set schema name |
| `query()` | Define the view's SELECT query |
| `relations()` | Define relations with other tables/views |

## `Procedure`

Procedure builder factory function. Creates a `ProcedureBuilder` for defining stored procedure schema via fluent API.

```typescript
function Procedure(name: string): ProcedureBuilder<never, never>;
```

## `ProcedureBuilder`

Stored procedure definition builder. Define parameters, return type, and body via fluent API.

```typescript
class ProcedureBuilder<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
> {
  readonly $params!: TParams;
  readonly $returns!: TReturns;

  constructor(readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    params?: TParams;
    returns?: TReturns;
    query?: string;
  });

  description(desc: string): ProcedureBuilder<TParams, TReturns>;
  database(db: string): ProcedureBuilder<TParams, TReturns>;
  schema(schema: string): ProcedureBuilder<TParams, TReturns>;
  params<T extends ColumnBuilderRecord>(fn: (c: ...) => T): ProcedureBuilder<T, TReturns>;
  returns<T extends ColumnBuilderRecord>(fn: (c: ...) => T): ProcedureBuilder<TParams, T>;
  body(sql: string): ProcedureBuilder<TParams, TReturns>;
}
```

| Method | Description |
|--------|-------------|
| `description()` | Set procedure description |
| `database()` | Set database name |
| `schema()` | Set schema name |
| `params()` | Define input parameters |
| `returns()` | Define return type columns |
| `body()` | Set procedure body SQL |

## `ColumnBuilder`

Column definition builder. Define column type, nullable, autoIncrement, default, and description via fluent API.

```typescript
class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  constructor(readonly meta: TMeta);

  autoIncrement(): ColumnBuilder<TValue, Omit<TMeta, "autoIncrement"> & { autoIncrement: true }>;
  nullable(): ColumnBuilder<TValue | undefined, Omit<TMeta, "nullable"> & { nullable: true }>;
  default(value: TValue): ColumnBuilder<TValue, Omit<TMeta, "default"> & { default: typeof value }>;
  description(desc: string): ColumnBuilder<TValue, TMeta & { description: string }>;
}
```

| Method | Description |
|--------|-------------|
| `autoIncrement()` | Set auto increment (optional in INSERT) |
| `nullable()` | Allow NULL (adds `undefined` to type) |
| `default()` | Set default value (optional in INSERT) |
| `description()` | Set column description (DDL comment) |

## `createColumnFactory`

Column builder factory. Provides builder creation methods for all basic data types.

```typescript
function createColumnFactory(): {
  int(): ColumnBuilder<number, ...>;
  bigint(): ColumnBuilder<number, ...>;
  float(): ColumnBuilder<number, ...>;
  double(): ColumnBuilder<number, ...>;
  decimal(precision: number, scale?: number): ColumnBuilder<number, ...>;
  varchar(length: number): ColumnBuilder<string, ...>;
  char(length: number): ColumnBuilder<string, ...>;
  text(): ColumnBuilder<string, ...>;
  binary(): ColumnBuilder<Bytes, ...>;
  boolean(): ColumnBuilder<boolean, ...>;
  datetime(): ColumnBuilder<DateTime, ...>;
  date(): ColumnBuilder<DateOnly, ...>;
  time(): ColumnBuilder<Time, ...>;
  uuid(): ColumnBuilder<Uuid, ...>;
};
```

| Method | SQL Type | TypeScript Type |
|--------|----------|-----------------|
| `int()` | INT (4 bytes) | `number` |
| `bigint()` | BIGINT (8 bytes) | `number` |
| `float()` | FLOAT (4 bytes) | `number` |
| `double()` | DOUBLE (8 bytes) | `number` |
| `decimal()` | DECIMAL(p, s) | `number` |
| `varchar()` | VARCHAR(n) | `string` |
| `char()` | CHAR(n) | `string` |
| `text()` | TEXT | `string` |
| `binary()` | LONGBLOB/VARBINARY(MAX)/BYTEA | `Bytes` |
| `boolean()` | TINYINT(1)/BIT/BOOLEAN | `boolean` |
| `datetime()` | DATETIME | `DateTime` |
| `date()` | DATE | `DateOnly` |
| `time()` | TIME | `Time` |
| `uuid()` | BINARY(16)/UNIQUEIDENTIFIER/UUID | `Uuid` |

## `IndexBuilder`

Index definition builder. Define index columns, uniqueness, and sort order via fluent API.

```typescript
class IndexBuilder<TKeys extends string[]> {
  constructor(readonly meta: {
    columns: TKeys;
    name?: string;
    unique?: boolean;
    orderBy?: { [K in keyof TKeys]: "ASC" | "DESC" };
    description?: string;
  });

  name(name: string): IndexBuilder<TKeys>;
  unique(): IndexBuilder<TKeys>;
  orderBy(...orderBy: { [K in keyof TKeys]: "ASC" | "DESC" }): IndexBuilder<TKeys>;
  description(description: string): IndexBuilder<TKeys>;
}
```

## `createIndexFactory`

Index builder factory. Used in `TableBuilder.indexes()`.

```typescript
function createIndexFactory<TColumnKey extends string>(): {
  index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys>;
};
```

## `ForeignKeyBuilder`

Foreign key relation builder (N:1). Creates actual FK constraints in the DB.

```typescript
class ForeignKeyBuilder<
  TOwner extends TableBuilder<any, any>,
  TTargetFn extends () => TableBuilder<any, any>,
> {
  constructor(readonly meta: {
    ownerFn: () => TOwner;
    columns: string[];
    targetFn: TTargetFn;
    description?: string;
  });

  description(desc: string): ForeignKeyBuilder<TOwner, TTargetFn>;
}
```

## `ForeignKeyTargetBuilder`

Foreign key reverse-reference builder (1:N). Loaded as array on `include()` (single object when `.single()` is called).

```typescript
class ForeignKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any>,
  TIsSingle extends boolean,
> {
  constructor(readonly meta: {
    targetTableFn: TTargetTableFn;
    relationName: string;
    description?: string;
    isSingle?: TIsSingle;
  });

  description(desc: string): ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle>;
  single(): ForeignKeyTargetBuilder<TTargetTableFn, true>;
}
```

## `RelationKeyBuilder`

Logical relation builder (N:1). Same as `ForeignKeyBuilder` but does not create FK constraints in the DB. Can be used in views.

```typescript
class RelationKeyBuilder<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
> {
  constructor(readonly meta: {
    ownerFn: () => TOwner;
    columns: string[];
    targetFn: TTargetFn;
    description?: string;
  });

  description(desc: string): RelationKeyBuilder<TOwner, TTargetFn>;
}
```

## `RelationKeyTargetBuilder`

Logical relation reverse-reference builder (1:N). Same as `ForeignKeyTargetBuilder` but without DB FK constraints. Can be used in views.

```typescript
class RelationKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TIsSingle extends boolean,
> {
  constructor(readonly meta: {
    targetTableFn: TTargetTableFn;
    relationName: string;
    description?: string;
    isSingle?: TIsSingle;
  });

  description(desc: string): RelationKeyTargetBuilder<TTargetTableFn, TIsSingle>;
  single(): RelationKeyTargetBuilder<TTargetTableFn, true>;
}
```

## `createRelationFactory`

Relation builder factory. Used in `TableBuilder.relations()` and `ViewBuilder.relations()`. Tables can use both FK + RelationKey; views can only use RelationKey.

```typescript
function createRelationFactory<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TColumnKey extends string,
>(ownerFn: () => TOwner): TOwner extends TableBuilder<any, any>
  ? RelationFkFactory<TOwner, TColumnKey> & RelationRkFactory<TOwner, TColumnKey>
  : RelationRkFactory<TOwner, TColumnKey>;
```

## `ColumnBuilderRecord`

Column builder record type. Used as the return type of `TableBuilder.columns()`.

```typescript
type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;
```

## `RelationBuilderRecord`

Relation builder record type. Return type of `TableBuilder.relations()` and `ViewBuilder.relations()`.

```typescript
type RelationBuilderRecord = Record<
  string,
  ForeignKeyBuilder<any, any> | ForeignKeyTargetBuilder<any, any> | RelationKeyBuilder<any, any> | RelationKeyTargetBuilder<any, any>
>;
```

## `InferColumns`

Infer actual value types from a column builder record.

```typescript
type InferColumns<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? V : never;
};
```

## `InferColumnExprs`

Infer expression input types from a column builder record.

```typescript
type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never;
};
```

## `InferInsertColumns`

INSERT type inference. Required columns are required, optional columns (autoIncrement, nullable, default) are `Partial`.

```typescript
type InferInsertColumns<TBuilders extends ColumnBuilderRecord> = Pick<
  InferColumns<TBuilders>,
  RequiredInsertKeys<TBuilders>
> & Partial<Pick<InferColumns<TBuilders>, OptionalInsertKeys<TBuilders>>>;
```

## `InferUpdateColumns`

UPDATE type inference. All columns are optional.

```typescript
type InferUpdateColumns<TBuilders extends ColumnBuilderRecord> = Partial<InferColumns<TBuilders>>;
```

## `RequiredInsertKeys`

Extract required column keys for INSERT (columns without autoIncrement, nullable, or default).

```typescript
type RequiredInsertKeys<TBuilders extends ColumnBuilderRecord> = { ... }[keyof TBuilders];
```

## `OptionalInsertKeys`

Extract optional column keys for INSERT.

```typescript
type OptionalInsertKeys<TBuilders extends ColumnBuilderRecord> = Exclude<keyof TBuilders, RequiredInsertKeys<TBuilders>>;
```

## `DataToColumnBuilderRecord`

Transform from data record to column builder record.

```typescript
type DataToColumnBuilderRecord<TData extends DataRecord> = { ... };
```

## `InferDeepRelations`

Deep relation type inference from relation definitions. Makes all relations optional.

```typescript
type InferDeepRelations<TRelations extends RelationBuilderRecord> = {
  [K in keyof TRelations]?: ExtractRelationTarget<TRelations[K]> | ExtractRelationTargetResult<TRelations[K]>;
};
```

## `ExtractRelationTarget`

Extract target type from FK/RelationKey (single object, N:1 relation).

```typescript
type ExtractRelationTarget<TRelation> = ...;
```

## `ExtractRelationTargetResult`

Extract target type from FKTarget/RelationKeyTarget (array or single object, 1:N relation).

```typescript
type ExtractRelationTargetResult<TRelation> = ...;
```

## `_Migration`

Built-in system migration table. Automatically included in every `DbContextDef`.

```typescript
const _Migration = Table("_migration")
  .columns((c) => ({
    code: c.varchar(255),
  }))
  .description("System Migration Table")
  .primaryKey("code");
```
