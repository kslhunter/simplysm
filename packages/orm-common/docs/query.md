# 쿼리 & 표현식

## Queryable -- SELECT 쿼리 빌더

### 기본 조회

```typescript
// 전체 조회
const users = await db.user().execute();

// 단건 조회 (2건 이상이면 throw)
const user = await db.user()
  .where((c) => [expr.eq(c.id, 1)])
  .single();

// 첫 번째 결과 (여러 건이어도 첫 번째만 반환)
const latest = await db.user()
  .orderBy((c) => c.createdAt, "DESC")
  .first();

// 행 수
const count = await db.user()
  .where((c) => [expr.eq(c.isActive, true)])
  .count();

// 존재 여부
const hasAdmin = await db.user()
  .where((c) => [expr.eq(c.role, "admin")])
  .exists();
```

### Queryable API

#### 실행 메서드

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `execute` | `() => Promise<TData[]>` | SELECT 실행, 결과 배열 반환 |
| `single` | `() => Promise<TData \| undefined>` | 단건 반환 (2건 이상이면 throw) |
| `first` | `() => Promise<TData \| undefined>` | 첫 번째 결과 반환 |
| `count` | `(fn?) => Promise<number>` | 행 수 반환. distinct/groupBy 이후에는 wrap() 필요 |
| `exists` | `() => Promise<boolean>` | 데이터 존재 여부 |

#### 조건 메서드 (체이닝)

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `where` | `(fn: (cols) => WhereExprUnit[]) => Queryable` | WHERE 조건 (여러 번 호출 시 AND 결합) |
| `search` | `(fn: (cols) => ExprUnit[], text: string) => Queryable` | 텍스트 검색 |
| `orderBy` | `(fn: (cols) => ExprUnit, dir?) => Queryable` | 정렬 (기본 ASC, 여러 번 호출 가능) |
| `top` | `(count: number) => Queryable` | 상위 N건 (ORDER BY 없이 사용 가능) |
| `limit` | `(skip: number, take: number) => Queryable` | 페이징 (ORDER BY 필수) |
| `select` | `(fn: (cols) => Record) => Queryable` | 컬럼 선택/변환 |
| `distinct` | `() => Queryable` | 중복 제거 |
| `lock` | `() => Queryable` | FOR UPDATE 잠금 |
| `groupBy` | `(fn: (cols) => ExprUnit[]) => Queryable` | 그룹화 |
| `having` | `(fn: (cols) => WhereExprUnit[]) => Queryable` | 그룹 필터링 |

#### JOIN 메서드

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `join` | `(as, fn: (qr, cols) => Queryable) => Queryable` | LEFT JOIN (1:N, 배열) |
| `joinSingle` | `(as, fn: (qr, cols) => Queryable) => Queryable` | LEFT JOIN (N:1, 단일 객체) |
| `include` | `(fn: (item) => PathProxy) => Queryable` | 관계 기반 자동 JOIN |

#### 서브쿼리/유틸리티

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `wrap` | `() => Queryable` | 서브쿼리로 래핑 |
| `Queryable.union` | `(...queries) => Queryable` | UNION (최소 2개) |
| `recursive` | `(fn: (cte) => Queryable) => Queryable` | 재귀 CTE |

#### CUD 메서드

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `insert` | `(records, outputColumns?) => Promise` | INSERT (1000건 단위 자동 분할) |
| `insertIfNotExists` | `(record, outputColumns?) => Promise` | 조건부 INSERT |
| `insertInto` | `(targetTable, outputColumns?) => Promise` | INSERT INTO ... SELECT |
| `update` | `(fn: (cols) => Record, outputColumns?) => Promise` | UPDATE |
| `delete` | `(outputColumns?) => Promise` | DELETE |
| `upsert` | `(updateFn, insertFn?, outputColumns?) => Promise` | UPSERT (UPDATE or INSERT) |
| `switchFk` | `(enabled: boolean) => Promise<void>` | FK 제약조건 on/off |

### 필터링 (WHERE)

```typescript
db.user()
  .where((c) => [
    expr.eq(c.name, "Alice"),           // name = 'Alice'
    expr.gt(c.score, 80),              // score > 80
    expr.between(c.createdAt, from, to), // BETWEEN
    expr.like(c.email, "%@gmail.com"),  // LIKE
    expr.in(c.role, ["admin", "user"]), // IN
    expr.null(c.deletedAt),            // IS NULL
  ])
  // 배열은 자동 AND 결합. OR는 명시적으로:
  .where((c) => [
    expr.or([
      expr.eq(c.role, "admin"),
      expr.gt(c.score, 90),
    ]),
  ])
```

