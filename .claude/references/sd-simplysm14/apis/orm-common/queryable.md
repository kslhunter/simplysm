# @simplysm/orm-common — Queryable (쿼리 작성·실행 · 프로시저 · 검색)

`db.user()` 처럼 컨텍스트 멤버를 호출하면 `Queryable<TData, TFrom>` 를 받는다. immutable 체이닝으로 옵션·필터·조인·그룹을 쌓고, 종단 메서드(execute/single/count/insert/...)로 실행한다. where/select/orderBy 콜백 안에서는 [expr.md](./expr.md) 의 `expr` 로 표현식을 만든다. 프로시저는 `Executable`, 텍스트 검색 구문은 `parseSearchQuery` 가 처리한다.

`Queryable<TData, TFrom>`: `TData`=결과 행 타입(컬럼+조인). `TFrom`=소스 TableBuilder(CUD 가능 여부). select/groupBy/join 등으로 컬럼 구조가 바뀌면 `TFrom` 이 `never` 가 되어 CUD 불가.

## 옵션 (select / distinct / lock)

- `select(fn: (cols) => R): Queryable<...>` — 출력 컬럼 재정의. `fn` 은 원본 컬럼(`QueryableRecord`)을 받아 새 구조(ExprUnit·리터럴·중첩 객체) 반환. raw 리터럴은 자동 ExprUnit 래핑. 이후 CUD 불가.
- `distinct(): Queryable` — DISTINCT 적용. count() 전이면 `wrap()` 필요.
- `lock(): Queryable` — FOR UPDATE 행 잠금. 트랜잭션 내 배타 잠금 획득용. `TFrom` 유지.

```typescript
db.user().select((u) => ({ userName: u.name, upper: expr.upper(u.email) }))
```

## 행 제한 (top / limit)

- `top(count: number): Queryable` — 상위 N 행(ORDER BY 없이도 가능). first()/exists() 가 내부적으로 `top(1)` 사용.
- `limit(skip, take): Queryable` — OFFSET/LIMIT 페이지네이션. `skip`=건너뛸 수, `take`=가져올 수. **ORDER BY 선행 필수**, 없으면 throw.

## 정렬 (orderBy)

- `orderBy(fnOrKey, orderBy?): Queryable` — 정렬 조건 추가(여러 번 호출 시 순서 누적). `fnOrKey`=컬럼 반환 함수 또는 체인 경로 문자열(`"user.name"`, 동적 정렬용 `obj.getChainValue`). `orderBy`=`"ASC"|"DESC"`, 기본 ASC.

```typescript
db.user().orderBy((u) => u.name).orderBy((u) => u.age, "DESC").orderBy("id", "DESC")
```

## 필터 (where / search)

- `where(predicate: (cols) => WhereExprUnit[]): Queryable` — WHERE 조건 추가. 배열 내 여러 조건·여러 번 호출 모두 AND 결합.
- `search(fn: (cols) => ExprUnit<string|undefined>[], searchText): Queryable` — 텍스트 검색. `fn`=검색 대상 컬럼들. `searchText` 를 `parseSearchQuery` 로 파싱해 컬럼별 `LIKE lower(...)` 조건 생성(OR 묶음 + 필수 AND + 제외 NOT). `searchText` 가 공백이면 self 반환(조건 무추가).

```typescript
db.user().where((u) => [expr.eq(u.isActive, true)]).search((u) => [u.name, u.email], "John -withdrawn")
```

## 그룹 (groupBy / having)

- `groupBy(fn: (cols) => ExprUnit[]): Queryable<TData, never>` — GROUP BY. 이후 CUD 불가. count() 전이면 `wrap()` 필요.
- `having(predicate: (cols) => WhereExprUnit[]): Queryable<TData, never>` — GROUP BY 이후 필터. 여러 번 호출 시 AND 누적.

```typescript
db.order()
  .select((o) => ({ userId: o.userId, total: expr.sum(o.amount) }))
  .groupBy((o) => [o.userId])
  .having((o) => [expr.gte(o.total, 10000)])
```

## 조인 (join / joinSingle / include)

