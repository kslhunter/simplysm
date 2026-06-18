# @simplysm/orm-common — queryable

`db.X()` 가 반환하는 `Queryable` 체이닝으로 SELECT/INSERT/UPDATE/DELETE/UPSERT 쿼리를 구성·실행하는 군. 모든 옵션 메서드는 새 `Queryable` 을 반환하는 불변 체이닝이며, 콜백은 컬럼 프록시(`QueryableRecord`)를 받아 `expr` 표현식을 만든다. 종단 메서드(`execute`/`single`/`count` 등)에서 QueryDef 를 빌드해 `db.executeDefs` 로 실행한다. 프로시저 실행은 `Executable`, 텍스트 검색 파싱은 `parseSearchQuery`.

`Queryable<TData, TFrom>` — `TData` 는 결과 행 타입, `TFrom` 은 소스 TableBuilder(CUD 연산에 필요, 커스텀 컬럼/조인 결과는 `never`).

## SELECT 옵션 (체이닝)

- `select(fn)` — SELECT 컬럼 매핑. `fn` 은 컬럼 프록시를 받아 새 구조(`{ alias: 컬럼/표현식 }`)를 반환. 결과 타입이 매핑 형태로 바뀌고 `TFrom` 은 `never`(이후 CUD 불가). 리터럴 상수도 자동으로 `ExprUnit` 으로 래핑됨.
- `distinct()` — 중복 행 제거(DISTINCT). 이후 `count()` 는 `wrap()` 필요.
- `lock()` — 선택 행에 배타적 잠금(FOR UPDATE). 트랜잭션 내에서만 의미.
- `top(count)` — 상위 N행. ORDER BY 없이도 가능.
- `limit(skip, take)` — OFFSET/LIMIT 페이지네이션. **먼저 `orderBy()` 가 있어야 함**(없으면 throw).
- `orderBy(fnOrKey, dir?)` — 정렬 추가(여러 번 누적). `fnOrKey` 는 컬럼 반환 함수 또는 체인 경로 문자열(`"id"`, `"user.name"` — `obj.getChainValue` 로 해석). `dir` 기본 `ASC`.

```typescript
const users = await db.user()
  .select((u) => ({ userName: u.name, userEmail: u.email }))
  .orderBy((u) => u.createdAt, "DESC")
  .limit(0, 20)
  .execute();
```

## WHERE / 검색

- `where(predicate)` — 조건 배열을 반환하는 콜백. 여러 번 호출 시 AND 누적. 배열 안 여러 조건도 AND.
- `search(fn, searchText)` — `fn` 이 반환한 문자열 컬럼들에 텍스트 검색을 적용. 구문은 `parseSearchQuery` 규칙(공백=OR, `+`=필수, `-`=제외, `"..."`=구문, `*`=와일드카드). 빈 검색어면 그대로 반환. 내부적으로 `LOWER(col) LIKE pattern` 조합.

```typescript
db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .search((u) => [u.name, u.email], "John Doe -withdrawn");
```

## GROUP BY / HAVING

- `groupBy(fn)` — 그룹화 컬럼 배열 반환. 반환 `TFrom` 은 `never`.
- `having(predicate)` — GROUP BY 이후 필터(여러 번 누적, AND). 반환 `TFrom` 은 `never`.

```typescript
db.order()
  .select((o) => ({ userId: o.userId, total: expr.sum(o.amount) }))
  .groupBy((o) => [o.userId])
  .having((o) => [expr.gte(o.total, 10000)]);
```

## JOIN

- `join(as, fn)` — 1:N LEFT JOIN. 결과에 `as` 프로퍼티가 **배열**로 추가됨. `fn(qr, cols)` 의 `qr.from(Table)` 로 조인 대상을 잡고 `where` 로 조건을 건다.
- `joinSingle(as, fn)` — N:1/1:1 LEFT JOIN. 결과에 `as` 가 **단일 객체(optional)** 로 추가됨. 집계·도출 컬럼을 outer 행에 부착하는 표준 수단(orm.md: SELECT 절 subquery/exists 금지).
- `include(fn)` — TableBuilder 의 FK/FKT 관계를 자동 JOIN. `fn` 은 타입 안전 path proxy 를 받아 관계 경로를 지정(`(p) => p.user.company` → 다단계). 비-컬럼(관계) 필드만 접근 가능. 관계 미정의 시 throw, TableBuilder 기반이 아니면 throw. 같은 경로 중복 호출은 무시.

`join`/`joinSingle` 의 `fn` 첫 인자 `qr`(`JoinQueryable`)는 `from(Table)` / `select(columns)` / `union(...queries)` 를 제공한다.

