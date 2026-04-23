# expr

Dialect 독립적 SQL 표현식 빌더 네임스페이스. SQL 문자열 대신 JSON AST(`Expr`)를 생성하며, `QueryBuilder`가 각 DBMS(MySQL, MSSQL, PostgreSQL)로 변환한다.

```typescript
export const expr: { ... };
```

## 값 생성

| 함수 | 시그니처 | 설명 |
|------|----------|------|
| `val(dataType, value)` | `(TStr, T) => ExprUnit<T>` | 리터럴 값을 ExprUnit으로 래핑 |
| `col(dataType, ...path)` | `(ColumnPrimitiveStr, ...string[]) => ExprUnit<...>` | Column 참조 생성 (내부 사용) |
| `raw(dataType)` | `(TStr) => (strings, ...values) => ExprUnit<...>` | Raw SQL 태그드 템플릿. 보간 값은 자동 파라미터화 |
| `toExpr(value)` | `(ExprInput<T>) => Expr` | ExprInput을 Expr AST로 변환 (내부/커스텀 빌더용) |

## WHERE 조건 — 비교

| 함수 | 설명 |
|------|------|
| `eq(source, target)` | `=` (NULL 안전 비교. MySQL: `<=>`, MSSQL/PG: `IS NULL OR =`) |
| `gt(source, target)` | `>` 초과 |
| `lt(source, target)` | `<` 미만 |
| `gte(source, target)` | `>=` 이상 |
| `lte(source, target)` | `<=` 이하 |
| `between(source, from?, to?)` | `BETWEEN`. `from`/`to` undefined 시 해당 방향 제한 없음 |

## WHERE 조건 — NULL 검사

| 함수 | 설명 |
|------|------|
| `null(source)` | `IS NULL` |

## WHERE 조건 — 문자열 검색

| 함수 | 설명 |
|------|------|
| `like(source, pattern)` | `LIKE` 패턴 매칭 (`%` `_` 와일드카드) |
| `regexp(source, pattern)` | 정규식 매칭 (DBMS별 구문 차이 있음) |

## WHERE 조건 — IN

| 함수 | 설명 |
|------|------|
| `in(source, values)` | `IN (...)` 값 목록 비교 |
| `inQuery(source, query)` | `IN (SELECT ...)` 서브쿼리 비교. 쿼리는 단일 column SELECT 필요 |
| `exists(query)` | `EXISTS (SELECT ...)` |

## WHERE 조건 — 논리 연산자

| 함수 | 설명 |
|------|------|
| `not(condition)` | `NOT` |
| `and(conditions)` | `AND` 결합. 빈 배열 허용 안 함 |
| `or(conditions)` | `OR` 결합. 빈 배열 허용 안 함 |

## SELECT — 문자열

| 함수 | 설명 |
|------|------|
| `concat(...args)` | `CONCAT(...)` — NULL은 빈 문자열 처리 |
| `left(source, length)` | `LEFT(source, n)` |
| `right(source, length)` | `RIGHT(source, n)` |
| `trim(source)` | `TRIM(source)` |
| `padStart(source, length, fillString)` | `LPAD(source, n, fill)` |
| `replace(source, from, to)` | `REPLACE(source, from, to)` |
| `upper(source)` | `UPPER(source)` |
| `lower(source)` | `LOWER(source)` |
| `length(source)` | `CHAR_LENGTH(source)` — 문자 수 |
| `byteLength(source)` | `OCTET_LENGTH(source)` — 바이트 수 |
| `substring(source, start, length?)` | `SUBSTRING(source, start, len)` — 1부터 시작 |
| `indexOf(source, search)` | `LOCATE/CHARINDEX` — 1부터 시작, 없으면 0 |

## SELECT — 숫자

| 함수 | 설명 |
|------|------|
| `abs(source)` | `ABS(source)` |
| `round(source, digits)` | `ROUND(source, n)` |
| `ceil(source)` | `CEILING(source)` |
| `floor(source)` | `FLOOR(source)` |
| `add(source, target)` | `source + target` |
| `sub(source, target)` | `source - target` |
| `mul(source, target)` | `source * target` |
| `div(source, target)` | `source / target` |
| `mod(source, target)` | `source % target` |

## SELECT — 날짜

