# @simplysm/orm-common

DBMS 독립적인 ORM 코어 라이브러리. TypeScript Fluent API로 스키마를 정의하고, SQL AST(QueryDef)를 경유하여 MySQL/MSSQL/PostgreSQL 세 방언(dialect)의 SQL을 생성한다.

## Installation

```bash
npm install @simplysm/orm-common
```

## API Overview

### Core

| API | Type | Description |
|-----|------|-------------|
| `DbContext` | class | DB 연결/트랜잭션/DDL/초기화를 제공하는 추상 클래스. `queryable()`/`executable()`로 테이블/프로시저 등록 |
| `SD_BUILDER` | const | DbContext 프로퍼티에 부착된 builder 참조용 Symbol |
| `DbContextBase` | interface | Queryable/Executable에서 사용하는 DbContext 내부 인터페이스 |
| `DbContextStatus` | type | DbContext 상태: `"ready" \| "connect" \| "transact"` |
| `DbContextDdlMethods` | interface | DDL 실행 메서드 인터페이스 (createTable, dropTable 등) |
| `DbErrorCode` | enum | 트랜잭션 에러 코드 (NO_ACTIVE_TRANSACTION, DEADLOCK 등) |
| `DbTransactionError` | class | DBMS 네이티브 에러를 표준 에러 코드로 래핑하는 에러 클래스 |

-> See [docs/core.md](./docs/core.md) for details.

### Queryable / Executable

| API | Type | Description |
|-----|------|-------------|
| `Queryable` | class | SELECT/INSERT/UPDATE/DELETE/UPSERT 체인 빌더. 메서드 체이닝으로 쿼리 구성 |
| `queryable` | function | Queryable 생성 팩토리 함수 |
| `getMatchedPrimaryKeys` | function | FK column 배열과 대상 테이블 PK를 매칭하여 PK column 이름 반환 |
| `QueryableRecord` | type | Queryable column 프록시 레코드 타입 |
| `QueryableWriteRecord` | type | UPDATE/INSERT용 column 레코드 타입 |
| `NullableQueryableRecord` | type | 모든 column이 nullable인 Queryable 레코드 타입 |
| `UnwrapQueryableRecord` | type | QueryableRecord에서 실제 데이터 타입 추출 |
| `PathProxy` | type | include()에서 관계 경로를 타입 안전하게 지정하기 위한 프록시 타입 |
| `Executable` | class | Stored Procedure 실행 래퍼 클래스 |
| `executable` | function | Executable 생성 팩토리 함수 |
| `parseSearchQuery` | function | 검색 쿼리 문자열을 SQL LIKE 패턴으로 파싱 |
| `ParsedSearchQuery` | interface | parseSearchQuery 결과 타입 (or, must, not 배열) |

-> See [docs/queryable-executable.md](./docs/queryable-executable.md) for details.

### Expression

| API | Type | Description |
|-----|------|-------------|
| `expr` | const | SQL 표현식 AST 빌더 네임스페이스 (60+ 함수) |
| `SwitchExprBuilder` | interface | CASE WHEN 표현식 체이닝 빌더 인터페이스 |
| `ExprUnit` | class | 타입 안전 표현식 래퍼 |
| `WhereExprUnit` | class | WHERE 절용 표현식 래퍼 |
| `ExprInput` | type | ExprUnit 또는 리터럴 값을 받는 입력 타입 |
| `toExpr` | function | ExprInput을 Expr AST로 변환하는 내부 헬퍼 (커스텀 빌더 작성 시 사용) |

-> See [docs/expression.md](./docs/expression.md) for details.

### Schema Builders

