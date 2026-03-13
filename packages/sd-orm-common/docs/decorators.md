# Decorators

Model decorators for defining database table schema via TypeScript classes. All decorators store metadata using `Reflect.defineMetadata`, which is read at runtime by `DbDefUtils`.

**Source:** `src/decorators.ts`

## Table

Class decorator that marks a class as a database table (or view/stored procedure).

```typescript
function Table<T>(def: {
  description: string;
  database?: string;
  schema?: string;
  name?: string;                                  // Defaults to the class name
  view?: (db: any) => Queryable<DbContext, any>;  // Define as a view instead of a table
  procedure?: string;                             // Define as a stored procedure
}): TClassDecoratorReturn<T>
```

**Example:**

```typescript
@Table({ description: "Employee" })
class Employee { /* ... */ }

@Table({ description: "Sales summary", database: "analytics", schema: "dbo", name: "v_sales_summary",
  view: (db) => db.sale.select((e) => ({ total: db.qh.sum(e.amount) }))
})
class SalesSummary { /* ... */ }
```

## Column

Property decorator that defines a column on the table.

```typescript
function Column<T extends object>(columnDef: {
  description: string;
  name?: string;                  // Defaults to the property key
  dataType?: TSdOrmDataType;      // Override the auto-detected data type
  nullable?: boolean;             // Default: false (NOT NULL)
  autoIncrement?: boolean;        // Auto-increment column
  primaryKey?: number;            // Primary key order (1-based)
}): TPropertyDecoratorReturn<T>
```

The TypeScript property type is automatically resolved via `Reflect.getMetadata("design:type", ...)` and used for SQL type mapping. Use `dataType` to override with a specific `TSdOrmDataType` (e.g., `{ type: "DECIMAL", precision: 10, digits: 2 }`).

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

Property decorator that defines a foreign key relationship to another table.

```typescript
function ForeignKey<T>(
  columnNames: (keyof T)[],             // Local columns forming the FK
  targetTypeFwd: () => Type<any>,       // Forward reference to the target table class
  description: string,
): TPropertyDecoratorReturn<Partial<T>>
```

**Example:**

```typescript
@ForeignKey(["departmentId"], () => Department, "Department FK")
department?: Department;
```

## ForeignKeyTarget

Property decorator on the **target** (parent) side of a foreign key, defining the reverse navigation.

```typescript
function ForeignKeyTarget<T extends object, P>(
  sourceTypeFwd: () => Type<P>,           // Forward reference to the source (child) table class
  foreignKeyPropertyKey: keyof P,         // The FK property key on the source class
  description: string,
  multiplicity?: "single",                // If "single", the navigation is a single object; otherwise an array
): TPropertyDecoratorReturn<T>
```

**Example:**

```typescript
// On Department class - one department has many employees
@ForeignKeyTarget(() => Employee, "department", "Employees in this department")
employees?: Employee[];

// Single reverse navigation
@ForeignKeyTarget(() => EmployeeDetail, "employee", "Employee detail", "single")
detail?: EmployeeDetail;
```

## Index

Property decorator that defines an index on a column.

```typescript
function Index<T extends object>(def?: {
  name?: string;              // Index name; defaults to the property key
  order?: number;             // Column order within a composite index (default: 1)
  orderBy?: "ASC" | "DESC";  // Sort direction (default: "ASC")
  unique?: boolean;           // Unique index (default: false)
}): TPropertyDecoratorReturn<T>
```

For composite indexes, use the same `name` on multiple columns with different `order` values.

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

Property decorator that defines a reference key relationship (a logical foreign key without database-level constraint enforcement).

```typescript
function ReferenceKey<T>(
  columnNames: (keyof T)[],
  targetTypeFwd: () => Type<any>,
  description: string,
): TPropertyDecoratorReturn<Partial<T>>
```

Usage is identical to `ForeignKey`, but no FK constraint is created in the database.

## ReferenceKeyTarget

Property decorator on the target side of a reference key (reverse navigation without FK constraint).

```typescript
function ReferenceKeyTarget<T extends object, P>(
  sourceTypeFwd: () => Type<P>,
  referenceKeyPropertyKey: keyof P,
  description: string,
  multiplicity?: "single",
): TPropertyDecoratorReturn<T>
```

Usage is identical to `ForeignKeyTarget`.
