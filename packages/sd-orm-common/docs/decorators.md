# Decorators

Model decorators for defining database table schema via TypeScript classes. All decorators store metadata using `Reflect.defineMetadata`, which is read at runtime by `DbDefUtils`.

**Source:** `src/decorators.ts`

## Table

Class decorator that marks a class as a database table, view, or stored procedure.

```typescript
function Table<T>(def: {
  description: string;
  database?: string;
  schema?: string;
  name?: string;
  view?: (db: any) => Queryable<DbContext, any>;
  procedure?: string;
}): TClassDecoratorReturn<T>
```

### Parameter Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string` | Human-readable description of the table |
| `database` | `string \| undefined` | Override database name (defaults to `DbContext.opt.database`) |
| `schema` | `string \| undefined` | Override schema name (defaults to `DbContext.opt.schema`) |
| `name` | `string \| undefined` | Override table name (defaults to the class name) |
| `view` | `((db: any) => Queryable<DbContext, any>) \| undefined` | If provided, defines this as a view backed by the queryable |
| `procedure` | `string \| undefined` | If provided, defines this as a stored procedure with the given body |

**Example:**

```typescript
@Table({ description: "Employee" })
class Employee { /* ... */ }

@Table({
  description: "Sales summary view",
  name: "v_sales_summary",
  view: (db) => db.sale.select((e) => ({ total: db.qh.sum(e.amount) })),
})
class SalesSummary { /* ... */ }
```

## Column

Property decorator that defines a column on the table.

```typescript
function Column<T extends object>(columnDef: {
  description: string;
  name?: string;
  dataType?: TSdOrmDataType;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
}): TPropertyDecoratorReturn<T>
```

### Parameter Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | `string` | Human-readable description of the column |
| `name` | `string \| undefined` | Override column name (defaults to the property key) |
| `dataType` | `TSdOrmDataType \| undefined` | Override the auto-detected data type (e.g., `{ type: "DECIMAL", precision: 10, digits: 2 }`) |
| `nullable` | `boolean \| undefined` | Whether the column allows NULL values (default: `false`) |
| `autoIncrement` | `boolean \| undefined` | Whether the column auto-increments |
| `primaryKey` | `number \| undefined` | Primary key order (1-based). Columns with this field form the composite primary key |

The TypeScript property type is automatically resolved via `Reflect.getMetadata("design:type", ...)` and used for SQL type mapping. Use `dataType` to override.

**Example:**

```typescript
@Column({ primaryKey: 1, autoIncrement: true, description: "ID" })
id!: number;

@Column({ description: "Price", dataType: { type: "DECIMAL", precision: 10, digits: 2 } })
price!: number;

@Column({ nullable: true, description: "Note", dataType: { type: "TEXT" } })
note?: string;
```

## ForeignKey

Property decorator that defines a foreign key relationship to another table. Creates a database-level FK constraint and an associated index.

```typescript
function ForeignKey<T>(
  columnNames: (keyof T)[],
  targetTypeFwd: () => Type<any>,
  description: string,
): TPropertyDecoratorReturn<Partial<T>>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `columnNames` | `(keyof T)[]` | Local column property keys forming the foreign key |
| `targetTypeFwd` | `() => Type<any>` | Forward reference returning the target table class |
| `description` | `string` | Description of the relationship |

**Example:**

```typescript
@ForeignKey(["departmentId"], () => Department, "Department FK")
department?: Department;
```

## ForeignKeyTarget

Property decorator on the target (parent) side of a foreign key, defining the reverse navigation property.

```typescript
function ForeignKeyTarget<T extends object, P>(
  sourceTypeFwd: () => Type<P>,
  foreignKeyPropertyKey: keyof P,
  description: string,
  multiplicity?: "single",
): TPropertyDecoratorReturn<T>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourceTypeFwd` | `() => Type<P>` | Forward reference returning the source (child) table class |
| `foreignKeyPropertyKey` | `keyof P` | The FK property key on the source class |
| `description` | `string` | Description of the relationship |
| `multiplicity` | `"single" \| undefined` | If `"single"`, the navigation is a single object; otherwise an array |

**Example:**

```typescript
// One department has many employees
@ForeignKeyTarget(() => Employee, "department", "Employees in this department")
employees?: Employee[];

// One-to-one reverse navigation
@ForeignKeyTarget(() => EmployeeDetail, "employee", "Employee detail", "single")
detail?: EmployeeDetail;
```

## Index

Property decorator that defines an index on a column.

```typescript
function Index<T extends object>(def?: {
  name?: string;
  order?: number;
  orderBy?: "ASC" | "DESC";
  unique?: boolean;
}): TPropertyDecoratorReturn<T>
```

### Parameter Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string \| undefined` | Index name (defaults to the property key). Use the same name on multiple columns for composite indexes |
| `order` | `number \| undefined` | Column order within a composite index (default: `1`) |
| `orderBy` | `"ASC" \| "DESC" \| undefined` | Sort direction (default: `"ASC"`) |
| `unique` | `boolean \| undefined` | Whether the index enforces uniqueness (default: `false`) |

**Example:**

```typescript
// Simple index
@Index()
@Column({ description: "Email" })
email!: string;

// Composite unique index
@Index({ name: "IX_name_dept", order: 1, unique: true })
@Column({ description: "Name" })
name!: string;

@Index({ name: "IX_name_dept", order: 2, unique: true })
@Column({ description: "Department ID" })
departmentId!: number;
```

## ReferenceKey

Property decorator that defines a reference key relationship -- a logical foreign key without database-level constraint enforcement. Same API as `ForeignKey`, but no FK constraint is created in the database schema.

```typescript
function ReferenceKey<T>(
  columnNames: (keyof T)[],
  targetTypeFwd: () => Type<any>,
  description: string,
): TPropertyDecoratorReturn<Partial<T>>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `columnNames` | `(keyof T)[]` | Local column property keys forming the reference key |
| `targetTypeFwd` | `() => Type<any>` | Forward reference returning the target table class |
| `description` | `string` | Description of the relationship |

## ReferenceKeyTarget

Property decorator on the target side of a reference key (reverse navigation without FK constraint). Same API as `ForeignKeyTarget`.

```typescript
function ReferenceKeyTarget<T extends object, P>(
  sourceTypeFwd: () => Type<P>,
  referenceKeyPropertyKey: keyof P,
  description: string,
  multiplicity?: "single",
): TPropertyDecoratorReturn<T>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `sourceTypeFwd` | `() => Type<P>` | Forward reference returning the source table class |
| `referenceKeyPropertyKey` | `keyof P` | The reference key property key on the source class |
| `description` | `string` | Description of the relationship |
| `multiplicity` | `"single" \| undefined` | If `"single"`, the navigation is a single object; otherwise an array |
