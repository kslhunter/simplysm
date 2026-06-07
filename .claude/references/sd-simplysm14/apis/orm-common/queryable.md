# @simplysm/orm-common — Queryable (쿼리 작성·실행 · 프로시저 · 검색)

`db.user()` 처럼 컨텍스트 멤버를 호출하면 `Queryable<TData, TFrom>` 를 받는다. immutable 체이닝으로 옵션·필터·조인·그룹을 쌓고, 종단 메서드(`execute`/`single`/`count`/`insert`/...)로 실행한다. where/select/orderBy 콜백 안에서는 [expr.md](./expr.md) 의 `expr` 로 표현식을 만든다. 프로시저는 `Executable`, 텍스트 검색 구문은 `parseSearchQuery` 가 처리한다. 표준 조회 흐름·안티패턴은 orm.md/orm-union.md 참조.

## Queryable<TData, TFrom>

`TData` = 결과 데이터 타입, `TFrom` = 소스 `TableBuilder`(CUD 가능 여부). `select`/`join`/`groupBy`/`distinct`/`wrap`/`union` 등을 거치면 `TFrom` 이 `never` 가 되어 CUD 가 막힌다(파생 컬럼 위에서는 INSERT/UPDATE 불가).

### 옵션 — select / distinct / lock

- `select(fn)` — projection. `fn` 은 원본 컬럼 프록시를 받아 새 컬럼 객체 반환. 반환 객체 안에서 `expr.*` 도출(coalesce/CASE/산식)을 한 번에 작성. 결과 `TData` 가 새 shape 로 바뀜.
- `distinct()` — `DISTINCT` 적용. 이후 `count()` 하려면 `wrap()` 먼저(아니면 throw).
- `lock()` — `FOR UPDATE` 행 잠금. 트랜잭션 내에서 선택 행 배타 잠금이 필요할 때.

```typescript
db.user().select((u) => ({ userName: u.name, userEmail: u.email }))
```

### 제한 — top / limit

- `top(count)` — 상위 `count` 행만. ORDER BY 없이도 사용 가능.
- `limit(skip, take)` — 페이지네이션. `skip`=OFFSET, `take`=LIMIT. **호출 전 `orderBy()` 필수**(없으면 throw).

```typescript
db.user().orderBy((u) => u.createdAt, "DESC").limit(page * 50, 50)
```

### 정렬 — orderBy

- `orderBy(fnOrKey, orderBy?)` — 정렬 조건 추가(여러 번 호출 시 순서대로). `fnOrKey`=컬럼 반환 함수 또는 체인 경로 문자열(`"user.name"`, 동적 정렬용). `orderBy`=`"ASC" | "DESC"`(기본 ASC).

### 필터 — where / search

- `where(predicate)` — WHERE 조건 추가(여러 번 호출 시 AND 결합). `predicate` 는 컬럼 프록시를 받아 `WhereExprUnit[]` 반환. select 로 만든 파생 컬럼 이름도 직접 참조 가능(framework 가 AST inline).
- `search(fn, searchText)` — 텍스트 검색. `fn`=검색 대상 문자열 컬럼 배열 반환, `searchText`=검색 구문(`parseSearchQuery` 규칙: 공백=OR, `+`=필수, `-`=제외, `"..."`=구문, `*`=와일드카드). 빈 문자열이면 조건 미추가. 내부적으로 `LOWER(col) LIKE pattern` 조합으로 변환.

```typescript
db.user()
  .where((u) => [expr.eq(u.isActive, true)])
  .search((u) => [u.name, u.email], "John -withdrawn")
```

### 그룹 — groupBy / having

- `groupBy(fn)` — GROUP BY. `fn` 은 그룹 컬럼 배열 반환. 이후 `count()` 하려면 `wrap()` 먼저(아니면 throw).
- `having(predicate)` — 그룹 필터(여러 번 호출 시 AND). 집계 컬럼 기준 필터링.

### 조인 — join / joinSingle / include

