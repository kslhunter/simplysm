# ORM Guidelines (v12)

## Table Definition — Decorator 기반

```typescript
@Table({ description: "사용자", database: "mydb" })
export class User {
  @Column({ primaryKey: 1, autoIncrement: true, description: "ID" })
  id!: number;

  @Column({ dataType: { type: "STRING", length: 100 }, description: "이름" })
  name!: string;

  @Column({ nullable: true, description: "이메일" })
  email?: string;

  @ForeignKey(["departmentId"], () => Department, "부서")
  department?: Department;

  @ForeignKeyTarget(() => Order, "user", "주문 목록")
  orders?: Order[];
}
```

### Decorators

- `@Table({ description, database?, schema?, name?, view?, procedure? })` — 테이블/뷰/프로시저 정의
- `@Column({ description, name?, dataType?, nullable?, autoIncrement?, primaryKey? })` — 컬럼 정의
- `@ForeignKey(columnNames, targetTypeFwd, description)` — FK 관계
- `@ForeignKeyTarget(sourceTypeFwd, fkPropertyKey, description, multiplicity?)` — FK 역방향
- `@ReferenceKey(columnNames, targetTypeFwd, description)` — 참조 관계
- `@ReferenceKeyTarget(sourceTypeFwd, refKeyPropertyKey, description, multiplicity?)` — 참조 역방향
- `@Index({ name?, order?, orderBy?, unique? })` — 인덱스

### 요구사항

- `tsconfig`에 `experimentalDecorators: true`, `emitDecoratorMetadata: true` 필요

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
await db.user.insertAsync([{ name: "홍길동" }]);

// Connect with transaction
await db.connectAsync(async () => {
  await db.user.insertAsync([{ name: "홍길동" }]);
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