| API | Type | Description |
|-----|------|-------------|
| `Table` | function | TableBuilder 팩토리 함수 |
| `TableBuilder` | class | Fluent API로 테이블 스키마 정의 |
| `View` | function | ViewBuilder 팩토리 함수 |
| `ViewBuilder` | class | Fluent API로 뷰 스키마 정의 |
| `Procedure` | function | ProcedureBuilder 팩토리 함수 |
| `ProcedureBuilder` | class | Fluent API로 Stored Procedure 정의 |
| `ColumnBuilder` | class | Column 정의 빌더 (타입, nullable, autoIncrement, default) |
| `createColumnFactory` | function | Column 타입 팩토리 생성 (int, varchar, datetime 등) |
| `ColumnBuilderRecord` | type | Column builder 레코드 타입 |
| `InferColumns` | type | Column builder에서 실제 값 타입 추론 |
| `InferColumnExprs` | type | Column builder에서 expression 입력 타입 추론 |
| `RequiredInsertKeys` | type | INSERT용 필수 column key 추출 |
| `OptionalInsertKeys` | type | INSERT용 선택적 column key 추출 |
| `InferInsertColumns` | type | INSERT 타입 추론 |
| `InferUpdateColumns` | type | UPDATE 타입 추론 (모든 필드 optional) |
| `DataToColumnBuilderRecord` | type | 데이터 레코드를 Column builder 레코드로 변환 |
| `IndexBuilder` | class | Index 정의 빌더 (unique, orderBy) |
| `createIndexFactory` | function | Index 팩토리 생성 |
| `ForeignKeyBuilder` | class | FK 관계 빌더 (N:1, DB FK 생성) |
| `ForeignKeyTargetBuilder` | class | FK 역참조 빌더 (1:N, single 옵션) |
| `RelationKeyBuilder` | class | 논리적 관계 빌더 (N:1, DB FK 미생성) |
| `RelationKeyTargetBuilder` | class | 논리적 역참조 빌더 (1:N, DB FK 미생성) |
| `createRelationFactory` | function | 관계 빌더 팩토리 생성 |
| `RelationBuilderRecord` | type | 관계 builder 레코드 타입 |
| `ExtractRelationTarget` | type | FK에서 대상 타입 추출 (단일 객체) |
| `ExtractRelationTargetResult` | type | FKTarget에서 대상 타입 추출 (배열/단일) |
| `InferDeepRelations` | type | 관계 정의에서 심층 타입 추론 |

-> See [docs/schema-builders.md](./docs/schema-builders.md) for details.

### Models

| API | Type | Description |
|-----|------|-------------|
| `_Migration` | const | 시스템 마이그레이션 테이블 정의 (TableBuilder 인스턴스) |

-> See [docs/models.md](./docs/models.md) for details.

### Query Builder

| API | Type | Description |
|-----|------|-------------|
| `createQueryBuilder` | function | Dialect에 맞는 QueryBuilder 인스턴스 생성 |
| `QueryBuilderBase` | class | QueryDef -> SQL 문자열 변환 추상 클래스 |
| `ExprRendererBase` | class | Expr -> SQL 표현식 변환 추상 클래스 |
| `MysqlQueryBuilder` | class | MySQL용 QueryBuilder |
| `MysqlExprRenderer` | class | MySQL용 ExprRenderer |
| `MssqlQueryBuilder` | class | MSSQL용 QueryBuilder |
| `MssqlExprRenderer` | class | MSSQL용 ExprRenderer |
| `PostgresqlQueryBuilder` | class | PostgreSQL용 QueryBuilder |
| `PostgresqlExprRenderer` | class | PostgreSQL용 ExprRenderer |

