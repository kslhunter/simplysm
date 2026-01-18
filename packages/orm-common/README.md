# @simplysm/orm-common

심플리즘 ORM의 공통 모듈입니다. 쿼리 빌더, 스키마 정의, 표현식 등 ORM의 핵심 기능을 제공합니다.

## 설치

```bash
npm install @simplysm/orm-common
# or
yarn add @simplysm/orm-common
```

## 주요 기능

### 테이블 정의

```typescript
import { Table, TableBuilder, createColumnFactory, createIndexFactory } from "@simplysm/orm-common";

const col = createColumnFactory();
const idx = createIndexFactory();

@Table({ schema: "dbo", description: "사용자 테이블" })
class User extends TableBuilder({
  id: col.int().autoIncrement().primary(),
  name: col.string(100).notNull(),
  email: col.string(255).notNull(),
  createdAt: col.datetime().notNull().default("GETDATE()"),
}, {
  idx_email: idx.columns("email").unique(),
}) {}
```

### 쿼리 작성

```typescript
import { DbContext, Queryable, expr } from "@simplysm/orm-common";

// SELECT 쿼리
const users = await db.from(User)
  .where((u) => expr.eq(u.name, "John"))
  .select((u) => ({
    id: u.id,
    name: u.name,
  }))
  .resultAsync();

// JOIN 쿼리
const result = await db.from(User)
  .join(Order, (u, o) => expr.eq(u.id, o.userId))
  .select((u, o) => ({
    userName: u.name,
    orderDate: o.createdAt,
  }))
  .resultAsync();
```

### 표현식 (expr)

타입 안전한 SQL 표현식을 제공합니다.

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

각 데이터베이스에 맞는 SQL을 생성합니다.

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