- `join(as, fn): Queryable<TData & { [as]?: R[] }>` — 1:N LEFT JOIN, 결과에 배열로 추가. `as`=속성 이름. `fn=(qr, cols) => qr.from(Table).where(...)` 로 조인 조건 작성(`qr` 은 `JoinQueryable`).
- `joinSingle(as, fn): Queryable<... & { [as]?: R }>` — N:1/1:1 LEFT JOIN, 단일 객체로 추가. `as` 동일 키면 덮어씀.
- `include(fn: (item: PathProxy) => PathProxy): Queryable` — 빌더 관계 기반 자동 조인. `fn` 은 PathProxy 로 관계 경로 선택(`(p) => p.user.company` 처럼 중첩 가능, 컬럼 필드는 접근 불가=컴파일 에러). FK→단일, FKTarget→배열(single 이면 단일). 관계 미정의·TableBuilder 아님이면 throw. 같은 경로 중복 호출은 무시.

`JoinQueryable`(join 콜백의 `qr`): `.from(Table)` 조인 대상 지정, `.select(columns)` 커스텀 컬럼, `.union(...queries)` 2개 이상 UNION(미만이면 throw).

```typescript
db.post().joinSingle("user", (qr, p) => qr.from(User).where((u) => [expr.eq(u.id, p.userId)]))
db.user().include((u) => u.company).include((u) => u.posts)
```

## 서브쿼리·결합 (wrap / union / recursive)

- `wrap(): Queryable<TData, never>` — 현재 쿼리를 서브쿼리로 래핑(새 alias). distinct()/groupBy() 후 count() 하기 전 필수.
- `static Queryable.union(...queries): Queryable` — 2개 이상 Queryable 을 UNION(중복 제거). 미만이면 throw. 첫 쿼리의 컬럼 구조 기준.
- `recursive(fn: (cte) => Queryable): Queryable<TData, never>` — 재귀 CTE. base 쿼리(현재)+`fn` 이 정의한 재귀부. `cte` 는 `RecursiveQueryable`: `.from(Table)`/`.select(cols)`/`.union(...)` 제공하며 자기참조용 `self` 속성을 결과에 부여(`e.self[0].id`). 계층 데이터(조직도·트리)에.

```typescript
db.employee()
  .where((e) => [expr.null(e.managerId)])
  .recursive((cte) => cte.from(Employee).where((e) => [expr.eq(e.managerId, e.self[0].id)]))
```

## SELECT 실행

- `execute(): Promise<TData[]>` — SELECT 실행, 행 배열 반환.
- `single(): Promise<TData | undefined>` — 단일 결과. 2건 이상이면 throw.
- `first(): Promise<TData | undefined>` — 첫 결과만(`top(1)`).
- `count(fn?): Promise<number>` — 행 수. `fn` 지정 시 해당 컬럼 COUNT. distinct()/groupBy() 직후 호출하면 throw(`wrap()` 먼저). 결과 없으면 0.
- `exists(): Promise<boolean>` — 조건 충족 행 존재 여부(`top(1)` 길이).
- `getSelectQueryDef(): SelectQueryDef` / `getResultMeta(outputColumns?): ResultMeta` — 실행 없이 AST·결과 메타 생성(executor·서브쿼리 내부에서 사용).

## INSERT

- `insert(records): Promise<void>` / `insert(records, outputColumns): Promise<Pick<...>[]>` — 레코드 배열 삽입. MSSQL 1000행 제한 대응 1000개씩 청크 분할. `outputColumns` 지정 시 삽입된 컬럼 반환. AI 컬럼에 명시값 있으면 overrideIdentity 자동 설정. 빈 배열은 무동작.
- `insertIfNotExists(record[, outputColumns])` — WHERE 조건에 일치하는 데이터 없을 때만 단건 삽입. 현재 체인의 where 가 존재 검사 조건.
- `insertInto(targetTable[, outputColumns])` — 현재 SELECT 결과를 다른 테이블에 INSERT INTO ... SELECT. `targetTable` 컬럼이 현재 데이터 형태와 호환(`DataToColumnBuilderRecord`)이어야 함.

```typescript
const [row] = await db.user().insert([{ name: "홍길동" }], ["id"]);
```

## UPDATE / DELETE