where()를 여러 번 호출하면 AND로 결합된다.

### 텍스트 검색 (search)

```typescript
// 여러 컬럼에서 텍스트 검색
db.user()
  .search((c) => [c.name, c.email], "John +admin -withdrawn")
```

검색 문법: `term`(OR), `+term`(AND 필수), `-term`(NOT 제외), `"exact"`(정확히 + 필수), `wild*`(접두사). 내부적으로 `parseSearchQuery()`를 사용하여 SQL LIKE 패턴으로 변환한다.

### 정렬 (ORDER BY)

```typescript
// orderBy는 컬럼 하나씩, 여러 번 호출 가능
db.user()
  .orderBy((c) => c.createdAt, "DESC")
  .orderBy((c) => c.name)  // 기본: ASC
```

### 페이징

```typescript
// top: ORDER BY 없이도 사용 가능
db.user().top(10)

// limit: ORDER BY 필수 (skip, take)
db.user()
  .orderBy((c) => c.createdAt, "DESC")
  .limit(20, 10)  // 20건 건너뛰고 10건 가져오기
```

### 컬럼 선택 (SELECT)

```typescript
db.user()
  .select((c) => ({
    id: c.id,
    upperName: expr.upper(c.name),
    emailDomain: expr.right(c.email, 10),
  }))
```

### 그룹화 (GROUP BY)

```typescript
db.order()
  .select((c) => ({
    userId: c.userId,
    total: expr.sum(c.amount),
    count: expr.count(),
    avg: expr.avg(c.amount),
  }))
  .groupBy((c) => [c.userId])
  .having((c) => [expr.gt(expr.count(), 5)])
```

### JOIN

```typescript
// LEFT JOIN (1:N, 배열로 결과에 추가)
db.user()
  .join("posts", (qr, u) =>
    qr.from(Post)
      .where((p) => [expr.eq(p.userId, u.id)])
  )
// 결과: { id, name, posts: [{ id, title }, ...] }

// LEFT JOIN SINGLE (N:1, 단일 객체로 결과에 추가)
db.order()
  .joinSingle("user", (qr, o) =>
    qr.from(User)
      .where((u) => [expr.eq(u.id, o.userId)])
  )
// 결과: { id, amount, user: { id, name } | undefined }

// 관계 자동 로드 (include) -- 정의된 관계 기반 자동 JOIN
db.order()
  .include((c) => c.user)        // N:1 관계 로드
  .include((c) => c.user.company) // 중첩 관계
```

### 서브쿼리

```typescript
// 스칼라 서브쿼리
db.user().select((c) => ({
  name: c.name,
  orderCount: expr.subquery("number",
    db.order()
      .where((o) => [expr.eq(o.userId, c.id)])
      .select(() => ({ cnt: expr.count() }))
  ),
}))

// IN 서브쿼리
db.user().where((c) => [
  expr.inQuery(c.id,
    db.order()
      .where((o) => [expr.gt(o.amount, 1000)])
      .select((o) => ({ userId: o.userId }))
  ),
])

// EXISTS
db.user().where((c) => [
  expr.exists(db.order().where((o) => [expr.eq(o.userId, c.id)])),
])
```

### 잠금 (FOR UPDATE)

```typescript
await db.connect(async () => {
  const user = await db.user()
    .where((c) => [expr.eq(c.id, 1)])
    .lock()
    .single();
});
```

### DISTINCT

```typescript
db.user().select((c) => ({ role: c.role })).distinct()
```

### 서브쿼리 래핑 (wrap)

DISTINCT나 GROUP BY 이후 count() 등을 사용하려면 wrap()으로 서브쿼리화해야 한다.

```typescript
const count = await db.user()
  .select((c) => ({ name: c.name }))
  .distinct()
  .wrap()
  .count();
```

### UNION

```typescript
const combined = Queryable.union(
  db.user().where((c) => [expr.eq(c.type, "admin")]),
  db.user().where((c) => [expr.eq(c.type, "manager")]),
);
```

### 재귀 쿼리 (CTE)

