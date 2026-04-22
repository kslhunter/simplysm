# @simplysm/orm-common

DBMS 독립적인 ORM 코어 라이브러리. TypeScript Fluent API로 스키마를 정의하고, SQL AST(QueryDef)를 경유하여 MySQL/MSSQL/PostgreSQL 세 방언(dialect)의 SQL을 생성한다.

## 스키마 정의 지침

**CRITICAL: 컬럼은 `NOT NULL` 기본. `.nullable()`/`.default(...)` 모두 "쓰지 않는 것이 기본"이며, 도메인상 정당한 근거가 있을 때만 붙인다.**

### `.nullable()` 사용 기준

- 값이 없을 수 있는 근거가 **도메인 모델 자체**에 있을 때만 허용한다.
  - 허용 예: 선택 입력 필드(회원가입 시 선택적으로 받는 전화번호), 아직 발생하지 않은 이벤트 시각(`deletedAt`, `completedAt`), 선택적 외래키(소속이 없을 수 있는 사용자의 `companyId`).
- 아래 이유로는 절대(NEVER) nullable로 만들지 않는다:
  - "초기값을 정하기 애매해서" → nullable도 default도 답이 아니다. 도메인상 값이 반드시 있어야 하면 INSERT 시점에 호출자가 넣도록 강제한다.
  - "마이그레이션 중간 단계에서 값이 없을 수 있어서" → 마이그레이션 스크립트에서 backfill 후 `NOT NULL`로 전환한다.
  - "어떤 값을 넣어야 할지 몰라서" → 사용자에게 질문한다. 추측으로 nullable 처리 금지.

### `.default(...)` 사용 기준

- 기본값은 **DB가 값을 결정해야 하는 경우**에만 지정한다. 애플리케이션 코드로 결정 가능한 값은 default로 넣지 않는다.
  - 허용 예: `CURRENT_TIMESTAMP` 같이 DB 시각을 기준으로 해야 하는 경우, DB 차원에서 불변 상수로 고정되어야 하는 경우.
  - 금지 예: "보통 0이니까 `.default(0)`", "대부분 false니까 `.default(false)`", "빈 문자열로 초기화" 등 **의미 없는 기본값으로 NOT NULL 제약을 우회하는 행위**.
- default가 있으면 호출자가 값을 빼먹어도 insert가 성공해버려, 정작 필수값이 누락된 채 DB에 들어간다. 정합성은 호출자의 명시적 전달로 지킨다.

판단이 애매하면 반드시 **사용자에게 질문**한다. nullable/default 여부는 데이터 정합성의 핵심이므로 임의 결정 금지.

## 삭제 전략 지침

데이터 성격에 따라 soft delete와 물리 delete를 구분하여 적용한다.

### Soft Delete 권장 — 기초정보(마스터 데이터)

품목, 거래처, 사용자, 부서, 창고 등 **다른 테이블에서 FK로 참조되는 기초정보**는 soft delete를 사용한다.
- 이미 발행된 문서가 참조하고 있으므로, 물리 삭제 시 FK 무결성이 깨진다.
- `isDisabled` 등의 컬럼으로 비활성 처리하고, 조회 시 필터링한다.

### 물리 Delete 권장 — 프로세스 문서(트랜잭션 데이터)

입고지시, 입고, 출고지시, 출고, 주문, 검수 등 **업무 프로세스상 생성·처리·완료되는 문서**는 물리 delete를 사용한다.
- 문서는 생성-진행-완료의 생명주기를 가지며, 취소/삭제 시 관련 데이터(상세 행 포함)를 함께 물리 삭제한다.
- soft delete로 남기면 삭제된 문서가 집계·조회에 혼입되는 버그 원인이 된다.
- **FK 참조 차단**: 물리 삭제 전에 해당 레코드를 FK로 참조하는 다른 테이블의 데이터가 존재하는지 확인하고, 존재하면 삭제를 차단하며 사용자에게 안내 메시지를 출력한다 (예: "해당 입고지시를 참조하는 입고 데이터가 존재하여 삭제할 수 없습니다").

