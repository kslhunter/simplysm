# Schema Builders

Fluent API builders for defining tables, views, procedures, columns, indexes, and relations.

Source: `src/schema/table-builder.ts`, `src/schema/view-builder.ts`, `src/schema/procedure-builder.ts`, `src/schema/factory/column-builder.ts`, `src/schema/factory/index-builder.ts`, `src/schema/factory/relation-builder.ts`, `src/models/system-migration.ts`

## Table / TableBuilder

### Table (factory function)

```typescript
function Table(name: string): TableBuilder<{}, {}>;
```

### TableBuilder

Immutable fluent builder. Each method returns a new instance.

```typescript
class TableBuilder<
  TColumns extends ColumnBuilderRecord,
  TRelations extends RelationBuilderRecord,
> {
  readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    columns?: TColumns;
    primaryKey?: (keyof TColumns & string)[];
    relations?: TRelations;
    indexes?: IndexBuilder<(keyof TColumns & string)[]>[];
  };

  // Type inference helpers
  readonly $inferSelect: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  readonly $inferColumns: InferColumns<TColumns>;
  readonly $inferInsert: InferInsertColumns<TColumns>;
  readonly $inferUpdate: InferUpdateColumns<TColumns>;

  description(desc: string): TableBuilder<TColumns, TRelations>;
  database(db: string): TableBuilder<TColumns, TRelations>;
  schema(schema: string): TableBuilder<TColumns, TRelations>;
  columns<T extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => T,
  ): TableBuilder<T, TRelations>;
  primaryKey(...columns: (keyof TColumns & string)[]): TableBuilder<TColumns, TRelations>;
  indexes(
    fn: (i: ReturnType<typeof createIndexFactory<keyof TColumns & string>>) => IndexBuilder<string[]>[],
  ): TableBuilder<TColumns, TRelations>;
  relations<T extends RelationBuilderRecord>(
    fn: (r: RelationFactory) => T,
  ): TableBuilder<TColumns, T>;
}
```

**Example:**

```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
  }));
```

---

## View / ViewBuilder

### View (factory function)

```typescript
function View(name: string): ViewBuilder<any, any, {}>;
```

### ViewBuilder

```typescript
class ViewBuilder<
  TDbContext extends DbContextBase,
  TData extends DataRecord,
  TRelations extends RelationBuilderRecord,
> {
  readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    viewFn?: (db: TDbContext) => Queryable<TData, any>;
    relations?: TRelations;
  };

  readonly $inferSelect: TData;

  description(desc: string): ViewBuilder<TDbContext, TData, TRelations>;
  database(db: string): ViewBuilder<TDbContext, TData, TRelations>;
  schema(schema: string): ViewBuilder<TDbContext, TData, TRelations>;
  query<TViewData extends DataRecord, TDb extends DbContextBase>(
    viewFn: (db: TDb) => Queryable<TViewData, any>,
  ): ViewBuilder<TDb, TViewData, TRelations>;
  relations<T extends RelationBuilderRecord>(
    fn: (r: RelationFactory) => T,
  ): ViewBuilder<TDbContext, TData & InferDeepRelations<T>, TRelations>;
}
```

**Example:**

```typescript
const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.status, "active")])
      .select((u) => ({ id: u.id, name: u.name, email: u.email }))
  );
```

---

## Procedure / ProcedureBuilder

### Procedure (factory function)

```typescript
function Procedure(name: string): ProcedureBuilder<never, never>;
```

### ProcedureBuilder

```typescript
class ProcedureBuilder<
  TParams extends ColumnBuilderRecord,
  TReturns extends ColumnBuilderRecord,
> {
  readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    params?: TParams;
    returns?: TReturns;
    query?: string;
  };

  description(desc: string): ProcedureBuilder<TParams, TReturns>;
  database(db: string): ProcedureBuilder<TParams, TReturns>;
  schema(schema: string): ProcedureBuilder<TParams, TReturns>;
  params<T extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => T,
  ): ProcedureBuilder<T, TReturns>;
  returns<T extends ColumnBuilderRecord>(
    fn: (c: ReturnType<typeof createColumnFactory>) => T,
  ): ProcedureBuilder<TParams, T>;
  body(sql: string): ProcedureBuilder<TParams, TReturns>;
}
```

**Example:**

```typescript
const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

---

## ColumnBuilder

Column definition builder used within `TableBuilder.columns()`.

```typescript
class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  readonly meta: TMeta;

  autoIncrement(): ColumnBuilder<TValue, TMeta & { autoIncrement: true }>;
  nullable(): ColumnBuilder<TValue | undefined, TMeta & { nullable: true }>;
  default(value: TValue): ColumnBuilder<TValue, TMeta & { default: typeof value }>;
  description(desc: string): ColumnBuilder<TValue, TMeta & { description: string }>;
}
```

## createColumnFactory

Returns an object with methods for all column types.

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

**Example:**

```typescript
Table("Product").columns((c) => ({
  id: c.bigint().autoIncrement(),
  name: c.varchar(100),
  price: c.decimal(10, 2),
  description: c.text().nullable(),
  isActive: c.boolean().default(true),
  createdAt: c.datetime(),
}))
```

---

## IndexBuilder

Index definition builder used within `TableBuilder.indexes()`.

```typescript
class IndexBuilder<TKeys extends string[]> {
  readonly meta: {
    columns: TKeys;
    name?: string;
    unique?: boolean;
    orderBy?: { [K in keyof TKeys]: "ASC" | "DESC" };
    description?: string;
  };

