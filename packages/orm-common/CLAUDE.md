# CLAUDE.md

> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/orm-common` - DBMS 독립적인 ORM 코어 라이브러리. TypeScript Fluent API로 스키마를 정의하고,
SQL AST(QueryDef)를 경유하여 MySQL/MSSQL/PostgreSQL 세 방언(dialect)의 SQL을 생성한다. 36개의 TypeScript 소스 파일로 구성된다.

의존성: `@simplysm/core-common` 전용. Node.js나 브라우저 런타임에 무관하게 동작하며,
실제 DB 연결은 `DbContextExecutor` 인터페이스로 위임한다.

## Architecture

```
src/
├── index.ts                    ← public API re-exports
├── db-context.ts               ← DbContext abstract class (class 기반 API)
├── errors/
│   └── db-transaction-error.ts ←   DbTransactionError, DbErrorCode
├── schema/                     ← 스키마 정의 빌더 (Fluent API)
│   ├── table-builder.ts        ←   Table() + TableBuilder
│   ├── view-builder.ts         ←   View() + ViewBuilder
│   ├── procedure-builder.ts    ←   Procedure() + ProcedureBuilder
│   └── factory/                ←   빌더 내부 팩토리
│       ├── column-builder.ts   ←     ColumnBuilder + createColumnFactory
│       ├── index-builder.ts    ←     IndexBuilder + createIndexFactory
│       └── relation-builder.ts ←     FK/역참조 빌더 + createRelationFactory
├── exec/                       ← 쿼리 실행 레이어
│   ├── queryable.ts            ←   SELECT/INSERT/UPDATE/DELETE 체인 빌더
│   ├── executable.ts           ←   Stored Procedure 호출 빌더
│   └── search-parser.ts        ←   검색 쿼리 → SQL LIKE 패턴 변환
├── expr/                       ← SQL 표현식 AST 빌더
│   ├── expr.ts                 ←   expr 네임스페이스 (eq, gt, sum, concat 등 60+ 함수)
│   └── expr-unit.ts            ←   ExprUnit / WhereExprUnit 래퍼
├── ddl/                        ← DDL QueryDef 생성기
│   ├── initialize.ts           ←   Code First 초기화 + migration 적용
│   ├── table-ddl.ts            ←   CREATE/DROP TABLE/VIEW/PROCEDURE
│   ├── column-ddl.ts           ←   ADD/DROP/MODIFY/RENAME COLUMN
│   ├── relation-ddl.ts         ←   PK/FK/INDEX DDL
│   └── schema-ddl.ts           ←   SCHEMA 레벨 DDL (clearSchema, truncate, switchFk)
├── query-builder/              ← QueryDef → SQL 문자열 변환
│   ├── query-builder.ts        ←   createQueryBuilder(dialect) 팩토리
│   ├── base/                   ←   QueryBuilderBase, ExprRendererBase (추상)
│   ├── mysql/                  ←   MySQL 구현체
│   ├── mssql/                  ←   MSSQL 구현체
│   └── postgresql/             ←   PostgreSQL 구현체
├── types/                      ← 핵심 타입 정의
│   ├── column.ts               ←   DataType, ColumnPrimitive, ColumnPrimitiveStr
│   ├── db.ts                   ←   Dialect, IsolationLevel, DbContextExecutor, Migration
│   ├── db-context-def.ts       ←   DbContextBase, DbContextDdlMethods, DbContextStatus
│   ├── expr.ts                 ←   Expr AST 타입 (60+ interface)
│   └── query-def.ts            ←   QueryDef (SELECT/INSERT/UPDATE/DELETE/DDL AST)
├── models/
│   └── system-migration.ts     ← _Migration 시스템 테이블 정의
└── utils/
    ├── result-parser.ts        ← SELECT 결과 → 중첩 객체 변환
    └── pick-result-sets.ts     ← 다중 결과 셋에서 필요한 셋만 추출