## Installation

```bash
npm install @simplysm/orm-common
```

## API Overview

### Core

| Entry | Kind | Description |
|-------|------|-------------|
| [`DbContext`](./docs/core/db-context.md) | class | DB 연결/트랜잭션/DDL/초기화를 제공하는 추상 클래스 |
| [`DbTransactionError`](./docs/core/db-transaction-error.md) | class | DBMS 트랜잭션 에러를 표준화된 에러 코드로 래핑 |

### Queryable / Executable

| Entry | Kind | Description |
|-------|------|-------------|
| [`Queryable`](./docs/queryable-executable/queryable.md) | class | SELECT/INSERT/UPDATE/DELETE/UPSERT 체인 빌더 |
| [`Executable`](./docs/queryable-executable/executable.md) | class | Stored Procedure 실행 래퍼 |
| [`parseSearchQuery`](./docs/queryable-executable/parse-search-query.md) | function | 사용자 검색 텍스트 → SQL LIKE 패턴 변환 |

### Expression

| Entry | Kind | Description |
|-------|------|-------------|
| [`expr`](./docs/expression/expr.md) | const | Dialect 독립적 SQL 표현식 빌더 네임스페이스 |
| [`ExprUnit`](./docs/expression/expr-unit.md) | class | 타입 안전 표현식 래퍼 |

### Schema Builders

| Entry | Kind | Description |
|-------|------|-------------|
| [`Table`](./docs/schema-builders/table.md) | function | Table 스키마 정의 빌더 팩토리 |
| [`View`](./docs/schema-builders/view.md) | function | View 스키마 정의 빌더 팩토리 |
| [`Procedure`](./docs/schema-builders/procedure.md) | function | Stored Procedure 스키마 정의 빌더 팩토리 |
| [`ColumnBuilder`](./docs/schema-builders/column-builder.md) | class | 컬럼 타입/옵션 정의 빌더 |
| [`IndexBuilder`](./docs/schema-builders/index-builder.md) | class | 인덱스 정의 빌더 |
| [`ForeignKeyBuilder`](./docs/schema-builders/foreign-key-builder.md) | class | FK/역참조/논리적 관계 빌더들 |

### Models

| Entry | Kind | Description |
|-------|------|-------------|
| [`_Migration`](./docs/models/migration.md) | const | 시스템 마이그레이션 테이블 정의 |

### Query Builder

| Entry | Kind | Description |
|-------|------|-------------|
| [`createQueryBuilder`](./docs/query-builder/create-query-builder.md) | function | Dialect별 QueryBuilder 팩토리 및 구현체 |

### Types

| Entry | Kind | Description |
|-------|------|-------------|
| [`Dialect`](./docs/types/dialect.md) | type | DB 방언 및 관련 런타임 타입 모음 |
| [`DataType`](./docs/types/data-type.md) | type | SQL 데이터 타입 및 컬럼 타입 매핑 |
| [`QueryDef`](./docs/types/query-def.md) | type | SQL AST 정의 타입 모음 |
| [`Expr`](./docs/types/expr.md) | type | SQL 표현식 AST 타입 모음 |
| [`parseQueryResult`](./docs/types/parse-query-result.md) | function | DB 원시 결과 → 중첩 TypeScript 객체 변환 |

## Usage Examples

```typescript
import { DbContext, Table, expr } from "@simplysm/orm-common";

// 스키마 정의
const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .primaryKey("id");

// DbContext 정의
class MainDb extends DbContext {
  user = this.queryable(User);
  migrations = [
    { name: "001_init", up: async (db) => { await db.createTable(User); } },
  ];
}

// 쿼리 실행
const db = new MainDb(executor, { database: "mydb" });
await db.connect(async () => {
  const users = await db.user()
    .where((u) => [expr.eq(u.name, "Alice")])
    .orderBy((u) => u.name)
    .execute();
});
