# @simplysm/orm-common

> DBMS 독립적인 ORM 코어 라이브러리. TypeScript Fluent API로 스키마를 정의하고, SQL AST(QueryDef)를 경유하여 MySQL/MSSQL/PostgreSQL 세 방언(dialect)의 SQL을 생성한다.
> 의존성은 `@simplysm/core-common` 전용이며, 실제 DB 연결은 `DbContextExecutor` 인터페이스로 위임한다.

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

## 하려는 작업 → 읽을 파일

### 스키마 정의

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 테이블 스키마를 정의할 때 (컬럼, PK, 인덱스) | [Table](./schema-builders/table.md) |
| 뷰 스키마를 정의할 때 | [View](./schema-builders/view.md) |
| Stored Procedure 스키마를 정의할 때 | [Procedure](./schema-builders/procedure.md) |
| 컬럼의 타입/nullable/autoIncrement/default를 설정할 때 | [ColumnBuilder](./schema-builders/column-builder.md) |
| 인덱스를 정의할 때 (유니크, 복합, 정렬 순서) | [IndexBuilder](./schema-builders/index-builder.md) |
| FK/역참조/논리적 관계를 정의할 때 (N:1, 1:N, 1:1) | [ForeignKeyBuilder](./schema-builders/foreign-key-builder.md) |

### DB 연결 및 초기화

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DbContext를 정의하고 테이블/프로시저를 등록할 때 | [DbContext](./core/db-context.md) |
| 연결/트랜잭션을 관리할 때 (connect, transaction) | [DbContext](./core/db-context.md) |
| Code First 초기화 및 마이그레이션을 실행할 때 | [DbContext](./core/db-context.md) |
| DDL 작업을 수행할 때 (createTable, addColumn 등) | [DbContext](./core/db-context.md) |
| 트랜잭션 에러를 DBMS 독립적으로 처리할 때 | [DbTransactionError](./core/db-transaction-error.md) |

### 쿼리 구성 및 실행

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| SELECT/INSERT/UPDATE/DELETE/UPSERT 쿼리를 체이닝으로 구성할 때 | [Queryable](./queryable-executable/queryable.md) |
| JOIN, include, 재귀 CTE, UNION 쿼리를 구성할 때 | [Queryable](./queryable-executable/queryable.md) |
| Stored Procedure를 실행할 때 | [Executable](./queryable-executable/executable.md) |
| 사용자 검색 텍스트를 SQL LIKE 패턴으로 변환할 때 | [parseSearchQuery](./queryable-executable/parse-search-query.md) |

### 표현식 작성

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| WHERE 조건을 작성할 때 (eq, gt, like, in, exists 등) | [expr](./expression/expr.md) |
| SELECT 표현식을 작성할 때 (concat, dateDiff, cast 등) | [expr](./expression/expr.md) |
| 집계 함수를 사용할 때 (sum, count, avg) | [expr](./expression/expr.md) |
| 윈도우 함수를 사용할 때 (rowNumber, rank, lag, lead) | [expr](./expression/expr.md) |
| CASE WHEN / IF 조건 분기를 작성할 때 | [expr](./expression/expr.md) |
| Raw SQL 표현식을 사용할 때 (DB 전용 함수) | [expr](./expression/expr.md) |
| 표현식 타입 래퍼를 이해할 때 | [ExprUnit](./expression/expr-unit.md) |

### SQL 생성 및 결과 파싱

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| QueryDef AST를 dialect별 SQL 문자열로 변환할 때 (테스트용) | [createQueryBuilder](./query-builder/create-query-builder.md) |
| DB 원시 결과를 중첩 TypeScript 객체로 변환할 때 (커스텀 executor용) | [parseQueryResult](./types/parse-query-result.md) |

### 타입 참조

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DB 방언 타입 및 격리 수준을 참조할 때 | [Dialect](./types/dialect.md) |
| SQL 데이터 타입 매핑을 참조할 때 | [DataType](./types/data-type.md) |
| SQL AST 구조를 이해할 때 | [QueryDef](./types/query-def.md) |
| 표현식 AST 구조를 이해할 때 | [Expr](./types/expr.md) |
| 마이그레이션 시스템 테이블을 참조할 때 | [_Migration](./models/migration.md) |

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
```

## 이 패키지를 쓰지 말아야 할 때

- 실제 DB 연결이 필요하면 `@simplysm/orm-node` (`NodeDbContextExecutor`)를 함께 사용한다. 이 패키지는 SQL AST 생성까지만 담당하고, DB 드라이버 연결은 제공하지 않는다.
- 서비스 클라이언트에서 서버를 경유하여 DB에 접근하려면 `@simplysm/service-client`의 `SdServiceDbContextExecutor`를 사용한다.

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