```typescript
// 계층 데이터 조회 (조직도, 카테고리 트리 등)
db.employee()
  .where((e) => [expr.null(e.managerId)])  // 루트 노드
  .recursive((cte) =>
    cte.from(Employee)
      .where((e) => [expr.eq(e.managerId, e.self[0].id)])
  )
```

---

## CUD 연산

`select()`, `groupBy()`, `join()` 이후에는 CUD 불가 (타입 레벨에서 차단).

### INSERT

```typescript
// 기본 삽입
await db.user().insert([
  { name: "Alice", email: "alice@example.com", createdAt: new DateTime() },
  { name: "Bob", createdAt: new DateTime() },
]);

// INSERT 후 컬럼 반환 (OUTPUT)
const [inserted] = await db.user().insert(
  [{ name: "Alice", createdAt: new DateTime() }],
  ["id"],  // 반환받을 컬럼
);
// inserted.id -> 자동 생성된 ID

// 조건부 INSERT (WHERE 조건에 맞는 데이터가 없을 때만)
await db.user()
  .where((c) => [expr.eq(c.email, "test@test.com")])
  .insertIfNotExists({ name: "testing", email: "test@test.com", createdAt: new DateTime() });

// INSERT INTO ... SELECT
await db.user()
  .select((c) => ({ name: c.name, createdAt: c.createdAt }))
  .where((c) => [expr.eq(c.isArchived, false)])
  .insertInto(ArchivedUser);
```

### UPDATE

```typescript
await db.user()
  .where((c) => [expr.eq(c.id, 1)])
  .update((c) => ({ name: expr.val("string", "Alice2") }));

// 기존 값 참조
await db.product()
  .update((p) => ({
    price: expr.mul(p.price, expr.val("number", 1.1)),
  }));

// OUTPUT으로 변경된 데이터 반환
const updated = await db.user()
  .where((c) => [expr.eq(c.id, 1)])
  .update(
    (c) => ({ name: expr.val("string", "Alice2") }),
    ["id", "name"],
  );
```

### DELETE

```typescript
await db.user()
  .where((c) => [expr.eq(c.id, 1)])
  .delete();

// OUTPUT으로 삭제된 데이터 반환
const deleted = await db.user()
  .where((c) => [expr.eq(c.isExpired, true)])
  .delete(["id", "name"]);
```

### UPSERT (UPDATE or INSERT)

```typescript
// 동일 데이터로 UPDATE/INSERT
await db.user()
  .where((c) => [expr.eq(c.email, "test@test.com")])
  .upsert(() => ({
    name: expr.val("string", "testing"),
    email: expr.val("string", "test@test.com"),
  }));

// UPDATE/INSERT 데이터가 다른 경우
await db.user()
  .where((c) => [expr.eq(c.email, "test@test.com")])
  .upsert(
    () => ({ loginCount: expr.val("number", 1) }),                    // UPDATE용
    (update) => ({ ...update, email: expr.val("string", "test@test.com") }),  // INSERT용
  );
```

### FK 토글

```typescript
// Queryable에서 직접 FK on/off
await db.user().switchFk(false);  // FK 비활성화
// ... 벌크 작업 ...
await db.user().switchFk(true);   // FK 활성화
```

---

## Executable -- 프로시저 실행

```typescript
const MyDb = defineDbContext({
  tables: { user: User },
  procedures: { getUserOrders: GetUserOrders },
});

const db = createDbContext(MyDb, executor, { database: "mydb" });

await db.connect(async () => {
  const results = await db.getUserOrders().execute({ userId: 1 });
});
```

### Executable API

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `execute` | `(params) => Promise<TReturns[][]>` | 프로시저 실행 |
| `getExecProcQueryDef` | `(params?) => QueryDef` | QueryDef만 생성 (실행 안 함) |

---

## expr -- 표현식 빌더

방언 독립적인 SQL 표현식을 생성한다. JSON AST(Expr)를 생성하며, QueryBuilder가 각 DBMS(MySQL, MSSQL, PostgreSQL)에 맞게 변환한다.

### 값/조건

