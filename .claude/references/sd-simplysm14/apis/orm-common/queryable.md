# @simplysm/orm-common — Queryable (쿼리 작성·실행 · 프로시저 · 검색)

`db.user()` 처럼 컨텍스트 멤버를 호출하면 `Queryable<TData, TFrom>` 를 받는다. immutable 체이닝으로 옵션·필터·조인·그룹을 쌓고, 종단 메서드(`execute`/`single`/`count`/`insert`/...)로 실행한다. where/select/orderBy 콜백 안에서는 [expr.md](./expr.md) 의 `expr` 로 표현식을 만든다. 프로시저는 `Executable`, 텍스트 검색 구문은 `parseSearchQuery` 가 처리한다.

표준 조회 흐름(orm.md): `db.X()` → `joinSingle` 로 도출 컬럼 부착 → `select` 로 모든 도출을 한 번에 projection → projected 컬럼 이름으로 `where`/`orderBy` → `count` → `orderBy().limit().execute()`. SELECT 절에 `expr.subquery`/`expr.exists` 를 넣지 말고 `joinSingle` 로 1회 부착, `wrap()` 은 `distinct`/`groupBy` 뒤 `count` 등 프레임워크가 요구할 때만 사용.

## Queryable — 조립 메서드 (체이닝)

옵션:

- `select(fn)` — SELECT column 재정의. `fn(columns) => R` 의 R 이 새 결과 형태. 리터럴 상수는 자동으로 ExprUnit 래핑. 호출 후 CUD 불가(`TFrom` 소실).
- `distinct()` — DISTINCT 적용. 이후 `count()` 하려면 `wrap()` 필요.
- `lock()` — 행 잠금(FOR UPDATE). 트랜잭션 안에서 선택 행 배타 잠금. CUD 가능 상태 유지.

제한:

- `top(count)` — 상위 N행. ORDER BY 없이도 사용 가능.
- `limit(skip, take)` — 페이지네이션 OFFSET/LIMIT. `skip`=건너뛸 수, `take`=가져올 수. **먼저 `orderBy()` 호출 필수** — 없으면 throw.

정렬:

- `orderBy(fnOrKey, orderBy?)` — 정렬 추가(여러 번 호출 시 순서대로). `fnOrKey`=정렬 column 반환 함수 또는 체인 경로 문자열(`"user.name"`, 동적 정렬용). `orderBy`="ASC"|"DESC"(기본 ASC).

필터:

- `where(predicate)` — WHERE 조건 추가(여러 번 호출 시 AND 결합). `predicate(columns) => WhereExprUnit[]`. 배열 내 여러 조건도 AND.
- `search(fn, searchText)` — 텍스트 검색. `fn(columns) => ExprUnit<string|undefined>[]`(검색 대상 column 들), `searchText`=검색 구문(아래 `parseSearchQuery` 문법). 빈 문자열이면 무변경. 공백=OR, `+`=필수(AND), `-`=제외(NOT), `"구문"`=정확 일치(필수). 내부적으로 `expr.like(expr.lower(col), pattern)` 로 대소문자 무시 매칭.

그룹:

- `groupBy(fn)` — GROUP BY. `fn(columns) => ExprUnit<ColumnPrimitive>[]`. 호출 후 CUD 불가.
- `having(predicate)` — GROUP BY 이후 필터. `predicate(columns) => WhereExprUnit[]`.

조인:

- `join(as, fn)` — 1:N LEFT JOIN, 결과에 **배열**(`{ [as]?: R[] }`)로 부착. `fn(qr, parentCols) => Queryable` 안에서 `qr.from(Table).where(...)` 로 조인 본문 구성.
- `joinSingle(as, fn)` — N:1/1:1 LEFT JOIN, 결과에 **단일 객체**(`{ [as]?: R }`)로 부착. 도출 컬럼(집계·boolean)을 outer 행에 붙일 때 표준 수단.
- `include(fn)` — 빌더에 정의한 FK/FKT/RelationKey 관계 자동 JOIN. `fn(item) => item.user.company` 형태로 타입 안전 경로 지정(`PathProxy`, ColumnPrimitive 가 아닌 관계 필드만 접근 가능). 다단계·다중 호출 가능. 관계 미정의 시 throw.

서브쿼리/UNION:

- `wrap()` — 현재 Queryable 을 서브쿼리(derived table)로 감쌈. `distinct()`/`groupBy()` 뒤 `count()` 처럼 프레임워크가 요구할 때만.
- `static Queryable.union(...queries)` — 2개 이상 Queryable 을 UNION(중복 제거)으로 결합. 결과 위 fluent 연산자는 외부 union 결과에 적용. select 컬럼 이름·타입·순서를 양쪽 동일하게 맞춰야 함(orm-union.md). 2개 미만이면 throw.

재귀:

- `recursive(fn)` — WITH RECURSIVE CTE 생성(계층 데이터). `fn(cte) => cte.from(Table).where(...)` 안에서 `e.self[0]` 로 직전 단계 행을 참조.

`db.user().join(...)`/`recursive(...)`/`Queryable.union(...)` 안에서 쓰는 `JoinQueryable`·`RecursiveQueryable` 의 `from`/`select`/`union` 은 콜백 인자로만 노출되며 직접 import 하지 않는다.

## Queryable — 종단 메서드

조회:

- `execute(): Promise<TData[]>` — SELECT 실행, 결과 배열.
- `single(): Promise<TData | undefined>` — 단일 결과. 2건 이상이면 throw.
- `first(): Promise<TData | undefined>` — 첫 행만(내부적으로 `top(1)`). 복수여도 에러 없음.
- `count(fn?): Promise<number>` — 행 수. `fn?`=셀 column 지정(미지정 시 전체). `distinct()`/`groupBy()` 직후 호출하면 throw(→ `wrap()` 먼저).
- `exists(): Promise<boolean>` — 조건 매칭 행 존재 여부(내부 `top(1)`).

CUD(모두 `TFrom` 이 TableBuilder 일 때만 — `select`/`groupBy` 후엔 불가):

- `insert(records)` / `insert(records, outputColumns)` — 다건 INSERT. `records: $inferInsert[]`. MSSQL 1000행 제한 때문에 1000개씩 청크 분할. `outputColumns: K[]` 지정 시 삽입된 행에서 그 column 만 배열로 반환(AI/PK 값 회수). 빈 배열이면 no-op.
- `insertIfNotExists(record)` / `(record, outputColumns)` — 현재 WHERE 조건 매칭 행이 없을 때만 1건 INSERT. output 지정 시 삽입 행 1개 반환.
- `insertInto(targetTable)` / `(targetTable, outputColumns)` — 현재 SELECT 결과를 다른 테이블에 INSERT INTO ... SELECT. `targetTable` 의 column 구조가 현재 결과와 호환해야 함.
- `update(recordFwd)` / `(recordFwd, outputColumns)` — UPDATE. `recordFwd(cols) => QueryableWriteRecord<$inferUpdate>`(갱신할 column→값). 값은 `ExprInput`(리터럴 직접 가능, `expr.val` 불필요). output 지정 시 갱신 행 반환.
- `delete()` / `delete(outputColumns)` — DELETE. output 지정 시 삭제 행 반환.
- `upsert(updateFn)` / `upsert(insertFn, outputColumns?)` / `upsert(updateFn, insertFn)` / `upsert(updateFn, insertFn, outputColumns)` — WHERE 매칭 행 있으면 UPDATE, 없으면 INSERT(MERGE). `updateFn(cols) => 갱신값`, `insertFn(updateRecord) => 삽입값`(생략 시 update 값 재사용). output 지정 시 영향 행 반환.

QueryDef 생성기(실행 없이 AST 만): `getSelectQueryDef()`, `getInsertQueryDef(records, outputColumns?)`, `getInsertIfNotExistsQueryDef(...)`, `getInsertIntoQueryDef(...)`, `getUpdateQueryDef(...)`, `getDeleteQueryDef(...)`, `getUpsertQueryDef(...)`, `getResultMeta(outputColumns?)`. executor 우회·디버깅·배치 조립용.

기타:

- `switchFk(enabled)` — 이 Queryable 의 소스 테이블 FK 제약을 활성/비활성. 트랜잭션 안에서 가능.
- `readonly meta` — 내부 조립 상태(from/where/joins/columns 등). 직접 수정하지 않음.

