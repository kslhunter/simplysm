# @simplysm/orm-common

Simplysm ORM의 공통 모듈로, 타입 안전한 쿼리 빌더, 스키마 정의, SQL 표현식 등 ORM의 핵심 기능을 제공한다.
SQL 문자열이 아닌 JSON AST를 생성하며, 각 DBMS(MySQL, MSSQL, PostgreSQL)에 맞는 SQL로 변환된다.

## 설치

```bash
npm install @simplysm/orm-common
# or
pnpm add @simplysm/orm-common
```

### 의존성

| 패키지 | 설명 |
|--------|------|
| `@simplysm/core-common` | 공통 유틸리티, `DateTime`, `DateOnly`, `Time`, `Uuid` 타입 |

## 지원 데이터베이스

| 데이터베이스 | Dialect | 최소 버전 |
|-------------|---------|----------|
| MySQL | `mysql` | 8.0.14+ |
| SQL Server | `mssql` | 2012+ |
| PostgreSQL | `postgresql` | 9.0+ |

## 주요 모듈

### 스키마 빌더

| export | 설명 |
|--------|------|
| `Table(name)` | 테이블 빌더 팩토리 함수 |
| `TableBuilder` | 테이블 스키마 정의 (Fluent API) |
| `View(name)` | 뷰 빌더 팩토리 함수 |
| `ViewBuilder` | 뷰 스키마 정의 (Fluent API) |
| `Procedure(name)` | 프로시저 빌더 팩토리 함수 |
| `ProcedureBuilder` | 프로시저 스키마 정의 (Fluent API) |
| `ColumnBuilder` | 컬럼 정의 빌더 |
| `createColumnFactory()` | 컬럼 타입 팩토리 생성 |
| `IndexBuilder` | 인덱스 정의 빌더 |
| `createIndexFactory()` | 인덱스 팩토리 생성 |
| `ForeignKeyBuilder` | FK 관계 빌더 (N:1, DB FK 생성) |
| `ForeignKeyTargetBuilder` | FK 역참조 빌더 (1:N) |
| `RelationKeyBuilder` | 논리적 관계 빌더 (N:1, DB FK 미생성) |
| `RelationKeyTargetBuilder` | 논리적 역참조 빌더 (1:N) |
| `createRelationFactory()` | 관계 팩토리 생성 |

### 쿼리 실행

| export | 설명 |
|--------|------|
| `Queryable` | 쿼리 빌더 클래스 (SELECT/INSERT/UPDATE/DELETE) |
| `queryable(db, table)` | `DbContext`에서 테이블 Queryable 생성 |
| `Executable` | 프로시저 실행 래퍼 클래스 |
| `executable(db, proc)` | `DbContext`에서 프로시저 Executable 생성 |
| `DbContext` | 데이터베이스 컨텍스트 추상 클래스 (연결, 트랜잭션, DDL) |

### 표현식

| export | 설명 |
|--------|------|
| `expr` | SQL 표현식 빌더 객체 |
| `toExpr(value)` | `ExprInput`을 `Expr` AST로 변환 |
| `ExprUnit` | 값 표현식 래퍼 클래스 |
| `WhereExprUnit` | WHERE 조건 표현식 래퍼 클래스 |

### 쿼리 빌더 (SQL 생성)

| export | 설명 |
|--------|------|
| `createQueryBuilder(dialect)` | Dialect별 쿼리 빌더 인스턴스 생성 |
| `QueryBuilderBase` | 쿼리 빌더 추상 기반 클래스 |
| `MysqlQueryBuilder` | MySQL SQL 생성기 |
| `MssqlQueryBuilder` | MSSQL SQL 생성기 |
| `PostgresqlQueryBuilder` | PostgreSQL SQL 생성기 |
| `ExprRendererBase` | 표현식 렌더러 추상 기반 클래스 |
| `MysqlExprRenderer` | MySQL 표현식 렌더러 |
| `MssqlExprRenderer` | MSSQL 표현식 렌더러 |
| `PostgresqlExprRenderer` | PostgreSQL 표현식 렌더러 |