```typescript
db.post().include((p) => p.user.company);

db.product()
  .joinSingle("state", (q, p) =>
    q.from(StockLine).where((x) => [expr.eq(x.productId, p.id)])
      .select((x) => ({ sumQty: expr.sum(x.qty), cnt: expr.count() })),
  )
  .select((p) => ({ id: p.id, totalQty: expr.coalesce(p.state!.sumQty, 0) }));
```

## 서브쿼리 / UNION / 재귀 CTE

- `wrap()` — 현재 Queryable 을 서브쿼리(파생 테이블)로 감쌈. `distinct()`/`groupBy()` 이후 `count()` 호출 전에 필요.
- `Queryable.union(...queries)` (static) — 2개 이상 Queryable 을 UNION(중복 제거). **2개 미만이면 `ArgumentError`**. 첫 쿼리의 컬럼 구조를 기준으로 alias 변환. 결과는 파생 테이블이라 이후 fluent 연산은 외부에 적용됨(예시 스타일은 orm-union.md).
- `recursive(fn)` — WITH RECURSIVE CTE. `fn(cte)` 의 `cte.from(Table)`/`cte.select(...)`/`cte.union(...)` 로 재귀 본문 정의. 재귀 대상에 `self` 프로퍼티(베이스 행 참조)가 추가됨. 계층(조직도·트리) 조회용.

```typescript
const combined = Queryable.union(
  db.user().where((u) => [expr.eq(u.type, "admin")]),
  db.user().where((u) => [expr.eq(u.type, "manager")]),
);

db.employee()
  .where((e) => [expr.null(e.managerId)])
  .recursive((cte) => cte.from(Employee).where((e) => [expr.eq(e.managerId, e.self[0].id)]));
```

## 실행 — SELECT 종단

- `execute(): Promise<TData[]>` — SELECT 실행, 결과 배열 반환.
- `single(): Promise<TData | undefined>` — 단일 결과. 2건 이상이면 `ArgumentError`.
- `first(): Promise<TData | undefined>` — 첫 결과만(`top(1)`).
- `count(fn?): Promise<number>` — 행 수. `fn` 으로 특정 컬럼 카운트. `distinct()`/`groupBy()` 직후 호출 시 throw(먼저 `wrap()`). 결과 없으면 0.
- `exists(): Promise<boolean>` — 조건에 맞는 행 존재 여부(`top(1)` 후 길이 검사).
- `getSelectQueryDef(): SelectQueryDef` — 빌드된 SELECT AST. `getResultMeta(outputColumns?)` — 결과 파싱용 `ResultMeta`.

```typescript
const total = await db.user().where((u) => [expr.eq(u.isActive, true)]).count();
const user = await db.user().where((u) => [expr.eq(u.id, 1)]).single();
```

## 실행 — INSERT (TableBuilder 기반만)

- `insert(records)` / `insert(records, outputColumns)` — 레코드 배열 삽입. MSSQL 1000행 제한 때문에 1000개 단위 청크로 분할. `outputColumns` 지정 시 삽입된 레코드 배열 반환(`Pick<columns, K>[]`). 빈 배열이면 즉시 반환. AI 컬럼에 명시값이 있으면 자동 `overrideIdentity`.
- `insertIfNotExists(record)` / `(record, outputColumns)` — WHERE 조건에 맞는 데이터가 없을 때만 단건 삽입. `outputColumns` 지정 시 단건 반환.
- `insertInto(targetTable)` / `(targetTable, outputColumns)` — 현재 SELECT 결과를 다른 테이블에 INSERT(INSERT INTO ... SELECT). 대상 테이블 컬럼이 현재 데이터와 호환되어야 함(타입 제약).
- `getInsertQueryDef` / `getInsertIfNotExistsQueryDef` / `getInsertIntoQueryDef` — 각 AST 생성기.

```typescript
const [inserted] = await db.user().insert([{ name: "Gildong Hong" }], ["id"]);

await db.user()
  .where((u) => [expr.eq(u.email, "t@t.com")])
  .insertIfNotExists({ name: "t", email: "t@t.com" });
```

## 실행 — UPDATE / DELETE / UPSERT (TableBuilder 기반만)

