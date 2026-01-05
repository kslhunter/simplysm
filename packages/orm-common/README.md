# @simplysm/orm-common

TypeScript 기반의 타입 안전한 ORM 라이브러리입니다. 데이터베이스 독립적인 쿼리 정의(QueryDef)를 생성하고, 이를 Dialect별 SQL로 변환하는 완전한 ORM 솔루션을 제공합니다.

## 주요 특징

- **타입 안전성**: TypeScript의 강력한 타입 시스템을 활용한 컴파일 타임 검증
- **Multi-Dialect 지원**: MySQL, MSSQL, PostgreSQL 3개 데이터베이스 지원
- **Code First 방식**: 코드로 스키마를 정의하고 마이그레이션 자동화
- **AST 기반 쿼리 빌드**: SQL 문자열이 아닌 JSON AST로 쿼리 표현
- **Fluent API**: LINQ-like API로 직관적인 쿼리 작성
- **SQL Injection 자동 방지**: 모든 값이 자동으로 파라미터화되며, 식별자는 `escapeString`으로 안전하게 처리

## 아키텍처

```
[브라우저]                                    [서버]
┌───────────────────────┐                   ┌──────────────┐
│ Queryable + expr      │ ──→ QueryDef ──→  │ QueryBuilder │ → SQL
│   (사용자 API)         │    (JSON 전송)     │  (렌더링)     │
└───────────────────────┘                   └──────────────┘
```

**핵심 설계**: 사용자 API(Queryable/expr)는 100% DB 독립적이며, QueryBuilder에서만 Dialect별 SQL을 생성합니다.

## 지원 데이터베이스

- MySQL 8.0.14+
- MSSQL 2012+ (SQL Server)
- PostgreSQL 9.0+

## Database/Schema 네이밍

DBMS별로 네임스페이스 구조가 다르므로 주의가 필요합니다:

| DBMS | Connection | 테이블 참조 | SimplySM 파라미터 |
|------|-----------|-----------|------------------|
| **MySQL** | database 연결 | `database.table` | `database` (schema 무시) |
| **MSSQL** | database 연결 | `database.schema.table` | `database` + `schema` (기본: dbo) |
| **PostgreSQL** | database 연결 | `schema.table` | `schema` (기본: public), database는 connection |

### 사용 예시

```typescript
// PostgreSQL - schema만 SQL에 포함
const User = new TableBuilder({
  name: "User",
  database: "mydb",      // connection용
  schema: "myschema"     // SQL용
});
// SQL: "myschema"."User"

// MSSQL - database + schema 모두 포함
const User = new TableBuilder({
  name: "User",
  database: "TestDb",
  schema: "custom"       // 기본: dbo
});
// SQL: [TestDb].[custom].[User]

// MySQL - database만 포함
const User = new TableBuilder({
  name: "User",
  database: "TestDb"     // schema 무시됨
});
// SQL: `TestDb`.`User`
```

## 설치

```bash
yarn add @simplysm/orm-common
```

## 추천 대상

✅ **추천하는 경우:**
- TypeScript를 깊이 활용하는 팀
- 타입 안전성을 중요시하는 프로젝트
- Multi-Database 지원이 필요한 애플리케이션
- Code First 방식을 선호하는 개발자

❌ **비추천하는 경우:**
- TypeScript 초보자
- 단순한 CRUD만 필요한 프로젝트
- 레거시 DB 마이그레이션 (DB First 방식 필요)

---

## Part 1: 쿼리 정의 (QueryDef) 생성

### 1. Table 정의

> 참고: [tests/setup/models/](./tests/setup/models/)

### 2. View 정의

> 참고: [tests/setup/views/](./tests/setup/views/)

### 3. Procedure 정의

Stored Procedure는 params와 returns를 정의하면 자동으로 DBMS별 파라미터/반환 SQL을 생성합니다.

```typescript
import { Procedure, Column } from "@simplysm/orm-common";

export const GetUserById = Procedure("GetUserById")
  .database("MyDb")
  .schema("TestSchema")
  .params((c) => ({
    userId: c.bigint(),
  }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .body(`
    -- MySQL
    SELECT id, name, email FROM User WHERE id = userId;

    -- MSSQL
    SELECT id, name, email FROM [User] WHERE id = @userId;

    -- PostgreSQL
    RETURN QUERY SELECT id, name, email FROM "User" WHERE id = userId;
  `);
```

**주의사항:**
- body는 DBMS별로 직접 작성해야 합니다 (변수명 차이: `userId` vs `@userId`)
- PostgreSQL은 `RETURN QUERY` 필요

> 참고: [tests/setup/procedure/](./tests/setup/procedure/)

### 4. DbContext 정의

> 참고: [tests/setup/TestDbContext.ts](./tests/setup/TestDbContext.ts)