```

## Key Patterns

### 스키마 정의 (Fluent API)

모든 스키마 객체는 불변(immutable) 빌더로 정의하며, 메서드 체인마다 새 인스턴스를 반환한다.

모든 relation 빌더의 `description`/`single` 설정은 factory 함수의 opts 파라미터(마지막 인자)로 전달한다.
메서드 체이닝(`.description()`, `.single()`)은 TypeScript 순환 참조 시 TS7022를 유발하므로 전면 제거되었다.

```typescript
// 테이블 정의
export const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
    isActive: c.boolean().default(true),
    companyId: c.bigint().nullable(),
    createdAt: c.datetime(),
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("email").unique()])
  .relations((r) => ({
    company: r.foreignKey(["companyId"], () => Company, { description: "소속회사" }),  // N:1
    posts: r.foreignKeyTarget(() => Post, "user"),         // 1:N 역참조
    profile: r.foreignKeyTarget(() => Profile, "user", { single: true }),  // 1:1
  }));

// 뷰 정의
export const ActiveUsers = View("ActiveUsers")
  .query((db: TestDbTablesContext) =>
    db.user().where((u) => [expr.eq(u.isActive, true)])
  );

// Stored Procedure 정의
export const GetUserById = Procedure("GetUserById")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({ id: c.bigint(), name: c.varchar(100) }))
  .body("SELECT id, name FROM User WHERE id = userId");
```

### DbContext (class 기반 API)

`DbContext` abstract class를 상속하여 정의한다. `this.queryable()`/`this.executable()`로 테이블/프로시저를 등록한다.
각 프로퍼티가 독립 직렬화되어 40+ 테이블에서도 TS7056이 발생하지 않는다.

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  activeUsers = this.queryable(ActiveUsers);
  getUserById = this.executable(GetUserById);

  migrations = [{ name: "001", up: async (db) => { ... } }];
}

const db = new MainDb(executor, { database: "mydb", schema: "dbo" });

await db.connect(async () => {
  const users = await db.user().execute();
});
```

### 연결/트랜잭션 세 가지 패턴

| 메서드 | 용도 |
|--------|------|
| `connect(fn)` | 연결 -> 트랜잭션 시작 -> fn -> 커밋 -> 종료. 일반 DML 작업에 사용 |
| `connectWithoutTransaction(fn)` | 연결 -> fn -> 종료. 트랜잭션 없는 DDL/읽기 전용 작업에 사용 |
| `transaction(fn)` | 이미 연결된 상태에서 부분 트랜잭션 시작. `connectWithoutTransaction` 내부에서 사용 |

- `connect()`/`connectWithoutTransaction()`은 status가 `"ready"`가 아니면 에러를 던진다 (재진입 방지).
- 트랜잭션 중 DDL 실행은 런타임 에러를 발생시킨다.
- 롤백 실패 시 원래 에러의 `cause`에 롤백 에러를 첨부하여 전파한다.

### Queryable 체인 (DML 빌더)

`db.tableName()` 접근자가 `Queryable`을 반환하며, 메서드 체인으로 쿼리를 구성하고 `execute()`로 실행한다.

```typescript
// SELECT
const result = await db.user()
  .where((u) => [expr.eq(u.isActive, true), expr.gt(u.age, 18)])
  .select((u) => ({ id: u.id, fullName: expr.concat(u.name, " (", u.email, ")") }))
  .include((i) => i.company)
  .join("latestPost", (j, u) => j.from(Post).where((p) => [expr.eq(p.userId, u.id)]))
  .orderBy((u) => u.name)
  .limit(0, 20)
  .execute();

// INSERT
await db.user().insert([{ name: "Alice", createdAt: DateTime.now() }]);

// UPDATE
await db.user()
  .where((u) => [expr.eq(u.id, 1n)])
  .update(() => ({ isActive: expr.val("boolean", false) }));

// DELETE
await db.user()
  .where((u) => [expr.eq(u.id, 1n)])
  .delete();
```

### 표현식 빌더 (expr)

SQL 표현식을 AST로 표현한다. 문자열 SQL을 직접 작성하지 않고 `expr.*` 함수를 사용한다.

```typescript
import { expr } from "@simplysm/orm-common";

// 비교/논리
expr.eq(u.status, "active")
expr.gt(u.age, 18)
expr.like(u.name, "%Alice%")
expr.and([expr.eq(u.isActive, true), expr.gt(u.age, 18)])

// 집계/윈도우
expr.sum(o.amount)
expr.count(u.id)
expr.rowNumber({ partitionBy: [u.companyId], orderBy: [[u.createdAt, "DESC"]] })

// 문자열/날짜
expr.concat(u.firstName, " ", u.lastName)
expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today()))

// CASE WHEN
expr.switch()
  .case(expr.eq(u.status, "active"), "활성")
  .case(expr.eq(u.status, "inactive"), "비활성")
  .default("알 수 없음")

// 서브쿼리
expr.subquery("number", db.post().where((p) => [expr.eq(p.authorId, u.id)]))
```