### 유틸리티

| export | 설명 |
|--------|------|
| `parseSearchQuery(text)` | 검색 문자열을 SQL LIKE 패턴으로 파싱 |
| `parseQueryResult(rows, meta)` | 평면 쿼리 결과를 중첩 객체로 변환 |
| `getMatchedPrimaryKeys(fk, table)` | FK 컬럼과 대상 테이블 PK 매칭 |
| `SystemMigration` | 마이그레이션 이력 관리 내부 테이블 |

### 에러

| export | 설명 |
|--------|------|
| `DbTransactionError` | 트랜잭션 에러 (DBMS 독립적) |
| `DbErrorCode` | 에러 코드 enum (`NO_ACTIVE_TRANSACTION`, `DEADLOCK`, `LOCK_TIMEOUT` 등) |

### 타입

| export | 설명 |
|--------|------|
| `Dialect` | `"mysql" \| "mssql" \| "postgresql"` |
| `dialects` | 모든 Dialect 배열 (테스트용) |
| `IsolationLevel` | 트랜잭션 격리 수준 |
| `DbContextStatus` | `"ready" \| "connect" \| "transact"` |
| `DbContextExecutor` | 쿼리 실행기 인터페이스 |
| `Migration` | 마이그레이션 정의 인터페이스 |
| `ResultMeta` | 쿼리 결과 변환 메타데이터 |
| `QueryBuildResult` | 빌드된 SQL + 결과셋 메타 |
| `DataRecord` | 쿼리 결과 레코드 (재귀적 중첩 지원) |
| `DataType` | 컬럼 데이터 타입 정의 |
| `ColumnPrimitive` | 컬럼 기본 타입 유니온 |
| `ColumnMeta` | 컬럼 메타데이터 |
| `InferColumns<T>` | 컬럼 빌더에서 값 타입 추론 |
| `InferInsertColumns<T>` | INSERT용 타입 추론 (autoIncrement/nullable/default는 optional) |
| `InferUpdateColumns<T>` | UPDATE용 타입 추론 (모든 필드 optional) |
| `InferDeepRelations<T>` | 관계 정의에서 깊은 타입 추론 |
| `QueryableRecord<T>` | Queryable 내부 컬럼 레코드 타입 |
| `PathProxy<T>` | `include()`용 타입 안전 경로 프록시 |
| `QueryDef` | 쿼리 정의 유니온 타입 (DML + DDL) |
| `SelectQueryDef` | SELECT 쿼리 정의 |
| `Expr`, `WhereExpr` | 표현식 AST 타입 |

## 사용법

### 테이블 정의

`Table()` 팩토리 함수와 Fluent API를 사용하여 테이블 스키마를 정의한다.

```typescript
import { Table } from "@simplysm/orm-common";

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    isActive: c.boolean().default(true),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [
    i.index("email").unique(),
    i.index("name", "createdAt").orderBy("ASC", "DESC"),
  ]);
```

#### 컬럼 타입

| 팩토리 메서드 | SQL 타입 | TypeScript 타입 |
|--------------|----------|----------------|
| `c.int()` | INT | `number` |
| `c.bigint()` | BIGINT | `number` |
| `c.float()` | FLOAT | `number` |
| `c.double()` | DOUBLE | `number` |
| `c.decimal(p, s)` | DECIMAL(p, s) | `number` |
| `c.varchar(n)` | VARCHAR(n) | `string` |
| `c.char(n)` | CHAR(n) | `string` |
| `c.text()` | TEXT | `string` |
| `c.boolean()` | BOOLEAN / BIT / TINYINT(1) | `boolean` |
| `c.datetime()` | DATETIME | `DateTime` |
| `c.date()` | DATE | `DateOnly` |
| `c.time()` | TIME | `Time` |
| `c.uuid()` | UUID / UNIQUEIDENTIFIER / BINARY(16) | `Uuid` |
| `c.binary()` | BLOB / VARBINARY(MAX) / BYTEA | `Bytes` |