- `update(recordFwd)` / `(recordFwd, outputColumns)` — `recordFwd(cols)` 가 갱신 컬럼/값을 반환. 값은 `ExprInput`(리터럴 직접 가능). `outputColumns` 지정 시 갱신된 레코드 배열 반환. WHERE/JOIN/limit 가 함께 반영됨.
- `delete()` / `delete(outputColumns)` — DELETE. `outputColumns` 지정 시 삭제된 레코드 배열 반환.
- `upsert(updateFn)` / `upsert(updateFn, insertFn?, outputColumns?)` — WHERE 매칭 시 UPDATE, 아니면 INSERT(MERGE). `insertFn(updateRecord)` 미지정 시 update 와 동일 데이터로 삽입. `insertFn` 은 update 레코드를 인자로 받아 변형 가능.
- `getUpdateQueryDef` / `getDeleteQueryDef` / `getUpsertQueryDef` — AST 생성기.
- `switchFk(enabled)` — 이 Queryable 소스 테이블의 FK 제약 활성/비활성(트랜잭션 내 가능).

```typescript
await db.user().where((u) => [expr.eq(u.id, 1)]).update((u) => ({ name: "새이름" }));

await db.user().where((u) => [expr.eq(u.isExpired, true)]).delete(["id", "name"]);

await db.user()
  .where((u) => [expr.eq(u.email, "t@t.com")])
  .upsert(() => ({ loginCount: 1 }), (update) => ({ ...update, email: "t@t.com" }));
```

## Executable (프로시저 실행)

`DbContext.executable(Procedure)` 가 반환하는 팩토리(`db.getUserById()`)가 `Executable` 을 만든다.

```typescript
class Executable<TParams, TReturns> {
  execute(params: InferColumnExprs<TParams>): Promise<InferColumnExprs<TReturns>[][]>;
  getExecProcQueryDef(params?): ExecProcQueryDef;
}
function executable(db, builder): () => Executable;
```

- `execute(params)` — 프로시저 실행. 파라미터는 `ExprInput`(리터럴 또는 `ExprUnit`). 결과는 다중 결과셋(`행[][]`). 파라미터 없는 프로시저에 params 를 주면 throw.

```typescript
const [rows] = await db.getUserById().execute({ userId: 1n });
```

## 검색 파서 — parseSearchQuery

```typescript
function parseSearchQuery(searchText: string): ParsedSearchQuery;
interface ParsedSearchQuery { or: string[]; must: string[]; not: string[]; } // 각각 LIKE 패턴
```

검색 문자열을 SQL LIKE 패턴으로 파싱. `Queryable.search()` 내부에서 사용하지만 직접도 가능.

| 구문 | 의미 |
| ---- | ---- |
| `term1 term2` | OR (하나 이상 일치) → `or` |
| `+term` | 필수 포함(AND) → `must` |
| `-term` | 제외(NOT) → `not` |
| `"exact phrase"` | 정확한 구문(필수) → `must` |
| `term*` / `*term` / `a*ple` | 와일드카드 `%` 로 변환(접두/접미/중간 일치) |
| 와일드카드 없는 `term` | `%term%` (부분 문자열) |

이스케이프: `\\` `\*` `\%` `\"` `\+` `\-` 는 각 리터럴 문자. 닫히지 않은 따옴표는 따옴표 포함 일반 텍스트로 처리.

```typescript
parseSearchQuery('apple "delicious fruit" -banana +strawberry');
// { or: ["%apple%"], must: ["%delicious fruit%", "%strawberry%"], not: ["%banana%"] }
```

## 관련 타입 / 헬퍼 export

- `QueryableRecord<TData>` — 컬럼이 `ExprUnit` 으로 래핑된 프록시 타입(콜백 인자).
- `QueryableWriteRecord<TData>` — 쓰기(update/upsert) 값 레코드(`ExprInput`).
- `UnwrapQueryableRecord<R>` — `select` 결과를 다시 데이터 타입으로 역변환.
- `PathProxy<TObject>` — `include()` 의 타입 안전 경로 프록시(관계 필드만 접근).
- `queryable(db, tableOrView, as?)` — Table/View 용 Queryable 팩토리 함수(`DbContext.queryable` 의 기반).
- `getMatchedPrimaryKeys(fkCols, targetTable)` — FK 컬럼 배열과 대상 PK 매칭(개수 불일치 시 throw, include 내부용).

## 주의사항

- CUD(insert/update/delete/upsert)·`insertInto` 는 `TFrom` 이 살아있는(=`select`/`groupBy`/join 결과가 아닌) TableBuilder 기반 Queryable 에서만. 아니면 throw.
- 도출 컬럼 위 필터·정렬은 `wrap()` 없이 `.select(...).where(...)` 로 — framework 가 projected AST 를 inline(orm.md). `wrap()` 은 `distinct`/`groupBy` 후 `count` 처럼 명시 요구 시에만.
- where 비교·CUD 값은 리터럴 그대로 — `expr.val` 로 감싸지 말 것(orm.md). `expr.val` 은 `select` 에서 상수 컬럼 만들 때처럼 `ExprUnit` 이 요구되는 자리에서만.
