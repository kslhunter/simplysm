# orm-common 개발 가이드

> **주의:** `sd-orm-common`(구버전)은 참고 금지.

## 아키텍처

```
[브라우저]              [서버]
Queryable → QueryDef → QueryBuilder → SQL
(사용자 API)  (JSON)     (렌더링)
```

**핵심**: Queryable에 dialect 분기 금지. 모든 DB 차이는 QueryBuilder에서 처리.

## Database/Schema 네이밍

### DBMS별 네임스페이스

| DBMS           | 테이블 참조             | SimplySM 파라미터                              |
| -------------- | ----------------------- | ---------------------------------------------- |
| **MySQL**      | `database.table`        | `database` (schema 무시)                       |
| **MSSQL**      | `database.schema.table` | `database` + `schema` (기본: dbo)              |
| **PostgreSQL** | `schema.table`          | `schema` (기본: public), database는 connection |

**핵심**:

- **PostgreSQL**: 다른 DB 참조 불가 → SQL에서 `schema.table`만
- **MSSQL**: 다른 DB 참조 가능 → SQL에서 `database.schema.table`
- **MySQL**: schema 개념 없음 → SQL에서 `database.table`

### tableName 메서드

```typescript
// PostgreSQL - schema만
protected tableName(obj: QueryDefObjectName): string {
  const schema = obj.schema ?? "public";
  return `"${schema}"."${obj.name}"`;  // "public"."User"
}

// MSSQL - database + schema
protected tableName(obj: QueryDefObjectName): string {
  const schema = obj.schema ?? "dbo";
  return `[${obj.database}].[${schema}].[${obj.name}]`;  // [TestDb].[dbo].[User]
}

// MySQL - database만
protected tableName(obj: QueryDefObjectName): string {
  return `\`${obj.database}\`.\`${obj.name}\``;  // `TestDb`.`User`
}
```

### clearSchema / schemaExists 메서드

```typescript
// 인터페이스
interface ClearSchemaQueryDef {
  type: "clearSchema";
  database: string;
  schema?: string; // PostgreSQL/MSSQL용
}
```

**구현 차이**:

- **PostgreSQL**: schema만 필터링 (기본: public)
- **MSSQL**: database + schema 필터링 (기본: dbo)
- **MySQL**: database 전체 정리 (schema 무시)

### 사용 예시

```typescript
// PostgreSQL
const User = new TableBuilder({
  name: "User",
  database: "mydb", // connection용
  schema: "myschema", // SQL용
});
// SQL: "myschema"."User"

// MSSQL
const User = new TableBuilder({
  name: "User",
  database: "TestDb",
  schema: "custom", // 기본: dbo
});
// SQL: [TestDb].[custom].[User]

// MySQL
const User = new TableBuilder({
  name: "User",
  database: "TestDb",
});
// SQL: `TestDb`.`User`
```

## Dynamic Alias Generation

서브쿼리/JOIN/재귀 CTE에서 alias 충돌 방지를 위해 동적 alias 사용 (T1, T2, T3...).

**구조**:

- DbContext에 카운터 (`_aliasCounter`)
- `queryable(db, Table)` → `() => Queryable` 함수 반환
- 함수 호출 시마다 `db.getNextAlias()` 실행
- `connectAsync()` 실행 시 카운터 초기화

**예시**:

```typescript
db.user() // T1
  .where((u) => [
    expr.exists(
      db
        .post() // T2
        .where((p) => [expr.eq(p.userId, u.id)]),
    ),
  ]);
// → WHERE EXISTS (SELECT 1 FROM ... AS T2 WHERE T2.userId <=> T1.id)
```

## QueryBuilder 설계

### 상속 구조

```
QueryBuilderBase (추상)        ExprRendererBase (추상)
├── MysqlQueryBuilder          ├── MysqlExprRenderer
├── MssqlQueryBuilder          ├── MssqlExprRenderer
└── PostgresqlQueryBuilder     └── PostgresqlExprRenderer
```

**원칙**:

- Base에는 100% 동일한 로직만 (dispatch)
- 조금이라도 다르면 abstract 선언
- 각 dialect에서 중복이어도 전부 구현 (명확함 우선)

```typescript
// ✅ Base - dispatch만
abstract class QueryBuilderBase {
  build(def: QueryDef): string {
    switch (def.type) {
      case "select":
        return this.buildSelect(def);
    }
  }
  protected abstract buildSelect(def: SelectQueryDef): string;
}