#### 컬럼 옵션

| 메서드 | 설명 |
|--------|------|
| `.autoIncrement()` | 자동 증가 (INSERT 시 optional) |
| `.nullable()` | NULL 허용 (타입에 `undefined` 추가) |
| `.default(value)` | 기본값 설정 (INSERT 시 optional) |
| `.description(text)` | 컬럼 설명 (DDL 주석) |

### 관계 정의

테이블 간 관계를 정의하면 `include()`를 통한 자동 JOIN이 가능하다.

```typescript
const Post = Table("Post")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    authorId: c.bigint(),
    title: c.varchar(200),
    content: c.text(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // N:1 관계 - Post.authorId → User.id (DB FK 생성)
    author: r.foreignKey(["authorId"], () => User),
  }));

const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations((r) => ({
    // 1:N 역참조 - User ← Post.author
    posts: r.foreignKeyTarget(() => Post, "author"),

    // 1:1 관계 (단일 객체)
    profile: r.foreignKeyTarget(() => Profile, "user").single(),
  }));
```

#### 관계 빌더 종류

| 메서드 | 카디널리티 | DB FK 생성 | 사용 가능 대상 |
|--------|-----------|-----------|--------------|
| `r.foreignKey(cols, targetFn)` | N:1 | O | Table |
| `r.foreignKeyTarget(targetFn, relName)` | 1:N | - | Table |
| `r.relationKey(cols, targetFn)` | N:1 | X | Table, View |
| `r.relationKeyTarget(targetFn, relName)` | 1:N | - | Table, View |

`foreignKeyTarget` / `relationKeyTarget`에 `.single()`을 호출하면 1:1 관계로 설정된다 (배열 대신 단일 객체).

### DbContext 설정

`DbContext`를 상속하여 테이블과 프로시저를 등록한다.

```typescript
import { DbContext, queryable, executable, expr } from "@simplysm/orm-common";

class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly post = queryable(this, Post);
  readonly getUserById = executable(this, GetUserById);

  // 마이그레이션 정의
  readonly migrations = [
    {
      name: "20260101_add_status",
      up: async (db: MyDb) => {
        const c = createColumnFactory();
        await db.addColumn(
          { database: "mydb", name: "User" },
          "status",
          c.varchar(20).nullable(),
        );
      },
    },
  ];
}
```

### 연결 및 트랜잭션

```typescript
// executor는 orm-node 패키지의 NodeDbContextExecutor 등을 사용
const db = new MyDb(executor, { database: "mydb" });

// 트랜잭션 내에서 실행 (자동 커밋/롤백)
const users = await db.connect(async () => {
  const result = await db.user().result();
  await db.user().insert([{ name: "홍길동", createdAt: DateTime.now() }]);
  return result;
});

// 트랜잭션 없이 연결 (DDL 작업용)
await db.connectWithoutTransaction(async () => {
  await db.initialize(); // Code First 초기화
});

// 격리 수준 지정
await db.connect(async () => {
  // ...
}, "SERIALIZABLE");
```

### SELECT 쿼리

```typescript
// 기본 조회
const users = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .orderBy((u) => u.name)
  .result();

// 컬럼 선택
const names = await db.user()
  .select((u) => ({
    userName: u.name,
    userEmail: u.email,
  }))
  .result();

// 단일 결과 (2개 이상이면 에러)
const user = await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .single();

// 첫 번째 결과만
const latest = await db.user()
  .orderBy((u) => u.createdAt, "DESC")
  .first();

// 행 수
const count = await db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .count();

// 존재 여부
const hasAdmin = await db.user()
  .where((u) => [expr.eq(u.role, "admin")])
  .exists();
```

### JOIN 쿼리