---

## SELECT 쿼리

> 참고: [tests/select/](./tests/select/)

- 기본 SELECT, 컬럼 선택, 표현식
- WHERE 조건 (eq, ne, gt, lt, like, in, between, isNull 등)
- JOIN (left, inner, joinSingle)
- GROUP BY / HAVING
- ORDER BY / LIMIT
- Window 함수 (rowNumber, rank, denseRank, sum over 등)
- Subquery (서브쿼리 in SELECT/WHERE, EXISTS, wrap, union)
- 재귀 CTE
- View

---

## DML

> 참고: [tests/dml/](./tests/dml/)

- INSERT / UPDATE / DELETE / UPSERT

---

## DDL

> 참고: [tests/ddl/](./tests/ddl/)

---

## Procedure 실행

> 참고: [tests/executable/](./tests/executable/)

---

## 고급 예제

> 참고: [tests/examples/](./tests/examples/)

- Pivot (행 → 열 변환)
- Unpivot (열 → 행 변환)
- Sampling (랜덤 샘플링, 그룹별 Top N)

---

## Part 2: SQL 변환 (QueryBuilder)

QueryDef를 SQL 문자열로 변환합니다. Dialect별로 다른 SQL 문법을 생성합니다.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const db = new MyDbContext(executor);
const def = db.user.where((u) => [expr.eq(u.isActive, true)]).getSelectQueryDef();

// MySQL
const mysqlBuilder = createQueryBuilder("mysql");
const mysqlSql = mysqlBuilder.build(def);
// → SELECT * FROM `MyDb`.`User` AS `T1` WHERE `T1`.`isActive` <=> TRUE

// MSSQL
const mssqlBuilder = createQueryBuilder("mssql");
const mssqlSql = mssqlBuilder.build(def);
// → SELECT * FROM [MyDb].[dbo].[User] AS [T1] WHERE (([T1].[isActive] IS NULL AND @P1 IS NULL) OR [T1].[isActive] = @P1)

// PostgreSQL
const pgsqlBuilder = createQueryBuilder("postgresql");
const pgsqlSql = pgsqlBuilder.build(def);
// → SELECT * FROM "MyDb"."public"."User" AS "T1" WHERE (("T1"."isActive" IS NULL AND $1 IS NULL) OR "T1"."isActive" = $1)
```

---

## Migration

Migration은 데이터베이스 스키마 변경을 버전 관리하는 방법입니다.

### Migration 정의

`migrations/migration_20240101_1.ts`

```typescript
import { Migration } from "@simplysm/orm-common";

export const migration_20240101_1: Migration = {
  name: "2024-01-01_add_user_phone",
  up: async (db) => {
    await db.addColumnAsync(
      { database: "MyDb", name: "User" },
      "phone",
      Column.varchar(20).nullable(),
    );
  },
};
```

`migrations/migration_20240101_2.ts`

```typescript
import { Migration } from "@simplysm/orm-common";

export const migration_20240101_2: Migration = {
  name: "2024-01-15_add_user_index",
  up: async (db) => {
    await db.addIdxAsync(User.meta, Index.columns("email").unique());
  },
};
```

`migrations/migration_20240102_1.ts`

```typescript
import { Migration } from "@simplysm/orm-common";

export const migration_20240102_1: Migration = {
  name: "2024-02-01_create_order_table",
  up: async (db) => {
    await db.createTableAsync(Order);
  },
};
```

### DbContext에 Migration 등록

```typescript
export class MyDbContext extends DbContext {
  constructor(executor: IDbContextExecutor) {
    super(executor, { database: "MyDb" });
  }

  // migrations 속성 override
  readonly migrations: Migration[] = [
    migration_20240101_1,
    migration_20240101_2,
    migration_20240102_1,
  ];

  get user() {
    return queryable(this, User);
  }
  get order() {
    return queryable(this, Order);
  }
}
```

### initializeAsync 동작 방식

1. **신규 환경** (SystemMigration 테이블 없음)
   - 전체 테이블/뷰/프로시저 생성
   - 모든 migration을 "적용됨"으로 등록

2. **기존 환경** (SystemMigration 테이블 있음)
   - 미적용 migration만 순차 실행
   - 실행된 migration을 SystemMigration에 등록

3. **강제 초기화** (`{ force: true }`)
   - DB 전체 초기화 후 재생성
   - 모든 migration을 "적용됨"으로 등록

---

## 성능 고려사항

### 대량 INSERT 최적화

INSERT는 자동으로 1000개씩 chunking됩니다:

```typescript
// 10,000개 레코드 → 자동으로 10번의 배치로 분할
await db.user().insertAsync(largeArray); // chunkSize: 1000 (고정)
```

### JOIN 성능

- **5개 이상 JOIN 지양**: 쿼리 복잡도 증가
- **인덱스 확인**: JOIN 컬럼에 인덱스 필수
- **필요한 컬럼만 SELECT**: `select()` 메서드 활용

```typescript
// ❌ 나쁜 예: 모든 컬럼 로드
const result = await db.user()
  .include((u) => u.posts)
  .resultAsync();

