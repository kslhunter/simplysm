# @simplysm/orm-common

플랫폼 중립적인 ORM 핵심 모듈. 스키마 정의, 타입 안전한 쿼리 빌더, DDL 관리, MySQL/PostgreSQL/MSSQL 방언 지원.

## 설치

```bash
npm install @simplysm/orm-common
```

**의존성:** `@simplysm/core-common`

## 문서

| 카테고리 | 설명 |
|---------|------|
| [스키마 정의](docs/schema.md) | Table, View, Procedure, Column, Relation, Index 빌더 |
| [쿼리 & 표현식](docs/query.md) | Queryable, Executable, expr 표현식 빌더 |
| [DDL & 초기화](docs/ddl.md) | DDL 메서드, 스키마 초기화, 마이그레이션 |

## 빠른 시작

### DbContext 정의

```typescript
import { defineDbContext, createDbContext, Table, expr } from "@simplysm/orm-common";

// 테이블 정의
const User = Table("user")
  .columns((c) => ({
    id: c.int().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()]);

const Order = Table("order")
  .columns((c) => ({
    id: c.int().autoIncrement(),
    userId: c.int(),
    amount: c.decimal(10, 2),
  }))
  .primaryKey("id")
  .relations((r) => ({
    user: r.foreignKey(["userId"], () => User),
  }));

// DbContext 정의 (스키마 블루프린트)
const MyDb = defineDbContext({
  tables: { user: User, order: Order },
});

// DbContext 인스턴스 생성 (런타임)
const db = createDbContext(MyDb, executor, { database: "mydb" });
```

### 쿼리 실행

```typescript
await db.connect(async () => {
  // SELECT
  const users = await db.user()
    .where((c) => [expr.eq(c.name, "Alice")])
    .orderBy((c) => c.createdAt, "DESC")
    .execute();

  // JOIN (관계 기반)
  const orders = await db.order()
    .include((c) => c.user)
    .where((c) => [expr.gt(c.amount, 100)])
    .execute();

  // 집계
  const stats = await db.order()
    .select((c) => ({
      userId: c.userId,
      total: expr.sum(c.amount),
      count: expr.count(),
    }))
    .groupBy((c) => [c.userId])
    .execute();

  // INSERT
  await db.user().insert([{ name: "Bob", email: "bob@example.com", createdAt: new DateTime() }]);

  // INSERT 후 ID 반환
  const [inserted] = await db.user().insert(
    [{ name: "Charlie", createdAt: new DateTime() }],
    ["id"],
  );

  // UPDATE
  await db.user()
    .where((c) => [expr.eq(c.id, 1)])
    .update((c) => ({ name: expr.val("string", "Alice2") }));

  // DELETE
  await db.user()
    .where((c) => [expr.eq(c.id, 1)])
    .delete();
});
```

### 지원 방언

| 방언 | 값 | 최소 버전 |
|------|-----|----------|
| MySQL | `"mysql"` | 8.0.14+ |
| MSSQL | `"mssql"` | 2012+ |
| PostgreSQL | `"postgresql"` | 9.0+ |