```typescript
// 수동 JOIN (1:N - 배열)
const usersWithPosts = await db.user()
  .join("posts", (qr, u) =>
    qr.from(Post).where((p) => [expr.eq(p.authorId, u.id)])
  )
  .result();
// 결과: { id, name, posts: [{ id, title }, ...] }

// 수동 JOIN (N:1 - 단일 객체)
const postsWithUser = await db.post()
  .joinSingle("author", (qr, p) =>
    qr.from(User).where((u) => [expr.eq(u.id, p.authorId)])
  )
  .result();
// 결과: { id, title, author: { id, name } | undefined }

// include (관계 정의 기반 자동 JOIN)
const postWithAuthor = await db.post()
  .include((p) => p.author)
  .single();

// 중첩 include
const postWithAuthorCompany = await db.post()
  .include((p) => p.author.company)
  .result();

// 다중 include
const userWithAll = await db.user()
  .include((u) => u.posts)
  .include((u) => u.profile)
  .result();
```

### 그룹화 및 집계

```typescript
const stats = await db.order()
  .select((o) => ({
    userId: o.userId,
    totalAmount: expr.sum(o.amount),
    orderCount: expr.count(),
  }))
  .groupBy((o) => [o.userId])
  .having((o) => [expr.gte(o.totalAmount, 10000)])
  .result();
```

### 페이지네이션

```typescript
// TOP (ORDER BY 불필요)
const topUsers = await db.user().top(10).result();

// LIMIT/OFFSET (ORDER BY 필수)
const page = await db.user()
  .orderBy((u) => u.createdAt, "DESC")
  .limit(0, 20) // skip 0, take 20
  .result();
```

### 텍스트 검색

`search()` 메서드는 구조화된 검색 문법을 지원한다.

```typescript
const users = await db.user()
  .search((u) => [u.name, u.email], "홍길동 -탈퇴")
  .result();
```

#### 검색 문법

| 문법 | 설명 | 예시 |
|------|------|------|
| 공백 | OR 조합 | `사과 바나나` |
| `""` | 구문 검색 (필수) | `"맛있는 사과"` |
| `+` | 필수 포함 (AND) | `+사과 +바나나` |
| `-` | 제외 (NOT) | `사과 -바나나` |
| `*` | 와일드카드 | `app*` |
| `\*` | 이스케이프 | `app\*` (리터럴 `*`) |

### UNION

```typescript
const allItems = await Queryable.union(
  db.user()
    .where((u) => [expr.eq(u.type, "admin")])
    .select((u) => ({ name: u.name })),
  db.user()
    .where((u) => [expr.eq(u.type, "manager")])
    .select((u) => ({ name: u.name })),
).result();
```

### 서브쿼리 래핑 (wrap)

`distinct()` 또는 `groupBy()` 후 `count()`를 사용하려면 `wrap()`으로 감싸야 한다.

```typescript
const count = await db.user()
  .select((u) => ({ name: u.name }))
  .distinct()
  .wrap()
  .count();
```

### 재귀 CTE (recursive)

계층 구조 데이터(조직도, 카테고리 트리 등)를 조회할 때 사용한다.

```typescript
const employees = await db.employee()
  .where((e) => [expr.null(e.managerId)]) // 루트 노드
  .recursive((cte) =>
    cte.from(Employee)
      .where((e) => [expr.eq(e.managerId, e.self[0].id)])
  )
  .result();
```

### INSERT

```typescript
// 단순 삽입
await db.user().insert([
  { name: "홍길동", createdAt: DateTime.now() },
  { name: "김철수", createdAt: DateTime.now() },
]);

// 삽입 후 ID 반환 (outputColumns)
const [inserted] = await db.user().insert(
  [{ name: "홍길동", createdAt: DateTime.now() }],
  ["id"],
);
// inserted.id 사용 가능

// 조건부 삽입 (없으면 INSERT)
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .insertIfNotExists({ name: "테스트", email: "test@test.com", createdAt: DateTime.now() });

// INSERT INTO ... SELECT
await db.user()
  .select((u) => ({ name: u.name, createdAt: u.createdAt }))
  .where((u) => [expr.eq(u.isArchived, false)])
  .insertInto(ArchivedUser);
```