| 함수 | 설명 |
|------|------|
| `year(source)` | `YEAR(source)` |
| `month(source)` | `MONTH(source)` (1~12) |
| `day(source)` | `DAY(source)` (1~31) |
| `hour(source)` | `HOUR(source)` (0~23) |
| `minute(source)` | `MINUTE(source)` (0~59) |
| `second(source)` | `SECOND(source)` (0~59) |
| `dateDiff(unit, from, to)` | `DATEDIFF(unit, from, to)` — 두 날짜 차이 |
| `dateAdd(unit, source, amount)` | `DATEADD(unit, n, source)` — 날짜 더하기 |

## SELECT — 집계 함수

| 함수 | 설명 |
|------|------|
| `count(source?)` | `COUNT(source)` 또는 `COUNT(*)` |
| `sum(source)` | `SUM(source)` |
| `avg(source)` | `AVG(source)` |
| `max(source)` | `MAX(source)` |
| `min(source)` | `MIN(source)` |

## SELECT — 윈도우 함수

| 함수 | 설명 |
|------|------|
| `rowNumber(winSpec)` | `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)` |
| `rank(winSpec)` | `RANK() OVER (...)` |
| `denseRank(winSpec)` | `DENSE_RANK() OVER (...)` |
| `lag(source, offset?, def?, winSpec?)` | `LAG(source, offset, default) OVER (...)` |
| `lead(source, offset?, def?, winSpec?)` | `LEAD(source, offset, default) OVER (...)` |
| `sumOver(source, winSpec)` | `SUM(source) OVER (...)` |
| `countOver(source, winSpec)` | `COUNT(source) OVER (...)` |
| `avgOver(source, winSpec)` | `AVG(source) OVER (...)` |
| `maxOver(source, winSpec)` | `MAX(source) OVER (...)` |
| `minOver(source, winSpec)` | `MIN(source) OVER (...)` |
| `firstValue(source, winSpec)` | `FIRST_VALUE(source) OVER (...)` |
| `lastValue(source, winSpec)` | `LAST_VALUE(source) OVER (...)` |
| `ntile(n, winSpec)` | `NTILE(n) OVER (...)` |

## SELECT — 서브쿼리

| 함수 | 설명 |
|------|------|
| `subquery(dataType, query, fn?)` | 서브쿼리를 SELECT 표현식으로 사용. 단일 값 반환 |

## SELECT — 조건부 표현식

| 함수 | 설명 |
|------|------|
| `if(condition, then, else_)` | `IF(cond, then, else)` |
| `switch()` | `CASE WHEN` 체이닝. `.case(cond, then).default(val)` |
| `coalesce(...args)` | `COALESCE(...)` — 첫 번째 non-NULL 값 반환 |
| `nullIf(source, target)` | `NULLIF(source, target)` — 같으면 NULL |

## SELECT — 타입 변환

| 함수 | 설명 |
|------|------|
| `cast(source, dataType)` | `CAST(source AS type)` |
| `toDateOnly(source)` | DateTime → DateOnly 변환 |
| `toDateTime(source)` | DateOnly → DateTime 변환 |

## Related Types

### `SwitchExprBuilder<TPrimitive>`

`expr.switch()`의 체이닝 빌더 인터페이스.

```typescript
export interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

## Usage

```typescript
import { expr } from "@simplysm/orm-common";

// 비교/논리
expr.eq(u.status, "active")
expr.between(u.age, 18, 65)
expr.and([expr.eq(u.isActive, true), expr.gt(u.age, 18)])

// 집계/윈도우
expr.sum(o.amount)
expr.rowNumber({ partitionBy: [u.companyId], orderBy: [[u.createdAt, "DESC"]] })

// 문자열
expr.concat(u.firstName, " ", u.lastName)
expr.padStart(expr.cast(o.id, { type: "varchar", length: 10 }), 8, "0")

// 날짜
expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today()))

// CASE WHEN
const label = expr.switch<string>()
  .case(expr.eq(u.status, "active"), "활성")
  .case(expr.eq(u.status, "inactive"), "비활성")
  .default("알 수 없음");

// 서브쿼리
expr.subquery("number", db.post().where((p) => [expr.eq(p.authorId, u.id)]))

// Raw SQL (이스케이프 해치)
expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`
```
