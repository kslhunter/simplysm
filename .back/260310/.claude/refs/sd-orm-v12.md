# ORM Guidelines (v12)

## Table Definition — Decorator-based

```typescript
@Table({ description: "Users", database: "mydb" })
export class User {
  @Column({ primaryKey: 1, autoIncrement: true, description: "ID" })
  id!: number;

  @Column({ dataType: { type: "STRING", length: 100 }, description: "Name" })
  name!: string;

  @Column({ nullable: true, description: "Email" })
  email?: string;

  @ForeignKey(["departmentId"], () => Department, "Department")
  department?: Department;

  @ForeignKeyTarget(() => Order, "user", "Orders")
  orders?: Order[];
}
```

### Decorators

- `@Table({ description, database?, schema?, name?, view?, procedure? })` — define table/view/procedure
- `@Column({ description, name?, dataType?, nullable?, autoIncrement?, primaryKey? })` — define column
- `@ForeignKey(columnNames, targetTypeFwd, description)` — FK relationship
- `@ForeignKeyTarget(sourceTypeFwd, fkPropertyKey, description, multiplicity?)` — FK reverse relationship
- `@ReferenceKey(columnNames, targetTypeFwd, description)` — reference relationship
- `@ReferenceKeyTarget(sourceTypeFwd, refKeyPropertyKey, description, multiplicity?)` — reference reverse relationship
- `@Index({ name?, order?, orderBy?, unique? })` — index

### Requirements

- `tsconfig` requires `experimentalDecorators: true` and `emitDecoratorMetadata: true`

## DbContext

```typescript
export abstract class MyDbContext extends DbContext {
  user = new Queryable(this, User);
  order = new Queryable(this, Order);

  get migrations(): Type<IDbMigration>[] {
    return [Migration001, Migration002];
  }
}
```

## Query

```typescript
// Select
const users = await db.user
  .select((item) => ({ id: item.id, name: item.name }))
  .where((item) => [db.qh.equal(item.id, userId)])
  .resultAsync();

// Insert
await db.user.insertAsync([{ name: "John Doe" }]);

// Connect with transaction
await db.connectAsync(async () => {
  await db.user.insertAsync([{ name: "John Doe" }]);
});
```

## SQL Injection Prevention

ORM uses string escaping (not parameter binding). **Always validate user input before ORM queries.**

```typescript
const userId = Number(req.query.id);
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user
  .select((item) => ({ id: item.id, name: item.name }))
  .where((item) => [db.qh.equal(item.id, userId)])
  .resultAsync();
```