### UPDATE

```typescript
// 단순 업데이트
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .update((u) => ({
    name: expr.val("string", "새이름"),
  }));

// 기존 값 참조
await db.product()
  .update((p) => ({
    viewCount: expr.val("number", p.viewCount + 1),
  }));
```

### DELETE

```typescript
// 단순 삭제
await db.user()
  .where((u) => [expr.eq(u.id, 1)])
  .delete();

// 삭제된 데이터 반환
const deleted = await db.user()
  .where((u) => [expr.eq(u.isExpired, true)])
  .delete(["id", "name"]);
```

### UPSERT

```typescript
// UPDATE/INSERT 동일 데이터
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(() => ({
    name: expr.val("string", "테스트"),
    email: expr.val("string", "test@test.com"),
  }));

// UPDATE/INSERT 다른 데이터
await db.user()
  .where((u) => [expr.eq(u.email, "test@test.com")])
  .upsert(
    () => ({ loginCount: expr.val("number", 1) }),
    (update) => ({ ...update, email: expr.val("string", "test@test.com") }),
  );
```

### 행 잠금 (FOR UPDATE)

```typescript
await db.connect(async () => {
  const user = await db.user()
    .where((u) => [expr.eq(u.id, 1)])
    .lock()
    .single();
});
```

## 표현식 (expr)

`expr` 객체는 Dialect 독립적인 SQL 표현식을 생성한다. SQL 문자열이 아닌 JSON AST를 생성하며, `QueryBuilder`가 각 DBMS에 맞게 변환한다.

### 비교 표현식 (WHERE)

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.eq(a, b)` | `a = b` (NULL-safe) | 동등 비교 |
| `expr.gt(a, b)` | `a > b` | 초과 |
| `expr.lt(a, b)` | `a < b` | 미만 |
| `expr.gte(a, b)` | `a >= b` | 이상 |
| `expr.lte(a, b)` | `a <= b` | 이하 |
| `expr.between(a, from, to)` | `a BETWEEN from AND to` | 범위 (undefined 시 해당 방향 무제한) |
| `expr.null(a)` | `a IS NULL` | NULL 체크 |
| `expr.like(a, pattern)` | `a LIKE pattern` | 패턴 매칭 |
| `expr.regexp(a, pattern)` | `a REGEXP pattern` | 정규식 매칭 |
| `expr.in(a, values)` | `a IN (v1, v2, ...)` | 값 목록 비교 |
| `expr.inQuery(a, query)` | `a IN (SELECT ...)` | 서브쿼리 비교 |
| `expr.exists(query)` | `EXISTS (SELECT ...)` | 서브쿼리 존재 여부 |

### 논리 표현식 (WHERE)

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.and(conditions)` | `(c1 AND c2 AND ...)` | 모든 조건 충족 |
| `expr.or(conditions)` | `(c1 OR c2 OR ...)` | 하나 이상 충족 |
| `expr.not(condition)` | `NOT (condition)` | 조건 부정 |