| 함수 | 설명 |
|------|------|
| `expr.val(type, value)` | 리터럴 값 |
| `expr.col(type, alias, key)` | 컬럼 참조 |
| `expr.raw(type)\`sql\`` | Raw SQL (태그 템플릿) |
| `expr.eq(a, b)` | `=` (NULL 안전) |
| `expr.gt(a, b)` | `>` |
| `expr.lt(a, b)` | `<` |
| `expr.gte(a, b)` | `>=` |
| `expr.lte(a, b)` | `<=` |
| `expr.between(src, from?, to?)` | BETWEEN |
| `expr.null(src)` | IS NULL |
| `expr.like(src, pattern)` | LIKE |
| `expr.regexp(src, pattern)` | 정규식 매칭 |
| `expr.in(src, values)` | IN (값 목록) |
| `expr.inQuery(src, query)` | IN (서브쿼리) |
| `expr.exists(query)` | EXISTS |
| `expr.not(cond)` | NOT |
| `expr.and(conds)` | AND |
| `expr.or(conds)` | OR |

### 문자열 함수

| 함수 | 설명 |
|------|------|
| `expr.concat(...args)` | 연결 (NULL=빈문자열) |
| `expr.left(src, len)` | 왼쪽 N자 |
| `expr.right(src, len)` | 오른쪽 N자 |
| `expr.substring(src, start, len?)` | 부분 문자열 (1-based) |
| `expr.trim(src)` | 양쪽 공백 제거 |
| `expr.padStart(src, len, fill)` | 왼쪽 패딩 (LPAD) |
| `expr.replace(src, from, to)` | 치환 |
| `expr.upper(src)` / `expr.lower(src)` | 대/소문자 |
| `expr.length(src)` | 문자 길이 (CHAR_LENGTH) |
| `expr.byteLength(src)` | 바이트 길이 (LENGTH/DATALENGTH) |
| `expr.indexOf(src, search)` | 위치 (1-based, 0=없음) |

### 수학 함수

| 함수 | 설명 |
|------|------|
| `expr.abs(src)` | 절대값 |
| `expr.round(src, digits)` | 반올림 |
| `expr.ceil(src)` / `expr.floor(src)` | 올림/내림 |

### 날짜 함수

| 함수 | 설명 |
|------|------|
| `expr.year(src)` / `expr.month(src)` / `expr.day(src)` | 연/월/일 추출 |
| `expr.hour(src)` / `expr.minute(src)` / `expr.second(src)` | 시/분/초 추출 |
| `expr.dateDiff(unit, from, to)` | 날짜 차이 |
| `expr.dateAdd(unit, src, value)` | 날짜 더하기 |
| `expr.formatDate(src, format)` | 날짜 포맷 (FORMAT/DATE_FORMAT) |
| `expr.isoWeek(src)` | ISO 주차 |
| `expr.isoWeekStartDate(src)` | ISO 주 시작일 |
| `expr.isoYearMonth(src)` | ISO 연월 (YYYYMM 형식) |

단위(`DateUnit`): `"year"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`

### 집계 함수

| 함수 | 설명 |
|------|------|
| `expr.count(arg?, distinct?)` | 행 수 |
| `expr.sum(arg)` | 합계 |
| `expr.avg(arg)` | 평균 |
| `expr.max(arg)` / `expr.min(arg)` | 최대/최소 |

### 조건 함수

```typescript
// CASE WHEN
expr.switch<string>()
  .case(expr.gt(c.score, 90), "A")
  .case(expr.gt(c.score, 80), "B")
  .default("C")

// IF (단순 삼항)
expr.if(expr.gt(c.score, 60), "pass", "fail")

// WHERE -> boolean 컬럼
expr.is(expr.gt(c.score, 80))  // true/false

// NULLIF (source === value이면 NULL 반환)
expr.nullIf(c.status, "unknown")
```

### 윈도우 함수

```typescript
// 순위
expr.rowNumber({ partitionBy: [c.dept], orderBy: [[c.score, "DESC"]] })
expr.rank({ orderBy: [[c.score, "DESC"]] })
expr.denseRank({ orderBy: [[c.score, "DESC"]] })
expr.ntile(4, { orderBy: [[c.score, "DESC"]] })

// 탐색
expr.lag(c.score, 1, 0, { orderBy: [[c.createdAt, "ASC"]] })
expr.lead(c.score, 1, undefined, { orderBy: [[c.createdAt, "ASC"]] })
expr.firstValue(c.score, { orderBy: [[c.createdAt, "ASC"]] })
expr.lastValue(c.score, { orderBy: [[c.createdAt, "ASC"]] })

// 윈도우 집계
expr.sumOver(c.amount, { partitionBy: [c.dept] })
expr.avgOver(c.amount, { partitionBy: [c.dept] })
expr.countOver({ partitionBy: [c.dept] })
expr.minOver(c.amount, { partitionBy: [c.dept] })
expr.maxOver(c.amount, { partitionBy: [c.dept] })
```