// ✅ 좋은 예: 필요한 컬럼만 선택
const result = await db.user()
  .select((u) => ({ id: u.id, name: u.name }))
  .resultAsync();
```

### 인덱스 전략

```typescript
// 1. WHERE 조건에 자주 사용되는 컬럼
Index.columns("email").unique()

// 2. JOIN 컬럼
Index.columns("userId") // Foreign Key에 자동 생성됨

// 3. ORDER BY에 사용되는 컬럼
Index.columns("createdAt")

// 4. 복합 인덱스 (순서 중요!)
Index.columns("companyId", "createdAt") // companyId로 필터 후 정렬
```

---

## 일반적인 실수 (Pitfalls)

### 1. NULL 비교

```typescript
// ❌ 잘못된 예: JavaScript 동등 비교
where: [(item) => item.email === undefined] // Type error!

// ✅ 올바른 예: expr.eq 사용 (null-safe)
where: [(item) => expr.eq(item.email, undefined)]
```

### 2. 순환 관계 (Circular Relationship)

```typescript
// ❌ 잘못된 예: 순환 참조
export const User = Table("User")
  .columns((c) => ({ ... }))
  .relations((r, t) => ({
    posts: r.hasMany(t.Post, "userId"),
  }));

export const Post = Table("Post")
  .columns((c) => ({ ... }))
  .relations((r, t) => ({
    user: r.belongsTo(t.User, "userId"),
    // ❌ 순환: Post → Comment → Post
    comments: r.hasMany(t.Comment, "postId"),
  }));

export const Comment = Table("Comment")
  .columns((c) => ({ ... }))
  .relations((r, t) => ({
    post: r.belongsTo(t.Post, "postId"), // 순환 발생!
  }));

// ✅ 해결: DbContext.initializeAsync()에서 런타임 검증됨
```

### 3. Transaction에서 DDL 실행

```typescript
// ❌ 에러 발생
await db.connectAsync(async () => {
  await db.createTableAsync(NewTable); // Error: DDL은 transaction 내 불가
});

// ✅ 올바른 예: Transaction 외부에서 실행
await db.connectWithoutTransactionAsync(async () => {
  await db.createTableAsync(NewTable);
});
```

### 4. 타입 불일치

```typescript
// ❌ 타입 에러
const date: DateOnly = new DateOnly(2024, 1, 1);
await db.user()
  .where((u) => [expr.eq(u.createdAt, date)]) // createdAt은 DateTime
  .resultAsync();

// ✅ 올바른 예: 같은 타입 사용 또는 cast
const datetime = new DateTime(2024, 1, 1);
await db.user()
  .where((u) => [expr.eq(u.createdAt, datetime)])
  .resultAsync();

// 또는 cast 사용
await db.user()
  .where((u) => [expr.eq(expr.cast(u.createdAt, { type: "date" }), date)])
  .resultAsync();
```

---

## Migration 전략

### 버전 관리

Migration 파일명에 날짜와 순번을 포함:

```
migrations/
├── migration_20240101_1.ts  ← YYYYMMDD_순번
├── migration_20240101_2.ts
├── migration_20240102_1.ts
└── migration_20240215_1.ts
```

### Rollback 전략

orm-common은 기본적으로 rollback을 지원하지 않습니다. 필요시 수동으로 down 함수 작성:

```typescript
export const migration_20240101_1: Migration = {
  name: "2024-01-01_add_user_phone",
  up: async (db) => {
    await db.addColumnAsync(
      { database: "MyDb", name: "User" },
      "phone",
      Column.varchar(20).nullable(),
    );
  },
  // down은 지원하지 않지만, 수동 롤백 시 참고용
  // down: async (db) => {
  //   await db.dropColumnAsync({ database: "MyDb", name: "User" }, "phone");
  // },
};
```

### Schema Diff 감지

`initializeAsync({ force: false })`는 기존 스키마와 코드를 비교하지 않습니다:

- **신규 환경**: 전체 생성
- **기존 환경**: 미적용 migration만 실행
- **수동 감지**: 직접 `db.schemaExistsAsync()` 등으로 확인 필요

---

## 테스트

```bash
# orm-common 테스트 실행
npx vitest run packages/orm-common
```

**테스트 통계:**
- 전체 테스트: 1,108개
- 테스트 파일: 33개
- 실행 시간: ~2.5초

---

## 라이선스

MIT