### 문자열 표현식

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.concat(...args)` | `CONCAT(a, b, ...)` | 문자열 연결 |
| `expr.left(s, n)` | `LEFT(s, n)` | 왼쪽에서 n자 추출 |
| `expr.right(s, n)` | `RIGHT(s, n)` | 오른쪽에서 n자 추출 |
| `expr.trim(s)` | `TRIM(s)` | 양쪽 공백 제거 |
| `expr.padStart(s, n, fill)` | `LPAD(s, n, fill)` | 왼쪽 패딩 |
| `expr.replace(s, from, to)` | `REPLACE(s, from, to)` | 문자열 치환 |
| `expr.upper(s)` | `UPPER(s)` | 대문자 변환 |
| `expr.lower(s)` | `LOWER(s)` | 소문자 변환 |
| `expr.length(s)` | `CHAR_LENGTH(s)` | 문자 수 |
| `expr.byteLength(s)` | `OCTET_LENGTH(s)` | 바이트 수 |
| `expr.substring(s, start, len)` | `SUBSTRING(s, start, len)` | 부분 추출 (1-based) |
| `expr.indexOf(s, search)` | `LOCATE(search, s)` | 위치 찾기 (1-based, 없으면 0) |

### 숫자 표현식

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.abs(n)` | `ABS(n)` | 절대값 |
| `expr.round(n, digits)` | `ROUND(n, digits)` | 반올림 |
| `expr.ceil(n)` | `CEILING(n)` | 올림 |
| `expr.floor(n)` | `FLOOR(n)` | 버림 |

### 날짜 표현식

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.year(d)` | `YEAR(d)` | 연도 추출 |
| `expr.month(d)` | `MONTH(d)` | 월 추출 (1~12) |
| `expr.day(d)` | `DAY(d)` | 일 추출 (1~31) |
| `expr.hour(d)` | `HOUR(d)` | 시 추출 (0~23) |
| `expr.minute(d)` | `MINUTE(d)` | 분 추출 (0~59) |
| `expr.second(d)` | `SECOND(d)` | 초 추출 (0~59) |
| `expr.isoWeek(d)` | `WEEK(d, 3)` | ISO 주차 (1~53) |
| `expr.isoWeekStartDate(d)` | - | ISO 주 시작일 (월요일) |
| `expr.isoYearMonth(d)` | - | 해당 월의 1일 |
| `expr.dateDiff(sep, from, to)` | `DATEDIFF(sep, from, to)` | 날짜 차이 |
| `expr.dateAdd(sep, source, value)` | `DATEADD(sep, value, source)` | 날짜 더하기 |
| `expr.formatDate(d, format)` | `DATE_FORMAT(d, format)` | 날짜 포맷 |

`DateSeparator`: `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`

### 조건 표현식

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.ifNull(a, b, ...)` | `COALESCE(a, b, ...)` | 첫 번째 non-null 값 반환 |
| `expr.nullIf(a, b)` | `NULLIF(a, b)` | `a === b`이면 NULL |
| `expr.is(condition)` | `(condition)` | WHERE를 boolean으로 변환 |
| `expr.if(cond, then, else)` | `IF(cond, then, else)` | 삼항 조건 |
| `expr.switch()` | `CASE WHEN ... END` | 다중 조건 분기 |

```typescript
// CASE WHEN 사용 예시
db.user().select((u) => ({
  grade: expr.switch<string>()
    .case(expr.gte(u.score, 90), "A")
    .case(expr.gte(u.score, 80), "B")
    .case(expr.gte(u.score, 70), "C")
    .default("F"),
}))
```

