# @simplysm/orm-common — Queryable (쿼리 작성)

`db.user()` 등 등록된 팩토리 호출로 받는 체이닝 쿼리 빌더. 옵션·필터·조인을 immutable 체이닝으로 쌓은 뒤 종결 메서드로 실행한다. 콜백 인자 `columns`/`u` 등은 `QueryableRecord`(column → `ExprUnit` 프록시)이며, 표현식은 [expr.md](./expr.md) 로 만든다.

`Queryable<TData, TFrom>` — `TData` 결과 데이터 타입, `TFrom` 소스 TableBuilder(CUD 연산은 TableBuilder 기반에서만 가능, View/서브쿼리는 `never`).

## 옵션 (SELECT 컬럼 / DISTINCT / LOCK)

- `select(fn: (cols) => R): Queryable<...>` — SELECT column 재지정. `fn` 은 원본 column 프록시를 받아 `{별칭: ExprUnit | 리터럴 | 중첩객체}` 반환. CUD 소스성 상실(`TFrom=never`).
- `distinct(): Queryable` — DISTINCT 적용. 이후 `count()` 직접 호출 불가(`wrap()` 필요).
- `lock(): Queryable` — FOR UPDATE 행 잠금. 트랜잭션 내 배타 잠금이 필요할 때.

## 행 제한 (TOP / LIMIT)

- `top(count: number): Queryable` — 상위 N행. ORDER BY 없이도 사용 가능.
- `limit(skip: number, take: number): Queryable` — 페이지네이션(OFFSET `skip`, LIMIT `take`). **ORDER BY 선행 필수**(없으면 throw).

## 정렬 (ORDER BY)

- `orderBy(fnOrKey, orderBy?: "ASC"|"DESC"): Queryable` — 정렬 조건 추가(여러 번 호출 시 순서대로 누적).
  - `fnOrKey` — 정렬 column 을 반환하는 함수 `(cols) => ExprUnit`, 또는 체인 경로 문자열(`"id"`, `"user.name"` — `obj.getChainValue` 로 해석. 동적 정렬 루프용).
  - `orderBy` — 방향. 기본 ASC.

## 검색 (WHERE / search)

- `where(predicate: (cols) => WhereExprUnit[]): Queryable` — WHERE 조건 추가. 배열 내부는 AND, 여러 번 호출도 AND 누적. 조건은 `expr.eq` 등으로 생성.
- `search(fn: (cols) => ExprUnit<string|undefined>[], searchText: string): Queryable` — 다중 column 텍스트 검색. `fn` 은 검색 대상 column 들, `searchText` 는 검색 문법 문자열(공백=OR, `+`=필수, `-`=제외, `"..."`=구문, `*`=와일드카드). 빈 문자열이면 변화 없이 self 반환. 내부적으로 `lower(col) LIKE pattern` 조합을 AND/OR 로 조립. (문법 상세: README 검색 파서)

```typescript
db.user().where((u) => [expr.eq(u.isActive, true)]).search((u) => [u.name, u.email], "John -withdrawn");
```

## 그룹 (GROUP BY / HAVING)

- `groupBy(fn: (cols) => ExprUnit[]): Queryable` — GROUP BY. 이후 `count()` 직접 호출 불가(`wrap()` 필요).
- `having(predicate: (cols) => WhereExprUnit[]): Queryable` — 그룹 필터(GROUP BY 이후). AND 누적.

## 조인 (JOIN / JOIN SINGLE / INCLUDE)

- `join<A, R>(as: A, fn: (qr, cols) => Queryable<R>): Queryable<TData & { [as]?: R[] }>` — 1:N LEFT JOIN, 결과에 **배열**로 추가. `qr` 는 `JoinQueryable`(`.from(table)`/`.select(cols)`/`.union(...)`), `cols` 는 바깥 column. 조인 조건은 반환 Queryable 의 `where` 로.
- `joinSingle<A, R>(as, fn): Queryable<... & { [as]?: R }>` — N:1/1:1 LEFT JOIN, 결과에 **단일 객체**로 추가.
- `include(fn: (item) => PathProxy): Queryable` — TableBuilder 의 FK/FKT 관계를 자동 조인. `fn` 은 타입 안전 경로 프록시(`item.user.company` 처럼 관계 필드만 접근 가능, ColumnPrimitive 필드는 접근 불가). 다단계·중복 include 지원. 관계 미정의 시 throw, View 기반 queryable 에선 사용 불가.

```typescript
db.post().include((p) => p.user.company);
db.user().join("posts", (qr, u) => qr.from(Post).where((p) => [expr.eq(p.userId, u.id)]));
```

## 서브쿼리 / UNION / 재귀