- `join(as, fn)` — 1:N LEFT JOIN. 결과에 `as` 키로 배열 추가. `fn(qr, cols)` 의 `qr.from(Table).where(...)` 로 조인 조건·서브쿼리 정의.
- `joinSingle(as, fn)` — N:1/1:1 LEFT JOIN. 결과에 `as` 키로 단일 객체(또는 undefined) 추가. 도메인 boolean·집계는 SELECT subquery 대신 `joinSingle` 안 `from+where+select(aggregate)` 로 부착(orm.md).
- `include(fn)` — `TableBuilder` 의 FK/FKT 관계를 자동 조인. `fn(item)` 은 PathProxy 로 관계 경로만 접근(컬럼은 컴파일 에러). 다단계(`p.user.company`)·다중 호출 지원. 관계 미정의면 throw.

```typescript
db.post()
  .joinSingle("user", (qr, p) => qr.from(User).where((u) => [expr.eq(u.id, p.userId)]))
  .include((p) => p.user.company)
```

### 서브쿼리 — wrap / union / recursive

- `wrap()` — 현재 Queryable 을 서브쿼리(derived table)로 감쌈. `distinct()`/`groupBy()` 후 `count()` 호출에 필요한 자리에서만 사용(불필요한 wrap 금지, orm.md).
- `static Queryable.union(...queries)` — 2개 이상 Queryable 을 UNION 결합(중복 제거). 결과는 derived table 로 취급되어 이후 `orderBy`/`limit`/`where` 등은 union 결과 위에 적용. 각 소스에 predicate pushdown 하려면 union 전에 미리 호출. 2개 미만이면 `ArgumentError`. 이종 엔티티 합치기는 orm-union.md.
- `recursive(fn)` — 재귀 CTE(WITH RECURSIVE). 계층 데이터(조직도·카테고리 트리)용. `fn(cte)` 의 `cte.from(Table)` 안에서 `self` 로 상위 결과를 자기참조.

```typescript
const items = await Queryable.union(inQr, outQr).orderBy((r) => r.date, "DESC").limit(0, 50).execute();
```

### 종단 — SELECT 실행

- `execute()` — SELECT 실행, 결과 배열 반환.
- `single()` — 단일 결과 또는 undefined. 2건 이상이면 `ArgumentError`.
- `first()` — 첫 결과 또는 undefined(`top(1)`).
- `exists()` — 조건 일치 행 존재 여부 `boolean`(`top(1)`).
- `count(fn?)` — 행 수. `fn`=셀 컬럼 지정(생략 시 전체). `distinct()`/`groupBy()` 직후 호출 시 throw(→ `wrap()` 먼저).
- `getSelectQueryDef()` / `getResultMeta(outputColumns?)` — 실행 없이 `SelectQueryDef` AST / 결과 변환 메타(`ResultMeta`) 산출. 서브쿼리 합성·저수준 실행용.

### 종단 — INSERT

- `insert(records, outputColumns?)` — 배열 삽입(MSSQL 1000행 제한 대비 1000개씩 청크 분할). `records`=`$inferInsert[]`. `outputColumns` 지정 시 삽입된 행의 해당 컬럼 배열 반환(예: 생성된 `id`). 빈 배열이면 즉시 반환.
- `insertIfNotExists(record, outputColumns?)` — 현재 WHERE 조건에 맞는 행이 없을 때만 1건 삽입. `outputColumns` 지정 시 삽입 행 반환.
- `insertInto(targetTable, outputColumns?)` — 현재 SELECT 결과를 다른 테이블에 INSERT INTO ... SELECT. `targetTable` 컬럼이 현재 데이터 shape 와 맞아야 함.

```typescript
const [created] = await db.user().insert([{ name: "홍길동" }], ["id"]);
```

### 종단 — UPDATE / DELETE / UPSERT