### 집계 표현식

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.count(col?, distinct?)` | `COUNT(*)` / `COUNT(DISTINCT col)` | 행 수 |
| `expr.sum(col)` | `SUM(col)` | 합계 |
| `expr.avg(col)` | `AVG(col)` | 평균 |
| `expr.max(col)` | `MAX(col)` | 최대값 |
| `expr.min(col)` | `MIN(col)` | 최소값 |
| `expr.greatest(...args)` | `GREATEST(a, b, ...)` | 여러 값 중 최대 |
| `expr.least(...args)` | `LEAST(a, b, ...)` | 여러 값 중 최소 |

### 윈도우 함수

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.rowNumber(spec)` | `ROW_NUMBER() OVER (...)` | 행 번호 |
| `expr.rank(spec)` | `RANK() OVER (...)` | 순위 (동점 시 건너뜀) |
| `expr.denseRank(spec)` | `DENSE_RANK() OVER (...)` | 밀집 순위 (연속) |
| `expr.ntile(n, spec)` | `NTILE(n) OVER (...)` | n개 그룹 분할 |
| `expr.lag(col, spec, opts?)` | `LAG(col, offset) OVER (...)` | 이전 행 값 |
| `expr.lead(col, spec, opts?)` | `LEAD(col, offset) OVER (...)` | 다음 행 값 |
| `expr.firstValue(col, spec)` | `FIRST_VALUE(col) OVER (...)` | 첫 번째 값 |
| `expr.lastValue(col, spec)` | `LAST_VALUE(col) OVER (...)` | 마지막 값 |
| `expr.sumOver(col, spec)` | `SUM(col) OVER (...)` | 윈도우 합계 |
| `expr.avgOver(col, spec)` | `AVG(col) OVER (...)` | 윈도우 평균 |
| `expr.countOver(spec, col?)` | `COUNT(*) OVER (...)` | 윈도우 카운트 |
| `expr.minOver(col, spec)` | `MIN(col) OVER (...)` | 윈도우 최소 |
| `expr.maxOver(col, spec)` | `MAX(col) OVER (...)` | 윈도우 최대 |

`WinSpec`: `{ partitionBy?: [...], orderBy?: [[col, "ASC"|"DESC"], ...] }`

```typescript
// 윈도우 함수 사용 예시
db.order().select((o) => ({
  ...o,
  rowNum: expr.rowNumber({
    partitionBy: [o.userId],
    orderBy: [[o.createdAt, "DESC"]],
  }),
  runningTotal: expr.sumOver(o.amount, {
    partitionBy: [o.userId],
    orderBy: [[o.createdAt, "ASC"]],
  }),
}))
```

### 기타 표현식

| 메서드 | SQL | 설명 |
|--------|-----|------|
| `expr.val(dataType, value)` | 리터럴 | 타입 지정 값 래핑 |
| `expr.col(dataType, ...path)` | 컬럼 참조 | 컬럼 참조 생성 (내부용) |
| `expr.raw(dataType)\`sql\`` | Raw SQL | DBMS 전용 함수용 escape hatch |
| `expr.rowNum()` | - | 전체 행 번호 |
| `expr.random()` | `RAND()` / `RANDOM()` | 0~1 난수 |
| `expr.cast(source, type)` | `CAST(source AS type)` | 타입 변환 |
| `expr.subquery(dataType, qr)` | `(SELECT ...)` | 스칼라 서브쿼리 |

```typescript
// Raw SQL (DBMS 전용 함수 사용)
db.user().select((u) => ({
  name: u.name,
  data: expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`,
}))

// 스칼라 서브쿼리
db.user().select((u) => ({
  id: u.id,
  postCount: expr.subquery(
    "number",
    db.post()
      .where((p) => [expr.eq(p.userId, u.id)])
      .select(() => ({ cnt: expr.count() }))
  ),
}))
```

## 뷰 정의

```typescript
import { View, expr } from "@simplysm/orm-common";

const ActiveUsers = View("ActiveUsers")
  .database("mydb")
  .query((db: MyDb) =>
    db.user()
      .where((u) => [expr.eq(u.isActive, true)])
      .select((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
      }))
  );

// 뷰에 논리적 관계 정의 (DB FK 미생성)
const UserSummary = View("UserSummary")
  .database("mydb")
  .query((db: MyDb) =>
    db.user().select((u) => ({
      id: u.id,
      name: u.name,
      companyId: u.companyId,
    }))
  )
  .relations((r) => ({
    company: r.relationKey(["companyId"], () => Company),
  }));
```

## 프로시저 정의

```typescript
import { Procedure, executable } from "@simplysm/orm-common";

const GetUserById = Procedure("GetUserById")
  .database("mydb")
  .params((c) => ({
    userId: c.bigint(),
  }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
    email: c.varchar(200),
  }))
  .body("SELECT id, name, email FROM User WHERE id = userId");

// DbContext에서 등록
class MyDb extends DbContext {
  readonly getUserById = executable(this, GetUserById);
}