```typescript
// 표준 조회 (orm.md 흐름)
const items = await db.order()
  .joinSingle("state", (q, p) =>
    q.from(OrderLine).where((l) => [expr.eq(l.orderId, p.id)])
      .select((l) => ({ sumQty: expr.sum(l.qty), doneCnt: expr.count(l.doneAt) })),
  )
  .select((p) => ({
    id: p.id,
    sumQty: expr.coalesce(p.state!.sumQty, 0),
    isDone: expr.gt(p.state!.doneCnt, 0),
  }))
  .where((r) => [expr.eq(r.isDone, true)])
  .orderBy((r) => r.id, "DESC")
  .limit(0, 50)
  .execute();

// CUD — 리터럴 직접 전달
await db.user().where((u) => [expr.eq(u.id, 1)]).update((u) => ({ name: "새이름" }));
const [inserted] = await db.user().insert([{ name: "홍길동" }], ["id"]);
```

## queryable / executable (팩토리 함수)

`DbContext` 내부에서 `this.queryable()`/`this.executable()` 로 쓰는 게 일반적이지만, 모듈 함수 형태도 export 됨.

- `queryable(db, tableOrView, as?)` — `() => Queryable` 팩토리. `as?` 미지정 시 호출마다 새 alias(`db.getNextAlias()`), 지정 시 고정. 반환 Queryable 의 column 은 빌더 정의로부터 구성(View 는 `viewFn` 평가).
- `executable(db, builder)` — `() => Executable` 팩토리.

## Executable (프로시저 실행)

```typescript
class Executable<TParams, TReturns> {
  getExecProcQueryDef(params?): ExecProcQueryDef;
  execute(params): Promise<InferColumnExprs<TReturns>[][]>;
}
```

- `execute(params)` — 프로시저 실행. `params`=`returns`/`params` 정의에 맞는 `InferColumnExprs<TParams>`(리터럴 또는 ExprUnit). 결과는 **결과셋 배열의 배열**(다중 SELECT 가능) — 단일 결과셋이면 `result[0]`.
- `getExecProcQueryDef(params?)` — 실행 없이 QueryDef 반환. params 가 있는데 프로시저에 파라미터 정의가 없으면 throw.

```typescript
const [rows] = await db.getUserById().execute({ userId: 1n });
```

## parseSearchQuery / ParsedSearchQuery

`search()` 가 내부로 쓰지만 직접 호출도 가능. 검색 구문 문자열을 SQL LIKE 패턴으로 분해.

```typescript
function parseSearchQuery(searchText: string): ParsedSearchQuery;
interface ParsedSearchQuery { or: string[]; must: string[]; not: string[]; }
```

- `or: string[]` — 일반 검색어(공백 구분, OR). 와일드카드 없으면 `%term%`(부분 일치).
- `must: string[]` — `+term` 또는 `"정확 구문"`(AND 필수).
- `not: string[]` — `-term`(NOT 제외).
- 와일드카드 `*` → `%`(`app*`→`app%` 시작 일치). 이스케이프: `\\` `\*` `\%` `\"` `\+` `\-` 는 리터럴. 닫히지 않은 `"` 는 일반 텍스트로 처리.

```typescript
parseSearchQuery('apple "delicious fruit" -banana +strawberry');
// { or: ["%apple%"], must: ["%delicious fruit%", "%strawberry%"], not: ["%banana%"] }
```

## getMatchedPrimaryKeys

```typescript
function getMatchedPrimaryKeys(fkCols: string[], targetTable: TableBuilder): string[];
```

- FK column 배열을 대상 테이블 PK 와 매칭해 PK column 이름 배열 반환. 개수 불일치 시 throw. `include()` 가 관계 조건을 만들 때 내부 사용 — 직접 호출은 드묾.

## 결과/입력 변환 타입

- `QueryableRecord<TData>` — 결과 데이터 → column 프록시 타입. 각 ColumnPrimitive 가 `ExprUnit<T>`, 중첩 관계는 재귀. where/select 등 콜백 인자 타입.
- `QueryableWriteRecord<TData>` — 쓰기용. 각 필드가 `ExprInput<T>`. `update`/`upsert` 콜백 반환 타입.
- `UnwrapQueryableRecord<R>` — `select` 결과를 다시 데이터 타입으로 역추론(ExprUnit→값).
- `PathProxy<TObject>` — `include` 경로 지정용 프록시 타입(관계 필드만 접근).
