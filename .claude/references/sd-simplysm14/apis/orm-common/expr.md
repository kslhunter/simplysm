# @simplysm/orm-common — expr

Dialect 독립 SQL 표현식 빌더. SQL 문자열 대신 JSON AST(`Expr`/`WhereExpr`) 를 만들어 `Queryable` 메타에 누적되고, QueryBuilder 가 DBMS 별로 렌더.

## 래퍼

- `ExprUnit<T extends ColumnPrimitive>` — `{ dataType: ColumnPrimitiveStr, expr: Expr }`. `.n` 게터로 `NonNullable<T>` 로 cast.
- `WhereExprUnit` — boolean 컨텍스트 (`where`/`having`/논리 연산자) 전용.
- `ExprInput<T> = ExprUnit<T> | T` — 리터럴도 받는 입력 타입.
- `expr.toExpr(value)` / `toExpr(value)` 헬퍼 — `ExprUnit` 이면 풀고, 아니면 `{type:"value", value}` 로 감쌈.

## 카테고리별 API

### 값 / 컬럼 / Raw
- `expr.val(dataType, value)` — 리터럴 → `ExprUnit`. `dataType ∈ "string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`.
- `expr.col(dataType, ...path)` — 컬럼 참조(주로 내부).
- `expr.raw(dataType)\`SQL ${interp}\`` — 태그드 템플릿. 보간값은 파라미터화. dialect 의존 함수 사용 시 escape hatch.

### 비교 / NULL (→ `WhereExprUnit`)
- `eq`, `gt`, `lt`, `gte`, `lte`(source, target)
- `between(source, from?, to?)`
- `null(source)` — IS NULL
- `like(source, pattern)`, `regexp(source, pattern)`
- `in(source, values[])`, `inQuery(source, queryable)` — `queryable` 은 1-컬럼 select 여야 함. `exists(queryable)`.

### 논리
- `not(WhereExprUnit)`, `and(WhereExprUnit[])`, `or(WhereExprUnit[])` — 빈 배열은 throw.

### 문자열 (→ `ExprUnit<string ...>`)
- `concat(...args)`, `left(s, n)`, `right(s, n)`, `trim(s)`
- `padStart(s, length, fillString)`, `replace(s, from, to)`
- `upper(s)`, `lower(s)`
- `length(s)` → number, `byteLength(s)` → number
- `substring(s, start, length?)`, `indexOf(s, search)` → number

### 숫자
- `abs`, `round(s, digits)`, `ceil`, `floor`.

### 날짜 (`DateUnit = "year"|"month"|"day"|"hour"|"minute"|"second"`)
- `year/month/day/hour/minute/second(source)`
- `isoWeek(d)`, `isoWeekStartDate(d)`, `isoYearMonth(d)`
- `dateDiff(unit, from, to)` → number
- `dateAdd(unit, source, value)`
- `formatDate(source, format: string)` — format 문자열은 dialect 변환.

### NULL 처리 / 조건
- `coalesce(...args)` — 첫 non-null. 마지막 인자가 NonNullable 이면 반환 타입도 NonNullable.
- `nullIf(source, value)`
- `is(WhereExprUnit)` → `ExprUnit<boolean>` (boolean 변환)
- `if(condition, then, else_)` → `ExprUnit<T>` — 결과 dataType 은 ExprUnit/non-null 리터럴에서 추론.
- `switch<T>()` → `SwitchExprBuilder<T>` — `.case(cond, then).case(...).default(value)` 체이닝.

### 집계 (GROUP BY 컨텍스트)
- `count(arg?, distinct?)` → number
- `sum(arg)`, `avg(arg)` → `number | undefined`
- `max(arg)`, `min(arg)` → `T | undefined`
- `greatest(...args)`, `least(...args)` — 행 내 최대/최소.

### 기타 스칼라
- `rowNum()` → number — MSSQL `ROW_NUMBER() OVER(...)` 가 아니라 dialect 별 row 식별 함수 (간단 시퀀스).
- `random()` → number, 0~1.
- `cast(source, targetType: DataType)` — 결과 dataType 은 `dataTypeStrToColumnPrimitiveStr` 매핑.
- `subquery(dataType, queryable)` — 1-컬럼 select 의 스칼라 서브쿼리.

### 윈도우 함수 (`WinSpecInput = { partitionBy?: ExprInput[], orderBy?: [ExprInput, "ASC"|"DESC"?][] }`)
- 순위: `rowNumber(spec)`, `rank(spec)`, `denseRank(spec)`, `ntile(n, spec)`
- 시퀀스 비교: `lag(column, spec, { offset?, default? })`, `lead(column, spec, { offset?, default? })`
- 첫/끝: `firstValue(column, spec)`, `lastValue(column, spec)`
- 집계 윈도우: `sumOver(column, spec)`, `avgOver(column, spec)`, `countOver(spec, column?)`, `minOver(column, spec)`, `maxOver(column, spec)`

## 예시

```ts
db.user()
  .where(u => [
    expr.eq(u.status, "active"),
    expr.between(u.age, 18, 65),
    expr.or([expr.like(u.name, "%kim%"), expr.like(u.email, "%kim%")]),
  ])
  .select(u => ({
    name: expr.concat(u.firstName, " ", u.lastName),
    rank: expr.rowNumber({ partitionBy: [u.deptId], orderBy: [[u.score, "DESC"]] }),
    label: expr.switch<string>()
      .case(expr.gte(u.score, 90), "A")
      .case(expr.gte(u.score, 80), "B")
      .default("C"),
  }))
```

## Expr AST 타입

세부 노드 타입은 `./types/expr` 의 union (`ExprColumn`/`ExprValue`/`ExprRaw`/...`ExprWindow`/`ExprSubquery`). 일반 사용자는 직접 다룰 필요 없음 — ExprRenderer 구현이나 디버깅·검증 시만.
