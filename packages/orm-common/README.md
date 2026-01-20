# @simplysm/orm-common

@simplysm ORM의 공통 모듈이다. 쿼리 빌더, 스키마 정의, 표현식 등 ORM의 핵심 기능을 제공한다.

## 설치

```bash
npm install @simplysm/orm-common
# or
yarn add @simplysm/orm-common
```

## 주요 기능

### 테이블 정의

```typescript
import { Table, queryable, DbContext } from "@simplysm/orm-common";

// 테이블 정의
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
    i.columns("email").unique(),
  ]);

// DbContext에서 사용
class MyDb extends DbContext {
  user = queryable(this, User);
}
```

### 관계 정의

```typescript
const Post = Table("Post")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    userId: c.bigint(),
    title: c.varchar(200),
  }))
  .primaryKey("id")
  .relations((r) => ({
    user: r.foreignKey(["userId"], () => User),
  }));

const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations((r) => ({
    posts: r.foreignKeyTarget(() => Post, "user"),
  }));
```

### 쿼리 작성

```typescript
import { expr } from "@simplysm/orm-common";

// SELECT 쿼리
const users = await db.user()
  .where((u) => [expr.eq(u.name, "John")])
  .select((u) => ({
    id: u.id,
    name: u.name,
  }))
  .resultAsync();

// JOIN 쿼리
const result = await db.user()
  .join("post", (q, u) => q.from(Post).where((p) => [expr.eq(p.userId, u.id)]))
  .select((u) => ({
    userName: u.name,
    postTitle: u.post.title,
  }))
  .resultAsync();

// include (관계 정의 기반)
const userWithPosts = await db.user()
  .include("posts")
  .singleAsync();
```

### 표현식 (expr)

타입 안전한 SQL 표현식을 제공한다.

```typescript
import { expr } from "@simplysm/orm-common";

// 비교 표현식
expr.eq(a, b)      // a = b
expr.gt(a, b)      // a > b
expr.like(a, "%x") // a LIKE '%x'
expr.in(a, [1, 2]) // a IN (1, 2)

// 논리 표현식
expr.and(cond1, cond2)
expr.or(cond1, cond2)
expr.not(cond)

// 집계 표현식
expr.count(col)
expr.sum(col)
expr.avg(col)
expr.max(col)
expr.min(col)

// 문자열 표현식
expr.concat(a, b)
expr.upper(a)
expr.lower(a)
expr.trim(a)

// 날짜 표현식
expr.year(date)
expr.month(date)
expr.day(date)
```

### 쿼리 빌더

각 데이터베이스에 맞는 SQL을 생성한다.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";

// MySQL 쿼리 빌더
const mysqlBuilder = createQueryBuilder("mysql");

// MSSQL 쿼리 빌더
const mssqlBuilder = createQueryBuilder("mssql");

// PostgreSQL 쿼리 빌더
const postgresqlBuilder = createQueryBuilder("postgresql");
```

## 지원 데이터베이스

| 데이터베이스 | Dialect | 최소 버전 |
|-------------|---------|----------|
| MySQL | `mysql` | 8.0.14+ |
| SQL Server | `mssql` | 2012+ |
| PostgreSQL | `postgresql` | 9.0+ |

## 스키마 빌더

| 클래스 | 설명 |
|-------|------|
| `TableBuilder` | 테이블 스키마 정의 |
| `ViewBuilder` | 뷰 스키마 정의 |
| `ProcedureBuilder` | 프로시저 스키마 정의 |
| `ColumnBuilder` | 컬럼 정의 |
| `IndexBuilder` | 인덱스 정의 |
| `ForeignKeyBuilder` | 외래키 정의 |

## 라이선스

Apache-2.0