### 기타

| 함수 | 설명 |
|------|------|
| `expr.cast(src, targetType)` | 타입 변환 |
| `expr.greatest(...args)` | 최대값 |
| `expr.least(...args)` | 최소값 |
| `expr.rowNum()` | 행 번호 (전체) |
| `expr.random()` | 랜덤 0~1 |
| `expr.subquery(type, queryable)` | 스칼라 서브쿼리 |

---

## ExprUnit / WhereExprUnit

Queryable 콜백에서 컬럼 참조 시 자동으로 `ExprUnit`으로 래핑된다.

```typescript
// ExprUnit<TPrimitive> -- 타입 안전한 표현식 래퍼
class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;
  get n(): ExprUnit<NonNullable<TPrimitive>>;  // nullable 제거
}

// WhereExprUnit -- WHERE 절용 표현식 래퍼
class WhereExprUnit {
  readonly expr: WhereExpr;
}

// ExprInput -- ExprUnit 또는 리터럴 값을 받는 입력 타입
type ExprInput<TPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

---

## 검색 파서

사용자 검색 문법을 SQL LIKE 패턴으로 변환.

```typescript
import { parseSearchQuery } from "@simplysm/orm-common";

parseSearchQuery('apple +fruit -rotten "green apple" wild*');
// {
//   or: ["%apple%", "wild%"],
//   must: ["%green apple%", "%fruit%"],
//   not: ["%rotten%"],
// }
```

### parseSearchQuery API

```
parseSearchQuery(searchText: string): ParsedSearchQuery

interface ParsedSearchQuery {
  or: string[];    // OR 조건 (LIKE 패턴)
  must: string[];  // AND 필수 조건 (LIKE 패턴)
  not: string[];   // NOT 제외 조건 (LIKE 패턴)
}
```

문법: `term`(OR), `+term`(AND 필수), `-term`(NOT 제외), `"exact"`(정확히 + 필수), `wild*`(접두사)

이스케이프: `\\` (리터럴 `\`), `\*` (리터럴 `*`), `\%` (리터럴 `%`), `\"` (리터럴 `"`), `\+` (리터럴 `+`), `\-` (리터럴 `-`)

---

## QueryBuilder

QueryDef(JSON AST)를 DBMS별 SQL 문자열로 변환한다.

```typescript
import { createQueryBuilder } from "@simplysm/orm-common";
import type { Dialect } from "@simplysm/orm-common";

const builder = createQueryBuilder("mysql");  // "mysql" | "mssql" | "postgresql"
const result = builder.build(queryDef);
// result.sql -> SQL 문자열
```

### createQueryBuilder API

```
createQueryBuilder(dialect: Dialect): QueryBuilderBase
```

| 방언 | 구현 클래스 |
|------|-----------|
| `"mysql"` | `MysqlQueryBuilder` |
| `"mssql"` | `MssqlQueryBuilder` |
| `"postgresql"` | `PostgresqlQueryBuilder` |

---

## parseQueryResult

DB 쿼리 결과를 ResultMeta 기반으로 TypeScript 객체로 변환한다. 타입 파싱과 JOIN 결과 중첩을 처리한다.

```typescript
import { parseQueryResult } from "@simplysm/orm-common";

// 단순 타입 파싱
const raw = [{ id: "1", createdAt: "2026-01-07T10:00:00.000Z" }];
const meta = { columns: { id: "number", createdAt: "DateTime" }, joins: {} };
const result = await parseQueryResult(raw, meta);
// [{ id: 1, createdAt: DateTime(...) }]

// JOIN 결과 중첩
const raw2 = [
  { id: 1, name: "User1", "posts.id": 10, "posts.title": "Post1" },
  { id: 1, name: "User1", "posts.id": 11, "posts.title": "Post2" },
];
const meta2 = {
  columns: { id: "number", name: "string", "posts.id": "number", "posts.title": "string" },
  joins: { posts: { isSingle: false } },
};
const result2 = await parseQueryResult(raw2, meta2);
// [{ id: 1, name: "User1", posts: [{ id: 10, title: "Post1" }, { id: 11, title: "Post2" }] }]
```

### parseQueryResult API

```
parseQueryResult<TRecord>(
  rawResults: Record<string, unknown>[],
  meta: ResultMeta,
): Promise<TRecord[] | undefined>

interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}
```