// ✅ Dialect - 전부 구현
class MysqlQueryBuilder extends QueryBuilderBase {
  protected buildSelect(def: SelectQueryDef): string {
    /* MySQL */
  }
}
```

## 컬럼 타입 DBMS별 차이

### 타입 매핑 일관성

모든 DBMS에서 비슷한 크기와 기능을 가지도록 타입 매핑:

| 타입 | MySQL | MSSQL | PostgreSQL | 크기 |
|------|-------|-------|-----------|------|
| **float** | FLOAT | **REAL** | REAL | 4 bytes |
| **binary** | LONGBLOB | VARBINARY(MAX) | BYTEA | MAX |
| **uuid** | **BINARY(16)** | UNIQUEIDENTIFIER | UUID | 16 bytes |

**주요 변경사항:**
- float: MSSQL이 FLOAT(8 bytes) 대신 REAL(4 bytes) 사용 (MySQL/PostgreSQL과 동일)
- binary: length 파라미터 제거, 항상 MAX 크기 사용
- UUID: MySQL이 CHAR(36) 대신 BINARY(16) 사용 (스토리지 55% 절약)

### 결과 일관성

모든 DB에서 동일한 동작을 보장:

| 기능           | MySQL                     | MSSQL                | PostgreSQL             |
| -------------- | ------------------------- | -------------------- | ---------------------- |
| INSERT output  | `SELECT LAST_INSERT_ID()` | `OUTPUT INSERTED.id` | `RETURNING id`         |
| Null-safe 비교 | `<=>`                     | `IS NULL OR =`       | 좌동                   |
| concat null    | `IFNULL(arg, '')`         | `ISNULL(arg, '')`    | `COALESCE(arg, '')`    |
| TRUNCATE       | `TRUNCATE TABLE t`        | 좌동                 | `... RESTART IDENTITY` |

### 렌더링 규칙

| 항목              | 규칙                                   |
| ----------------- | -------------------------------------- |
| **비교**          | 무조건 null-safe                       |
| **concat/length** | null 처리는 QueryBuilder에서 dialect별 |
| **LIKE**          | 이스케이프 `\`, `ESCAPE '\'` 항상 추가 |
| **ExprExists**    | `SELECT 1`                             |
| **AddForeignKey** | FK 인덱스 생성                         |

### search() FTS/LIKE

- 기본: LIKE
- FTS: 테이블에 FT Index + 검색 컬럼 포함
- FTS 폴백: 검색어 중간에 `*` 있으면 LIKE

### UPSERT

항상 EXISTS 패턴 (USING 미사용):

- **MSSQL**: `MERGE ... USING (SELECT 1)`
- **PostgreSQL**: `WITH ... UPDATE ... INSERT WHERE NOT EXISTS`
- **MySQL**: `UPDATE + INSERT WHERE NOT EXISTS` (프로시저 문법 미사용)

### UNPIVOT 및 LATERAL JOIN

서브쿼리가 외부 테이블 컬럼을 참조하는 경우 LATERAL JOIN 필요 (`needsLateral()` 메서드로 자동 감지):

- **MySQL/PostgreSQL**: `LEFT OUTER JOIN LATERAL`
- **MSSQL**: `OUTER APPLY` (ON 절 없음)

### Multi-Statement

| Dialect    | 결과 처리                 |
| ---------- | ------------------------- |
| MSSQL      | statement마다 분리        |
| MySQL      | 배열의 배열               |
| PostgreSQL | **단일 배열** (분리 안됨) |

**중요**: index 0이 아닌 결과 원하면 `resultSetIndex` 지정 필수.

## DDL 타입

`DbContext.executeDefsAsync`는 트랜잭션 내 DDL 차단. 새 DDL QueryDef 추가 시 `ddlTypes` 배열 업데이트.

## 테스트

### QueryDef 검증

전체 def 비교 (필드 누락 방지):

```typescript
// ✅ 전체 비교
expect(def).toEqual({
  type: "select",
  as: "TBL",
  from: { database: "TestDb", name: "User" },
});

// ❌ 부분 비교 금지
expect(def.type).toBe("select");
```

### 테스트 템플릿

```typescript
// spec 파일
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import * as expected from "./xxx.expected";

describe("테스트명", () => {
  const db = new TestDbContext();
  const def = db.table.select(...).getSelectQueryDef();

  it("QueryDef 검증", () => {
    expect(def).toEqual({ ... });
  });

  it.each(dialects)("[%s] SQL 검증", (dialect) => {
    const builder = createQueryBuilder(dialect);
    expect(builder.build(def)).toMatchSql(expected.xxx[dialect]);
  });
});
```

