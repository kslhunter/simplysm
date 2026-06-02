# @simplysm/orm-common

Dialect 독립 ORM 코어. 테이블/뷰/프로시저를 빌더로 정의하고, `DbContext` 클래스에 등록한 뒤, 체이닝 `Queryable` 로 타입 안전한 SELECT/CUD 쿼리를 JSON AST(`QueryDef`/`Expr`)로 조립한다. 실제 SQL 변환·DB 연결은 dialect QueryBuilder(이 패키지) + `@simplysm/orm-node` 등 executor 가 담당.

## 사용 트리거 인덱스

- **스키마 정의 (Table/View/Procedure/Column/Index/Relation 빌더)** — DB 객체를 fluent 빌더로 선언하고 column·PK·index·FK 관계를 잡을 때. 자세히: [schema.md](./schema.md)
- **DbContext (연결·트랜잭션·DDL·마이그레이션·초기화)** — 빌더들을 한 컨텍스트에 등록하고 `connect`/`transaction` 으로 실행, DDL·migration·`initialize` 를 돌릴 때. 자세히: [db-context.md](./db-context.md)
- **Queryable (SELECT/JOIN/INSERT/UPDATE/DELETE/UPSERT 체이닝)** — `db.user()` 로 받은 쿼리 빌더에 where/orderBy/join/include/group/recursive/union 을 걸고 execute/single/count/insert/update/delete/upsert 를 호출할 때. 자세히: [queryable.md](./queryable.md)
- **expr (SQL 표현식 빌더)** — where/select/orderBy 콜백 안에서 비교·문자열·숫자·날짜·집계·조건·window·서브쿼리 표현식을 만들 때. 자세히: [expr.md](./expr.md)
- **QueryDef / Expr / Column 타입** — executor·QueryBuilder 를 직접 구현하거나 AST·결과 메타를 다룰 때 참조하는 타입군. 자세히: [types.md](./types.md)
- **QueryBuilder (dialect SQL 렌더러)** — QueryDef 를 mysql/mssql/postgresql SQL 로 변환하는 클래스. executor 구현체가 사용. 자세히: [query-builder.md](./query-builder.md)
- **결과 파싱 유틸 / 검색 파서 / 프로시저 실행 / 에러** — 아래 인라인 섹션 참조.

## Executable / executable (프로시저 실행)

저장 프로시저를 `DbContext.executable(Procedure)` 로 등록하면 `() => Executable` 팩토리가 반환된다. `Executable` 은 프로시저 실행 래퍼.

- `executable(db: DbContextBase, builder: ProcedureBuilder): () => Executable` — DbContext 내부에서 프로시저 getter 를 만드는 팩토리. 보통 `DbContext.executable()` 보호 메서드가 대신 호출.
- `Executable.execute(params): Promise<TReturns[][]>` — 프로시저 실행. `params` 는 `ProcedureBuilder.params()` 로 정의한 키별 값(리터럴 또는 ExprUnit). 결과는 결과셋 배열의 배열.
- `Executable.getExecProcQueryDef(params?)` — 실행용 `ExecProcQueryDef` 생성. 파라미터 미정의 프로시저에 값 전달 시 throw.

```typescript
const result = await db.getUserById().execute({ userId: 1 });
```

## 결과 파싱 유틸

executor 가 DB raw 결과를 TS 객체로 환원할 때 쓰는 유틸. 일반 사용자는 직접 호출하지 않음.

- `parseQueryResult<T>(rawResults, meta: ResultMeta): Promise<T[] | undefined>` — flat raw 행 배열을 `meta.columns`(키→타입) 로 타입 변환하고 `meta.joins`(키→`{isSingle}`) 로 중첩 그룹핑. 입력이 비었거나 파싱 후 전부 빈 객체면 undefined. async 전용(100행마다 이벤트 루프 양보). `isSingle:true` 관계에 서로 다른 다건이 매칭되면 throw.
- `pickResultSets<T>(rawResults: T[][], buildResult): T[]` — 다중 결과셋에서 필요분 추출. `resultSetIndex` 없으면 첫 셋, `resultSetStride` 없으면 해당 인덱스 셋, 있으면 인덱스부터 stride 간격으로 concat(MySQL 배치 INSERT 의 SELECT 결과만 모을 때).

## 검색 파서

`Queryable.search()` 내부에서 쓰이며, 검색 문법 문자열을 SQL LIKE 패턴으로 변환.

- `parseSearchQuery(searchText: string): ParsedSearchQuery` — 검색 문자열 파싱. 반환 `{ or, must, not }` 각각 LIKE 패턴 배열.
  - `or: string[]` — 공백 구분 일반 토큰(OR, 하나 이상 일치). 와일드카드 없는 토큰은 `%토큰%`(부분 일치).
  - `must: string[]` — `+토큰` 또는 `"정확한 구문"`(AND, 필수 포함).
  - `not: string[]` — `-토큰`(NOT, 제외).
  - 문법: `term1 term2`(OR), `+term`(필수), `-term`(제외), `"구문"`(정확·필수), `*`(와일드카드→`%`). 이스케이프 `\\ \* \% \" \+ \-`. 닫히지 않은 따옴표는 일반 텍스트.
- `interface ParsedSearchQuery` — 위 `or`/`must`/`not` 세 LIKE 패턴 배열을 담는 타입.

## 에러 (DbTransactionError / DbErrorCode)

DBMS 네이티브 트랜잭션 에러를 표준 코드로 래핑. `connect`/`transaction` 의 롤백 경로에서 발생.

- `class DbTransactionError extends Error` — 표준화된 트랜잭션 에러.
  - `code: DbErrorCode` — 표준 에러 코드.
  - `message: string` — 에러 메시지(생성자 2번째 인자).
  - `originalError?: unknown` — 원본 DBMS 에러(디버깅용).
  - `name` — 항상 `"DbTransactionError"`.
- `enum DbErrorCode` — 표준 트랜잭션 에러 코드.
  - `NO_ACTIVE_TRANSACTION` — 활성 트랜잭션 없는데 ROLLBACK 시도. 롤백 중 이 코드면 `connect`/`transaction` 이 무시(원 에러 보존).
  - `TRANSACTION_ALREADY_STARTED` — 이미 트랜잭션 시작됨.
  - `DEADLOCK` — 데드락 발생.
  - `LOCK_TIMEOUT` — 잠금 타임아웃.

```typescript
try {
  await db.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError && err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) return;
  throw err;
}
```