- `update(recordFwd[, outputColumns])` — `recordFwd=(cols) => ({ col: ExprInput })` 로 갱신값 지정(기존 값 참조 가능: `expr.mul(p.price, 1.1)`). where 로 대상 한정. `outputColumns` 시 갱신 행 반환.
- `delete([outputColumns])` — where 조건 행 삭제. `outputColumns` 시 삭제된 행 반환.

```typescript
await db.user().where((u) => [expr.eq(u.id, 1)]).update((u) => ({ name: expr.val("string", "새이름") }));
```

## UPSERT

- `upsert(updateFn[, insertFn][, outputColumns])` — where 일치 시 UPDATE, 없으면 INSERT(MERGE 패턴). `updateFn=(cols) => 갱신값`. `insertFn=(updateRecord) => 삽입값`(생략 시 update 값 재사용, updateRecord 를 받아 추가 컬럼 합치기 가능). `outputColumns` 시 영향 행 반환.

```typescript
await db.user()
  .where((u) => [expr.eq(u.email, "t@t.com")])
  .upsert(() => ({ loginCount: expr.val("number", 1) }), (up) => ({ ...up, email: expr.val("string", "t@t.com") }));
```

`get...QueryDef` 류(`getInsertQueryDef`/`getUpdateQueryDef`/`getUpsertQueryDef` 등)는 실행 없이 AST 반환. `switchFk(enabled)` 는 이 테이블 FK 제약 on/off(Table/View 기반 아니면 throw).

## 결과 타입 유틸

- `type QueryableRecord<TData>` — 각 컬럼을 `ExprUnit` 으로, 중첩 관계를 재귀 래핑한 콜백 인자 타입.
- `type QueryableWriteRecord<TData>` — 컬럼을 `ExprInput`(쓰기) 으로 매핑(update/upsert 입력).
- `type UnwrapQueryableRecord<R>` — select 결과 구조를 데이터 타입으로 역변환(ExprUnit→값).
- `type PathProxy<TObject>` — include 의 타입 안전 경로 프록시(관계 필드만 노출).
- `getMatchedPrimaryKeys(fkCols, targetTable): string[]` — FK 컬럼 수와 대상 PK 를 매칭해 PK 이름 배열 반환. 개수 불일치 시 throw. include 내부 조인 조건 생성에 사용.

## 프로시저 실행 (Executable / executable)

`DbContext.executable(Procedure)` 가 `() => Executable` 팩토리를 반환한다. `Executable<TParams, TReturns>` 는 프로시저 실행 래퍼.

- `executable(db: DbContextBase, builder: ProcedureBuilder): () => Executable` — 팩토리(보통 `DbContext.executable()` 보호 메서드가 호출).
- `Executable.execute(params): Promise<TReturns[][]>` — 실행. `params` 는 `ProcedureBuilder.params()` 키별 값(리터럴 또는 ExprUnit). 결과는 결과셋 배열의 배열(다중 SELECT 대응).
- `Executable.getExecProcQueryDef(params?): ExecProcQueryDef` — 실행 AST 생성. 파라미터 미정의 프로시저에 값 전달 시 throw.

```typescript
const [rows] = await db.getUserById().execute({ userId: 1 });
```

## 검색 파서 (parseSearchQuery)

`Queryable.search()` 내부에서 검색 문법 문자열을 SQL LIKE 패턴으로 변환. 직접 호출도 가능.

- `parseSearchQuery(searchText: string): ParsedSearchQuery` — `{ or, must, not }`(각각 LIKE 패턴 배열) 반환.
  - `or: string[]` — 공백 구분 일반 토큰(OR, 하나 이상 일치).
  - `must: string[]` — `+토큰` 또는 `"정확한 구문"`(AND, 필수 포함).
  - `not: string[]` — `-토큰`(NOT, 제외).
- 문법: `term1 term2`(OR), `+term`(필수), `-term`(제외), `"구문"`(정확·필수), `*`(와일드카드→`%`). 와일드카드 없는 토큰은 `%토큰%`(부분 일치)로 변환. 이스케이프 `\\ \* \% \" \+ \-`. 닫히지 않은 따옴표는 일반 텍스트 처리.
- `interface ParsedSearchQuery` — 위 `or`/`must`/`not` 세 패턴 배열을 담는 타입.