// 호출
const result = await db.getUserById().execute({ userId: 1 });
```

## 쿼리 빌더 (SQL 생성)

`QueryDef` JSON AST를 DBMS별 SQL 문자열로 변환한다.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

const mysqlBuilder = createQueryBuilder("mysql");
const mssqlBuilder = createQueryBuilder("mssql");
const postgresqlBuilder = createQueryBuilder("postgresql");

// QueryDef를 SQL로 변환
const queryDef = db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .getSelectQueryDef();

const { sql } = mysqlBuilder.build(queryDef);
```

## DDL 작업

`DbContext`는 Code First 방식의 DDL 작업을 지원한다.

```typescript
await db.connectWithoutTransaction(async () => {
  // 데이터베이스 초기화 (테이블/뷰/프로시저/FK/인덱스 생성)
  await db.initialize();

  // 강제 초기화 (기존 데이터 삭제 후 재생성)
  await db.initialize({ force: true });

  // 개별 DDL 작업
  const c = createColumnFactory();
  await db.addColumn({ database: "mydb", name: "User" }, "status", c.varchar(20).nullable());
  await db.modifyColumn({ database: "mydb", name: "User" }, "status", c.varchar(50).nullable());
  await db.renameColumn({ database: "mydb", name: "User" }, "status", "userStatus");
  await db.dropColumn({ database: "mydb", name: "User" }, "userStatus");

  await db.renameTable({ database: "mydb", name: "User" }, "Member");
  await db.truncate({ database: "mydb", name: "User" });
});
```

## 에러 처리

```typescript
import { DbTransactionError, DbErrorCode } from "@simplysm/orm-common";

try {
  await db.connect(async () => {
    // ...
  });
} catch (err) {
  if (err instanceof DbTransactionError) {
    switch (err.code) {
      case DbErrorCode.DEADLOCK:
        // 데드락 재시도 로직
        break;
      case DbErrorCode.LOCK_TIMEOUT:
        // 타임아웃 처리
        break;
    }
  }
}
```

### DbErrorCode

| 코드 | 설명 |
|------|------|
| `NO_ACTIVE_TRANSACTION` | 활성 트랜잭션이 없음 |
| `TRANSACTION_ALREADY_STARTED` | 트랜잭션이 이미 시작됨 |
| `DEADLOCK` | 데드락 발생 |
| `LOCK_TIMEOUT` | 락 타임아웃 |

## 보안 주의사항

orm-common은 동적 쿼리 특성상 파라미터 바인딩 대신 **강화된 문자열 이스케이프**를 사용한다.
반드시 애플리케이션 레벨에서 입력 검증을 수행해야 한다.

```typescript
// 나쁜 예: 사용자 입력 직접 사용
const userInput = req.query.name; // "'; DROP TABLE users; --"
await db.user().where((u) => [expr.eq(u.name, userInput)]).result();

// 좋은 예: 검증 후 사용
const userName = validateUserName(req.query.name);
await db.user().where((u) => [expr.eq(u.name, userName)]).result();

// 더 좋은 예: 타입 강제
const userId = Number(req.query.id);
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
```

## 타입 추론

`TableBuilder`는 컬럼 정의에서 자동으로 타입을 추론한다.

```typescript
const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    status: c.varchar(20).default("active"),
  }))
  .primaryKey("id");

// $infer: 전체 타입 (컬럼 + 관계)
type UserData = typeof User.$infer;
// { id: number; name: string; email: string | undefined; status: string; }

// $inferInsert: INSERT용 (autoIncrement/nullable/default는 optional)
type UserInsert = typeof User.$inferInsert;
// { name: string; } & { id?: number; email?: string; status?: string; }

// $inferUpdate: UPDATE용 (모든 필드 optional)
type UserUpdate = typeof User.$inferUpdate;
// { id?: number; name?: string; email?: string; status?: string; }
```

## 라이선스

Apache-2.0