-> See [docs/query-builder.md](./docs/query-builder.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `Dialect` | type | 지원 DB 방언: `"mysql" \| "mssql" \| "postgresql"` |
| `dialects` | const | 모든 Dialect 목록 배열 |
| `IsolationLevel` | type | 트랜잭션 격리 수준 |
| `DataRecord` | type | 쿼리 결과 데이터 레코드 타입 (재귀적) |
| `DbContextExecutor` | interface | DB 연결/쿼리 실행 인터페이스 |
| `QueryBuildResult` | interface | QueryBuilder.build() 반환 타입 |
| `ResultMeta` | interface | SELECT 결과 변환용 메타데이터 |
| `Migration` | interface | DB 마이그레이션 정의 |
| `parseQueryResult` | function | DB 쿼리 결과를 TypeScript 객체로 변환 (타입 파싱 + JOIN 중첩) |
| `DataType` | type | SQL 데이터 타입 정의 (int, varchar, datetime 등) |
| `ColumnPrimitiveMap` | type | TypeScript 타입 이름 -> 실제 타입 매핑 |
| `ColumnPrimitiveStr` | type | Column 원시 타입 이름 문자열 |
| `ColumnPrimitive` | type | Column에 저장 가능한 모든 원시 타입 |
| `dataTypeStrToColumnPrimitiveStr` | const | SQL DataType -> TypeScript 타입 이름 매핑 |
| `InferColumnPrimitiveFromDataType` | type | DataType에서 TypeScript 타입 추론 |
| `inferColumnPrimitiveStr` | function | 런타임 값에서 ColumnPrimitiveStr 추론 |
| `ColumnMeta` | interface | Column 메타데이터 |
| `DateUnit` | type | 날짜 단위: `"year" \| "month" \| "day" \| "hour" \| "minute" \| "second"` |
| `Expr` | type | 모든 표현식 AST의 유니온 타입 |
| `WhereExpr` | type | WHERE 절 표현식 AST 유니온 타입 |
| `WinSpec` | interface | Window 함수 스펙 (partitionBy, orderBy) |
| `WinFn` | type | Window 함수 유니온 타입 |
| `QueryDef` | type | 모든 쿼리 정의의 유니온 타입 |
| `SelectQueryDef` | interface | SELECT 쿼리 정의 |
| `InsertQueryDef` | interface | INSERT 쿼리 정의 |
| `UpdateQueryDef` | interface | UPDATE 쿼리 정의 |
| `DeleteQueryDef` | interface | DELETE 쿼리 정의 |
| `UpsertQueryDef` | interface | UPSERT 쿼리 정의 |
| `QueryDefObjectName` | interface | 테이블/뷰 이름 정의 (database, schema, name) |
| `DDL_TYPES` | const | DDL 타입 문자열 목록 |
| `DdlType` | type | DDL 타입 유니온 |
| 60+ `Expr*` interfaces | interface | 각 표현식 AST 인터페이스 (ExprColumn, ExprValue, ExprEq, ...) |
| 13+ `WinFn*` interfaces | interface | Window 함수 AST 인터페이스 |
| DDL QueryDef interfaces | interface | DDL 쿼리 정의 인터페이스 (CreateTable, DropTable, ...) |

-> See [docs/types.md](./docs/types.md) for details.

## Usage Examples

### 스키마 정의 및 DbContext 설정

```typescript
import { Table, View, Procedure, DbContext, expr } from "@simplysm/orm-common";

// 테이블 정의
const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    companyId: c.bigint().nullable(),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    company: r.foreignKey(["companyId"], () => Company),
    posts: r.foreignKeyTarget(() => Post, "author"),
  }));

// DbContext 정의
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);

  migrations = [
    { name: "001_init", up: async (db) => { await db.createTable(User); } },
  ];
}

const db = new MainDb(executor, { database: "mydb" });
```

### SELECT 쿼리

```typescript
await db.connect(async () => {
  // 기본 조회
  const users = await db.user()
    .where((u) => [expr.eq(u.isActive, true)])
    .orderBy((u) => u.name)
    .limit(0, 20)
    .execute();

  // JOIN + include
  const posts = await db.post()
    .include((p) => p.author)
    .include((p) => p.author.company)
    .execute();

  // 집계
  const count = await db.user()
    .where((u) => [expr.eq(u.isActive, true)])
    .count();
});
```

### 검색 파서

```typescript
import { parseSearchQuery } from "@simplysm/orm-common";

const parsed = parseSearchQuery('+apple -banana "exact phrase"');
// { must: ["%apple%", "%exact phrase%"], not: ["%banana%"], or: [] }

// Queryable.search()로 직접 사용
db.user().search((u) => [u.name, u.email], "John +admin -deleted");
```