  name(name: string): IndexBuilder<TKeys>;
  unique(): IndexBuilder<TKeys>;
  orderBy(...orderBy: { [K in keyof TKeys]: "ASC" | "DESC" }): IndexBuilder<TKeys>;
  description(description: string): IndexBuilder<TKeys>;
}
```

## createIndexFactory

```typescript
function createIndexFactory<TColumnKey extends string>(): {
  index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys>;
};
```

**Example:**

```typescript
Table("User")
  .columns((c) => ({ id: c.bigint(), email: c.varchar(200), name: c.varchar(100) }))
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "email").orderBy("ASC", "DESC"),
    i.index("email").name("IX_User_Email"),
  ]);
```

---

## Relation Builders

### ForeignKeyBuilder

N:1 FK relation that creates a DB constraint.

```typescript
class ForeignKeyBuilder<TOwner extends TableBuilder<any, any>, TTargetFn extends () => TableBuilder<any, any>> {
  readonly meta: {
    ownerFn: () => TOwner;
    columns: string[];
    targetFn: TTargetFn;
    description?: string;
  };

  description(desc: string): ForeignKeyBuilder<TOwner, TTargetFn>;
}
```

### ForeignKeyTargetBuilder

1:N FK reverse-reference. Loaded as array by default; call `.single()` for 1:1.

```typescript
class ForeignKeyTargetBuilder<TTargetTableFn extends () => TableBuilder<any, any>, TIsSingle extends boolean> {
  readonly meta: {
    targetTableFn: TTargetTableFn;
    relationName: string;
    description?: string;
    isSingle?: TIsSingle;
  };

  description(desc: string): ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle>;
  single(): ForeignKeyTargetBuilder<TTargetTableFn, true>;
}
```

### RelationKeyBuilder

N:1 logical relation (no DB FK constraint). Can be used in Views.

```typescript
class RelationKeyBuilder<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
> {
  readonly meta: {
    ownerFn: () => TOwner;
    columns: string[];
    targetFn: TTargetFn;
    description?: string;
  };

  description(desc: string): RelationKeyBuilder<TOwner, TTargetFn>;
}
```

### RelationKeyTargetBuilder

1:N logical reverse-reference (no DB FK constraint). Can be used in Views.

```typescript
class RelationKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TIsSingle extends boolean,
> {
  readonly meta: {
    targetTableFn: TTargetTableFn;
    relationName: string;
    description?: string;
    isSingle?: TIsSingle;
  };

  description(desc: string): RelationKeyTargetBuilder<TTargetTableFn, TIsSingle>;
  single(): RelationKeyTargetBuilder<TTargetTableFn, true>;
}
```

### createRelationFactory

```typescript
function createRelationFactory<TOwner, TColumnKey extends string>(
  ownerFn: () => TOwner,
): TOwner extends TableBuilder<any, any>
  ? RelationFkFactory & RelationRkFactory   // Tables get both FK and RK
  : RelationRkFactory;                      // Views get only RK
```

Factory methods:
- `foreignKey(columns, targetFn)` -- N:1 FK (table only)
- `foreignKeyTarget(targetTableFn, relationName)` -- 1:N FK reverse-reference (table only)
- `relationKey(columns, targetFn)` -- N:1 logical relation
- `relationKeyTarget(targetTableFn, relationName)` -- 1:N logical reverse-reference

**Example:**

```typescript
const Post = Table("Post")
  .columns((c) => ({ id: c.bigint().autoIncrement(), authorId: c.bigint() }))
  .primaryKey("id")
  .relations((r) => ({
    author: r.foreignKey(["authorId"], () => User),
  }));

const User = Table("User")
  .columns((c) => ({ id: c.bigint().autoIncrement(), name: c.varchar(100) }))
  .primaryKey("id")
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "author"),
    profile: r.foreignKeyTarget(() => Profile, "user").single(),
  }));
```

---

## _Migration

Built-in system migration table. Automatically included by `defineDbContext`.

```typescript
const _Migration = Table("_migration")
  .columns((c) => ({ code: c.varchar(255) }))
  .description("System Migration Table")
  .primaryKey("code");
```

---

## Type Inference Utilities

| Type | Description |
|------|-------------|
| `ColumnBuilderRecord` | `Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>` |
| `InferColumns<T>` | Map column builders to value types (`{ id: number; name: string; ... }`) |
| `InferInsertColumns<T>` | Required columns + Partial optional columns (autoIncrement/nullable/default are optional) |
| `InferUpdateColumns<T>` | All columns Partial |
| `InferColumnExprs<T>` | Map column builders to `ExprInput` types |
| `RelationBuilderRecord` | Record of FK/FKT/RK/RKT builders |
| `InferDeepRelations<T>` | Deep relation type inference (all relations optional) |