- `wrap(): Queryable<TData, never>` — 현재 쿼리를 서브쿼리로 래핑. `distinct()`/`groupBy()` 후 `count()` 하려면 필수.
- `static Queryable.union<TData>(...queries): Queryable<TData, never>` — 여러 Queryable UNION(중복 제거). 최소 2개, 미만 시 throw. (`JoinQueryable.union` 도 동일 의미)
- `recursive(fn: (qr: RecursiveQueryable) => Queryable): Queryable<TData, never>` — 재귀 CTE(WITH RECURSIVE). 계층 데이터 조회. `qr.from(table)`/`qr.select(cols)`/`qr.union(...)` 로 재귀 본문 정의, 재귀 측은 `self` 프로퍼티로 base 를 자기 참조.

```typescript
const count = await db.user().select((u) => ({ name: u.name })).distinct().wrap().count();
```

## 종결 — SELECT 실행

- `execute(): Promise<TData[]>` — SELECT 실행, 결과 배열.
- `single(): Promise<TData | undefined>` — 단일 결과. 2건 이상이면 throw.
- `first(): Promise<TData | undefined>` — 첫 결과(내부적으로 `top(1)`).
- `count(fn?: (cols) => ExprUnit): Promise<number>` — 행 수. `fn` 지정 시 해당 column 카운트. `distinct()`/`groupBy()` 직후 호출 시 throw(`wrap()` 먼저).
- `exists(): Promise<boolean>` — 조건 충족 행 존재 여부(`top(1)` 후 길이 검사).
- `getSelectQueryDef(): SelectQueryDef` / `getResultMeta(outputColumns?): ResultMeta` — 실행용 def·결과 메타 생성(executor·서브쿼리 합성에서 사용).

## 종결 — INSERT

각 INSERT 는 `outputColumns` 미전달 시 `void`, 전달 시 해당 column 만 뽑은 레코드를 반환(반환 자동증가 PK 수신 등).
- `insert(records: TFrom["$inferInsert"][], outputColumns?): Promise<void | Pick<...>[]>` — 다건 INSERT. MSSQL 1000행 제한 때문에 1000건씩 청크 분할. AI column 에 명시값 있으면 자동 overrideIdentity.
- `insertIfNotExists(record, outputColumns?): Promise<void | Pick<...>>` — 현재 WHERE 조건 매칭이 없을 때만 INSERT.
- `insertInto(targetTable, outputColumns?): Promise<void | Pick<...>[]>` — 현재 SELECT 결과를 다른 테이블에 INSERT INTO ... SELECT. `targetTable` column 구조가 현재 데이터와 호환되어야 함(타입 매칭).
- `getInsertQueryDef` / `getInsertIfNotExistsQueryDef` / `getInsertIntoQueryDef` — 각 def 생성기.

```typescript
const [inserted] = await db.user().insert([{ name: "Hong" }], ["id"]);
```

## 종결 — UPDATE / DELETE

- `update(recordFwd: (cols) => QueryableWriteRecord, outputColumns?): Promise<void | Pick<...>[]>` — UPDATE. `recordFwd` 는 column → 갱신값(`ExprInput`) 매핑 반환. 기존 값 참조 가능(`expr.mul(p.price, ...)`). WHERE 는 미리 체이닝.
- `delete(outputColumns?): Promise<void | Pick<...>[]>` — DELETE. WHERE 미리 체이닝.
- `getUpdateQueryDef` / `getDeleteQueryDef` — def 생성기.

## 종결 — UPSERT

- `upsert(updateFn, insertFn?, outputColumns?): Promise<void | Pick<...>[]>` — WHERE 매칭 있으면 UPDATE, 없으면 INSERT.
  - `updateFn: (cols) => QueryableWriteRecord` — 갱신/삽입 공통값(insertFn 생략 시 INSERT 도 이 값 사용).
  - `insertFn?: (updateRecord) => QueryableWriteRecord` — INSERT 전용값(update 결과를 받아 변형). UPDATE/INSERT 데이터가 다를 때.
  - `outputColumns?` — 반환 column.
- `getUpsertQueryDef(...)` — def 생성기.

```typescript
await db.user()
  .where((u) => [expr.eq(u.email, "t@t.com")])
  .upsert(() => ({ name: expr.val("string", "x"), email: expr.val("string", "t@t.com") }));
```

## DDL Helper / 기타

- `switchFk(enabled: boolean): Promise<void>` — 이 테이블 FK 제약 활성/비활성(트랜잭션 내 가능). TableBuilder/ViewBuilder 기반에서만.
- `queryable(db, tableOrView, as?): () => Queryable` — Table/View 용 Queryable 팩토리 함수(보통 `DbContext.queryable()` 가 호출). `as` 미지정 시 자동 alias.
- `getMatchedPrimaryKeys(fkCols, targetTable): string[]` — FK column 배열과 대상 PK 매칭(개수 불일치 시 throw). include 내부 헬퍼.

## 관련 타입

- `QueryableRecord<TData>` — column → `ExprUnit` 프록시 레코드(콜백 인자 타입).
- `QueryableWriteRecord<TData>` — column → `ExprInput`(쓰기 콜백 반환 타입).
- `UnwrapQueryableRecord<R>` — `select` 결과 `ExprUnit` 언래핑 → 데이터 타입.
- `PathProxy<TObject>` — `include` 경로 수집용 타입 안전 프록시(관계 필드만 노출).