### QueryBuilder (SQL 생성)

`Queryable.execute()` 내부에서 `QueryDef` AST를 생성하고, `createQueryBuilder(dialect).build(queryDef)`로
SQL 문자열로 변환한다. 직접 호출은 테스트 목적에만 사용한다.

```typescript
const builder = createQueryBuilder("mysql");  // | "mssql" | "postgresql"
const { sql } = builder.build(queryDef);
```

### 검색 파서

`parseSearchQuery(text)` 유틸리티로 사용자 입력 검색어를 SQL LIKE 패턴으로 변환한다.

```typescript
const parsed = parseSearchQuery("+apple -banana \"exact phrase\"");
// parsed.must = ["%apple%", "%exact phrase%"]
// parsed.not  = ["%banana%"]
// parsed.or   = []
```

### DbContextExecutor 인터페이스

실제 DB 연결 구현은 이 패키지 밖에서 제공한다(`orm-node`의 `NodeDbContextExecutor`, 또는
서비스 클라이언트 구현). 이 패키지는 인터페이스만 정의한다.

```typescript
interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}
```

### tsconfig 특이사항

`lib: ["ESNext", "WebWorker"]` 설정 -- Node/브라우저 양쪽에서 동작하므로 DOM 대신 WebWorker lib를 사용한다.

## Testing

**프레임워크**: Vitest

테스트 디렉토리가 기능 단위로 구성되어 있다:

```
tests/
├── setup/                ← 공유 픽스처
│   ├── models/           ←   User, Post, Company, Employee, Sales, MonthlySales
│   ├── views/            ←   ActiveUsers, UserSummary
│   ├── procedure/        ←   GetUserById, GetAllUsers
│   ├── TestDbContext.ts  ←   TestDb class + createTestDb() 팩토리
│   ├── MockExecutor.ts   ←   DbContextExecutor 목(mock) 구현체
│   └── test-utils.ts     ←   공통 테스트 헬퍼
├── db-context/           ← DbContext class 수락 테스트
├── dml/                  ← INSERT/UPDATE/DELETE/UPSERT SQL 생성 테스트
├── select/               ← SELECT 쿼리 SQL 생성 + result-meta 테스트
├── expr/                 ← 표현식 빌더 테스트 (comparison, string, math, date, conditional, utility)
├── ddl/                  ← DDL QueryDef 생성 + relation-target-options 수락 테스트
├── exec/                 ← Queryable 검색(search-parser) 테스트
├── executable/           ← Executable(Stored Procedure) SQL 생성 테스트
├── errors/               ← Queryable 에러 케이스 테스트
├── examples/             ← 실전 패턴 테스트 (pivot, unpivot, sampling)
├── types/                ← 타입 추론 테스트 (NullableQueryableRecord, 순환 참조 옵션)
├── utils/                ← result-parser 단위/성능 테스트
└── escape.spec.ts        ← ExprRenderer 문자열 이스케이프 테스트
```

모든 SQL 생성 테스트는 dialect별로 기댓값을 별도 파일(`*.expected.ts`)에 분리하여 관리한다.

```typescript
// 전형적인 SQL 생성 테스트 패턴
import { createTestDb } from "../setup/TestDbContext";
import { createQueryBuilder } from "../../src/query-builder/query-builder";

describe("INSERT SQL", () => {
  it.each(dialects)("[%s] basic insert", (dialect) => {
    const db = createTestDb();
    const queryDef = db.user().getInsertQueryDef([{ name: "Alice", createdAt: DateTime.now() }]);
    const { sql } = createQueryBuilder(dialect).build(queryDef);
    expect(sql).toBe(expected[dialect]);
  });
});
```

TestDbContext는 DbContext를 상속하며 `this.queryable()`/`this.executable()`로 테스트용 테이블/프로시저를 등록한다.
테스트에서만 사용하는 픽스처(MockExecutor, 테스트용 테이블 정의)는 반드시 `tests/setup/`에만
위치시키고 `src/`에 넣지 않는다.
