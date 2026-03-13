# @simplysm/sd-orm-common

Platform-neutral ORM module providing decorators, query building, queryable API, and database context management. Supports MSSQL, MySQL, and SQLite dialects.

## Installation

```bash
npm install @simplysm/sd-orm-common
```

**Peer dependency:** `@simplysm/sd-core-common`

## Documentation

| Category | File | Description |
|---|---|---|
| Decorators | [docs/decorators.md](docs/decorators.md) | Table, Column, ForeignKey, Index, and other model decorators |
| DbContext | [docs/db-context.md](docs/db-context.md) | Abstract database context for connection, transaction, and schema management |
| Queryable | [docs/queryable.md](docs/queryable.md) | Fluent query API for select, insert, update, delete, join, and more |
| QueryHelper | [docs/query-helper.md](docs/query-helper.md) | SQL expression helpers for where clauses, aggregations, and field operations |
| QueryBuilder | [docs/query-builder.md](docs/query-builder.md) | Low-level SQL string generation from query definition objects |
| Types | [docs/types.md](docs/types.md) | Type definitions for data types, table definitions, query definitions, and entities |
| Utilities | [docs/utilities.md](docs/utilities.md) | DbDefUtils, SdOrmUtils, and other helper classes |

## Quick Start

### Define a Model

```typescript
import { Table, Column, ForeignKey, Index } from "@simplysm/sd-orm-common";

@Table({ description: "Employee" })
class Employee {
  @Column({ primaryKey: 1, autoIncrement: true, description: "ID" })
  id!: number;

  @Column({ description: "Name" })
  name!: string;

  @Column({ description: "Department ID" })
  departmentId!: number;

  @Index()
  @Column({ nullable: true, description: "Email" })
  email?: string;

  @ForeignKey(["departmentId"], () => Department, "Department FK")
  department?: Department;
}
```

### Query Data

```typescript
// Select with where, orderBy, and projection
const results = await db.employee
  .where((e) => [db.qh.equal(e.name, "John")])
  .orderBy((e) => e.name)
  .select((e) => ({ id: e.id, name: e.name }))
  .resultAsync();

// Join
const joined = await db.employee
  .include((e) => e.department)
  .resultAsync();

// Insert
await db.employee.insertAsync([{ name: "Alice", departmentId: 1 }]);

// Update
await db.employee
  .where((e) => [db.qh.equal(e.id, 1)])
  .updateAsync(() => ({ name: "Bob" }));

// Delete
await db.employee
  .where((e) => [db.qh.equal(e.id, 1)])
  .deleteAsync();
```

### Connect and Transact

```typescript
await db.connectAsync(async () => {
  // All operations here run within a transaction
  await db.employee.insertAsync([{ name: "Charlie", departmentId: 2 }]);
  await db.employee
    .where((e) => [db.qh.equal(e.name, "Charlie")])
    .updateAsync(() => ({ departmentId: 3 }));
});
```