```typescript
// expected 파일
import { mysql, pgsql, tsql } from "@simplysm/core-common";

export const xxx = {
  mysql: mysql`SELECT ... FROM \`TestDb\`.\`Employee\``,
  mssql: tsql`SELECT ... FROM [TestDb].[dbo].[Employee]`,
  postgresql: pgsql`SELECT ... FROM "TestDb"."public"."Employee"`,
};
```

### Schema 기본값

| Dialect    | 기본값   | FROM                           |
| ---------- | -------- | ------------------------------ |
| MySQL      | 없음     | `` `TestDb`.`Employee` ``      |
| MSSQL      | `dbo`    | `[TestDb].[dbo].[Employee]`    |
| PostgreSQL | `public` | `"TestDb"."public"."Employee"` |

### 테스트 실패 시 수정 절차

**중요**: actual을 expected에 적용할지 로직 수정할지 먼저 사용자에게 확인.

테스트 코드를 actual과 맞추기로 결정한 경우:

#### 1. 실패한 테스트 실행

```bash
npx vitest run packages/orm-common/tests/xxx.spec.ts -t "테스트명"
```

#### 2. vitest 에러 메시지 확인

```
- Expected
+ Received (이것이 actual)

  {
-   "as": "TBL",
+   "as": "T1",
```

#### 3. spec 파일 수정

`+ Received`를 복사하여 `expect(def).toEqual({...})` 수정.

#### 4. expected.ts 파일 수정

`Received` SQL을 복사하여 expected 파일 수정.

#### 5. 재실행 및 확인

```bash
npx vitest run packages/orm-common/tests/xxx.spec.ts -t "테스트명"
```

**주의**: 문제 발생시 바로 수정 금지, 원인분석 및 수정방법을 사용자에게 제안

#### 6. expected 쿼리 품질 검증

**중요**: expected가 작성 혹은 수정 되었을 경우, expected내 쿼리에 대해 다음을 반드시 검토해야 함:

- 실제 DB에 요청되었을 때 문제가 없는지 (문법 오류, 실행 불가 쿼리)
- 성능 개선점은 없는지 (불필요한 서브쿼리, 비효율적 조인 등)
- 가독성 및 유지보수성 개선 가능 여부

테스트 통과가 목적이 아니라, 실제 프로덕션에서 사용될 품질의 SQL 생성이 목표.
수정 방법을 사용자에게 제안

## Stored Procedure

### params/returns 자동 생성

params와 returns를 정의하면 QueryBuilder가 자동으로 DBMS별 SQL 생성:

**DBMS별 문법:**
- **MySQL**: `IN paramName TYPE`, body는 BEGIN...END
- **MSSQL**: `@paramName TYPE`, SET NOCOUNT ON 자동 추가
- **PostgreSQL**: `paramName TYPE`, `RETURNS TABLE(...)`, plpgsql 언어

**body 작성 주의사항:**
- **변수명 차이**: MySQL/PostgreSQL은 `paramName`, MSSQL은 `@paramName`
- **반환 방식**: PostgreSQL은 `RETURN QUERY SELECT ...` 필요
- **사용자가 DBMS별로 직접 작성** (ExprRenderer 미사용)

**예시:**
```typescript
const GetUserById = Procedure("GetUserById")
  .params((c) => ({ userId: c.bigint() }))
  .returns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
  }))
  .body(`
    -- MySQL
    SELECT id, name FROM User WHERE id = userId;

    -- MSSQL
    SELECT id, name FROM [User] WHERE id = @userId;

    -- PostgreSQL
    RETURN QUERY SELECT id, name FROM "User" WHERE id = userId;
  `);
```

## 설계 결정 (YAGNI 적용)

다음 기능들은 실제 필요성이 없어 구현하지 않음:

### insertAsync chunkSize 사용자 조정

- 1000개 고정 (MSSQL 제한에 맞춤)

### include() depth 제한

- 제한하지 않음. 무한정 가능

### queryable.ts 파일 분리 (1,363줄)

- `#region`으로 17개 섹션 분리로 충분히 관리 가능
- 파일 분리 시 순환 의존성 위험
- IDE 코드 폴딩으로 탐색 용이

### API 오버로드 단순화

- `insertAsync()` 등이 4~6개 오버로드 시그니처 보유
- 하지만 TypeScript 표준 패턴이며 타입 추론 정상 동작

## 테스트 커버리지 현황

### 전체 통계 (2026-01-07 기준)

```
전체 테스트: 1,140개
테스트 파일: 34개
실행 시간: ~2.6초
통과율: 100%
```

### 카테고리별 분포

| 카테고리 | 테스트 수 | 주요 파일 | 평가 |
|---------|----------|----------|------|
| **SELECT** | 276+ | basic(72), filter(83), join(22), group(24) | 우수 |
| **DML** | 100+ | insert(36), update(28), delete(20), upsert(16) | 우수 |
| **DDL** | 292+ | table(28), column(80), index(28), basic(104) | 매우 우수 |
| **Expression** | 281+ | comparison(49), string(56), date(83), math(16) | 매우 우수 |
| **Advanced** | 56+ | pivot(32), sampling(12), unpivot(12) | 우수 |
| **Procedure** | 8 | executable(8) | 양호 |
| **Error** | 10 | queryable-errors(4), db-transaction-error(6) | 양호 |

### 테스트 구조 일관성

모든 테스트가 동일한 구조를 따름:

```typescript
describe("기능", () => {
  const db = new TestDbContext();
  const def = db.table().getSelectQueryDef();

  it("QueryDef 검증", () => {
    expect(def).toEqual({ ... });
  });

  it.each(dialects)("[%s] SQL 검증", (dialect) => {
    const builder = createQueryBuilder(dialect);
    expect(builder.build(def)).toMatchSql(expected.xxx[dialect]);
  });
});
```

**장점:**
- QueryDef 검증 + SQL 검증 이중화
- Dialect별 테스트 자동화 (mysql, mssql, postgresql)
- Expected 파일과 분리로 유지보수 용이

**특징:**
- 모든 카테고리에서 충분한 테스트 커버리지 확보
- QueryDef 검증과 SQL 검증 이중화로 견고성 보장
- DBMS별 자동 테스트로 Dialect 호환성 보장