- `update(recordFwd, outputColumns?)` — UPDATE. `recordFwd(cols)` 가 갱신 컬럼/값 객체 반환(`ExprInput`, 리터럴 직접 전달 — `expr.val` 불필요). `outputColumns` 지정 시 갱신 행 반환.
- `delete(outputColumns?)` — DELETE. `outputColumns` 지정 시 삭제 행 반환.
- `upsert(updateFn, insertFn?, outputColumns?)` — WHERE 조건 일치 시 UPDATE, 없으면 INSERT. `insertFn` 생략 시 update 값으로 insert. `insertFn(updateRecord)` 는 update 결과를 받아 insert 레코드 산출. `outputColumns` 지정 시 영향 행 반환.
- 각 종단마다 `getUpdateQueryDef`/`getDeleteQueryDef`/`getUpsertQueryDef`/`getInsertQueryDef`/`getInsertIfNotExistsQueryDef`/`getInsertIntoQueryDef` 로 실행 없이 def 만 얻을 수 있음.

```typescript
await db.user().where((u) => [expr.eq(u.id, 1)]).update(() => ({ name: "수정" }));
await db.user().where((u) => [expr.eq(u.email, "a@b.com")]).upsert(() => ({ name: "A", email: "a@b.com" }));
```

### DDL 헬퍼

- `switchFk(enabled)` — 이 테이블의 FK 제약 활성/비활성 토글. `enabled` true=활성, false=비활성. 대량 적재 전 FK 일시 해제용. Table/View 기반에서만.

## queryable / getMatchedPrimaryKeys (factory)

- `queryable(db, tableOrView, as?)` — Table/View 별 Queryable 팩토리 함수 생성. `DbContext` 내부에서 멤버 등록에 쓰임(보통 `this.queryable(...)` 로 호출). `as` 미지정 시 호출마다 새 alias.
- `getMatchedPrimaryKeys(fkCols, targetTable)` — FK 컬럼 배열과 대상 테이블 PK 를 매칭해 PK 컬럼명 배열 반환. 개수 불일치 시 throw. include/조인 조건 생성 내부에서 사용.

타입 export: `QueryableRecord<TData>`(컬럼 프록시 타입), `QueryableWriteRecord<TData>`(쓰기용 `ExprInput` 레코드), `UnwrapQueryableRecord<R>`(select 결과 역추론), `PathProxy<T>`(include 경로 프록시).

## Executable<TParams, TReturns> / executable

저장 프로시저 실행 래퍼. `db.getUserById()` 로 인스턴스를 얻어 실행한다.

- `execute(params)` — 프로시저 실행. `params`=`InferColumnExprs<TParams>`(`ExprInput` 또는 리터럴). 결과는 `TReturns[][]`(다중 결과셋). 정의에 파라미터가 없는데 전달하면 throw.
- `getExecProcQueryDef(params?)` — 실행 없이 `ExecProcQueryDef` 만 산출.
- `executable(db, builder)` — `Executable` 팩토리 생성(`DbContext` 멤버 등록용, 보통 `this.executable(...)`).

```typescript
const [rows] = await db.getUserById().execute({ userId: 1n });
```

## parseSearchQuery / ParsedSearchQuery

`search()` 가 내부적으로 쓰는 검색 구문 파서. 검색 문자열을 SQL LIKE 패턴으로 변환한다. 커스텀 검색 UI 를 직접 만들 때 외부에서도 호출 가능.

```typescript
function parseSearchQuery(searchText: string): ParsedSearchQuery;
interface ParsedSearchQuery { or: string[]; must: string[]; not: string[]; }
```

- `or`: string[] — 일반 검색어(OR 조건) LIKE 패턴. 공백으로 구분된 토큰.
- `must`: string[] — 필수 포함(AND 조건) LIKE 패턴. `+term` 또는 `"구문"`(따옴표 = 정확 일치 = 필수).
- `not`: string[] — 제외(NOT 조건) LIKE 패턴. `-term`.

구문 규칙: 와일드카드 없는 단어 `apple` → `%apple%`(부분 일치), `app*` → `app%`(시작 일치), `*apple` → `%apple`(끝 일치). 이스케이프 `\\` `\*` `\%` `\"` `\+` `\-` 는 리터럴 문자로 처리. 닫히지 않은 따옴표는 일반 텍스트로 취급.

```typescript
parseSearchQuery('apple "맛있는 과일" -banana +strawberry');
// { or: ["%apple%"], must: ["%맛있는 과일%", "%strawberry%"], not: ["%banana%"] }
```
