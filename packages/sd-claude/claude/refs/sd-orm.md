# ORM Guidelines

## Table Definition
```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({ id: c.bigint().autoIncrement(), name: c.varchar(100) }))
  .primaryKey("id");
```

## SQL Injection Prevention
ORM uses string escaping (not parameter binding). **Always validate user input before ORM queries.**
```typescript
const userId = Number(req.query.id);
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
```
