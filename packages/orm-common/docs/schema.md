# 스키마 정의

## Table

불변 빌더 패턴으로 테이블을 정의한다. 모든 메서드는 새 인스턴스를 반환한다.

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("user")
  .description("사용자 테이블")
  .database("mydb")           // 선택
  .schema("dbo")              // MSSQL/PostgreSQL, 선택
  .columns((c) => ({
    id: c.int().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    role: c.varchar(20).default("user"),
    bio: c.text().nullable(),
    avatar: c.binary().nullable(),
    score: c.decimal(10, 2).nullable(),
    active: c.boolean().default(true),
    birthday: c.date().nullable(),
    loginTime: c.time().nullable(),
    createdAt: c.datetime(),
    externalId: c.uuid().nullable(),
  }))
  .primaryKey("id")                          // 복합 PK 지원: .primaryKey("col1", "col2")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "role").orderBy("ASC", "DESC"),
    i.index("createdAt").name("ix_created"),
  ])
  .relations((r) => ({
    orders: r.foreignKeyTarget(() => Order, "user"),  // 1:N
    profile: r.foreignKeyTarget(() => Profile, "user").single(), // 1:1
  }));
```

### Table API

```
Table(name: string): TableBuilder
```

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `description` | `(desc: string) => TableBuilder` | 테이블 설명 (DDL 코멘트) |
| `database` | `(db: string) => TableBuilder` | 데이터베이스 이름 |
| `schema` | `(schema: string) => TableBuilder` | 스키마 이름 (MSSQL: dbo, PostgreSQL: public) |
| `columns` | `(fn: (c) => Record) => TableBuilder` | 컬럼 정의 |
| `primaryKey` | `(...columns: string[]) => TableBuilder` | PK 설정 (복합 PK 지원) |
| `indexes` | `(fn: (i) => IndexBuilder[]) => TableBuilder` | 인덱스 정의 |
| `relations` | `(fn: (r) => Record) => TableBuilder` | 관계 정의 |

### 컬럼 타입

| 메서드 | SQL 타입 | TypeScript 타입 |
|--------|---------|----------------|
| `c.int()` | INT | `number` |
| `c.bigint()` | BIGINT | `number` |
| `c.float()` | FLOAT | `number` |
| `c.double()` | DOUBLE | `number` |
| `c.decimal(p, s?)` | DECIMAL(p,s) | `number` |
| `c.varchar(len)` | VARCHAR(len) | `string` |
| `c.char(len)` | CHAR(len) | `string` |
| `c.text()` | LONGTEXT/TEXT | `string` |
| `c.boolean()` | BIT/TINYINT(1) | `boolean` |
| `c.datetime()` | DATETIME | `DateTime` |
| `c.date()` | DATE | `DateOnly` |
| `c.time()` | TIME | `Time` |
| `c.binary()` | LONGBLOB/VARBINARY/BYTEA | `Bytes` |
| `c.uuid()` | UNIQUEIDENTIFIER/UUID | `Uuid` |

### 컬럼 수정자

```typescript
c.int().autoIncrement()     // 자동 증가 (INSERT 시 선택적)
c.varchar(100).nullable()   // NULL 허용 (타입에 undefined 추가)
c.varchar(20).default("x")  // 기본값 (INSERT 시 선택적)
c.varchar(100).description("설명")
```

### 타입 추론

```typescript
User.$inferSelect   // { id: number; name: string; email: string | undefined; ... }
User.$inferInsert   // { name: string; createdAt: DateTime; } & { id?: number; email?: string; ... }
User.$inferUpdate   // { id?: number; name?: string; ... } (모든 필드 선택적)
User.$inferColumns  // { id: number; name: string; email: string | undefined; ... } (관계 제외)
```

---

## 관계 (Relation)

### foreignKey -- N:1 (DB FK 생성)

```typescript
const Order = Table("order")
  .columns((c) => ({
    id: c.int().autoIncrement(),
    userId: c.int(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    user: r.foreignKey(["userId"], () => User),  // Order.userId -> User.id
  }));
```

### foreignKeyTarget -- 1:N / 1:1 (역참조)

```typescript
const User = Table("user")
  .columns((c) => ({ id: c.int().autoIncrement(), name: c.varchar(100) }))
  .primaryKey("id")
  .relations((r) => ({
    orders: r.foreignKeyTarget(() => Order, "user"),          // 1:N (배열)
    profile: r.foreignKeyTarget(() => Profile, "user").single(), // 1:1 (단일 객체)
  }));
```

### relationKey / relationKeyTarget -- 논리적 관계 (DB FK 없음)

View에서도 사용 가능. DB에 FK 제약조건을 생성하지 않는다.

```typescript
.relations((r) => ({
  category: r.relationKey(["categoryId"], () => Category),
  items: r.relationKeyTarget(() => Item, "parent"),
}))
```

### 관계 빌더 API

| 빌더 | 용도 | DB FK 생성 |
|------|------|----------|
| `ForeignKeyBuilder` | N:1 관계 (FK 컬럼 소유) | O |
| `ForeignKeyTargetBuilder` | 1:N / 1:1 역참조 | O (대상 테이블) |
| `RelationKeyBuilder` | N:1 논리적 관계 | X |
| `RelationKeyTargetBuilder` | 1:N / 1:1 논리적 역참조 | X |

공통 메서드:

| 메서드 | 설명 |
|--------|------|
| `.description(desc)` | 관계 설명 |
| `.single()` | 1:1 관계 (ForeignKeyTargetBuilder, RelationKeyTargetBuilder만 해당) |

---

## View

```typescript
import { View, expr } from "@simplysm/orm-common";

const UserSummary = View("user_summary")
  .database("mydb")
  .query<typeof MyDb>((db) =>
    db.user()
      .select((c) => ({
        userId: c.id,
        userName: c.name,
        orderCount: expr.count(),
        totalAmount: expr.sum(c.amount),
      }))
      .groupBy((c) => [c.id, c.name])
  )
  .relations((r) => ({
    user: r.relationKey(["userId"], () => User),
  }));
```

### View API

```
View(name: string): ViewBuilder
```

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `description` | `(desc: string) => ViewBuilder` | 뷰 설명 |
| `database` | `(db: string) => ViewBuilder` | 데이터베이스 이름 |
| `schema` | `(schema: string) => ViewBuilder` | 스키마 이름 |
| `query` | `(viewFn: (db) => Queryable) => ViewBuilder` | 뷰 쿼리 정의 |
| `relations` | `(fn: (r) => Record) => ViewBuilder` | 관계 정의 (relationKey만 가능) |

**DbContext 등록:**

```typescript
const MyDb = defineDbContext({
  tables: { user: User },
  views: { userSummary: UserSummary },
});
```

---

## Procedure

```typescript
import { Procedure } from "@simplysm/orm-common";

const GetUserOrders = Procedure("get_user_orders")
  .database("mydb")
  .params((c) => ({
    userId: c.int(),
    fromDate: c.date().nullable(),
  }))
  .returns((c) => ({
    orderId: c.int(),
    amount: c.decimal(10, 2),
    createdAt: c.datetime(),
  }))
  .body(`
    SELECT id AS orderId, amount, created_at AS createdAt
    FROM orders
    WHERE user_id = userId AND created_at >= COALESCE(fromDate, '1900-01-01')
  `);
```

### Procedure API

```
Procedure(name: string): ProcedureBuilder
```

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `description` | `(desc: string) => ProcedureBuilder` | 프로시저 설명 |
| `database` | `(db: string) => ProcedureBuilder` | 데이터베이스 이름 |
| `schema` | `(schema: string) => ProcedureBuilder` | 스키마 이름 |
| `params` | `(fn: (c) => Record) => ProcedureBuilder` | 파라미터 정의 |
| `returns` | `(fn: (c) => Record) => ProcedureBuilder` | 반환 타입 정의 |
| `body` | `(sql: string) => ProcedureBuilder` | 프로시저 본문 SQL |

**DbContext 등록:**

```typescript
const MyDb = defineDbContext({
  tables: { user: User },
  procedures: { getUserOrders: GetUserOrders },
});
```

MSSQL은 파라미터에 `@` 접두사 필요: `@userId`, `@fromDate`

---

## Index

```typescript
.indexes((i) => [
  i.index("email").unique(),                     // UNIQUE INDEX
  i.index("name", "role").orderBy("ASC", "DESC"), // 정렬 방향 지정
  i.index("createdAt").name("ix_custom_name"),   // 커스텀 이름
  i.index("code").description("코드 인덱스"),
])
```

### IndexBuilder API

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `index` | `(...columns: string[]) => IndexBuilder` | 인덱스 생성 (단일/복합) |
| `unique` | `() => IndexBuilder` | 유니크 인덱스 설정 |
| `orderBy` | `(...dirs: ("ASC"\|"DESC")[]) => IndexBuilder` | 컬럼별 정렬 방향 |
| `name` | `(name: string) => IndexBuilder` | 커스텀 인덱스 이름 |
| `description` | `(desc: string) => IndexBuilder` | 인덱스 설명 |

---

## defineDbContext / createDbContext

### defineDbContext -- 스키마 블루프린트

```typescript
import { defineDbContext } from "@simplysm/orm-common";

const MyDb = defineDbContext({
  tables: { user: User, order: Order },
  views: { userSummary: UserSummary },
  procedures: { getUserOrders: GetUserOrders },
  migrations: [
    {
      name: "20260105_001_add_phone",
      up: async (db) => {
        const c = createColumnFactory();
        await db.addColumn({ name: "user" }, "phone", c.varchar(20).nullable());
      },
    },
  ],
});
```

`_migration` 테이블이 자동으로 포함된다.

### createDbContext -- 런타임 인스턴스 생성

```typescript
import { createDbContext } from "@simplysm/orm-common";

const db = createDbContext(MyDb, executor, {
  database: "mydb",
  schema: "dbo",  // MSSQL/PostgreSQL 선택
});
```

```
createDbContext(
  def: DbContextDef,
  executor: DbContextExecutor,
  opt: { database: string; schema?: string },
): DbContextInstance
```

`executor`는 `DbContextExecutor` 인터페이스를 구현해야 한다 (`@simplysm/orm-node`의 `NodeDbContextExecutor` 등).

생성된 인스턴스는 다음을 포함한다:
- 등록된 테이블/뷰에 대한 `Queryable` 접근자 (예: `db.user()`, `db.order()`)
- 등록된 프로시저에 대한 `Executable` 접근자 (예: `db.getUserOrders()`)
- 연결/트랜잭션 관리 메서드
- DDL 실행 메서드
- `initialize()` 메서드
- `_migration()` 시스템 테이블 접근자
