# @simplysm/orm-common — expr (SQL 표현식 빌더)

`expr` 객체로 dialect 독립 SQL 표현식을 JSON AST(`Expr`)로 조립한다. dialect별 QueryBuilder 가 MySQL/MSSQL/PostgreSQL 로 변환. where/having 콜백은 `WhereExprUnit[]`, select/orderBy/groupBy 콜백은 `ExprUnit<T>`, update/upsert/where 비교값은 `ExprInput<T>`(= `ExprUnit<T> | T`)를 다룬다.

**리터럴 래핑 규칙(orm.md)**: where 비교·update/upsert/insert 값은 `ExprInput` 자리라 **리터럴을 그대로** 넘긴다 — `expr.val` 로 감싸지 말 것. `expr.val` 은 `select` 콜백에서 상수 column 을 만들 때처럼 `ExprUnit` 이 요구되는 자리에서만.

```typescript
// 좋음                                         // 나쁨 (불필요한 래핑)
.where((u) => [expr.eq(u.status, "active")])   // expr.eq(u.status, expr.val("string","active"))
.update((u) => ({ name: "새이름" }))            // ({ name: expr.val("string","새이름") })
```

연산 함수 인자는 대부분 `ExprInput<T>` — column 프록시(`ExprUnit`)·중첩 식·리터럴을 섞어 넘길 수 있다. `undefined` 컬럼 타입은 `.n` getter 로 non-null 단언 가능.

## ExprUnit / WhereExprUnit / ExprInput

- `ExprUnit<TPrimitive>` — 타입 안전 값 표현식 래퍼. `.dataType`(ColumnPrimitiveStr), `.expr`(AST), `.$infer`(타입 추론 마커). `.n` getter — 동일 식을 `NonNullable<T>` 로 좁힌 새 ExprUnit(`p.state!.sumQty` 처럼 nullable join 컬럼을 non-null 로 다룰 때 `.n` 대신 `!` 도 가능).
- `WhereExprUnit` — WHERE/HAVING 절 boolean 표현식 래퍼(`.expr: WhereExpr`). 비교·논리 함수가 반환.
- `ExprInput<T>` — `ExprUnit<T> | T`. 연산 인자·쓰기 값이 받는 타입(리터럴 직접 허용).

## 값 생성

- `val(dataType, value)` — 리터럴을 ExprUnit 으로 래핑. `dataType`="string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes". `value` undefined 허용(결과 타입에 undefined 포함). `select` 상수 컬럼 등 ExprUnit 강제 자리에서만.
- `col(dataType, ...path)` — column 참조 생성(내부용). 보통 콜백 프록시로 충분.
- `raw(dataType)\`SQL\`` — 이스케이프 해치. 태그드 템플릿, 보간값은 자동 파라미터화. ORM 미지원 DB 함수 직접 사용 시. 보간값은 `ExprInput`. union 의 NULL 자리채움(`` expr.raw("number")`NULL` ``)에도 사용(orm-union.md).
- `toExpr(value)` — `ExprInput` → `Expr` AST 변환(내부 헬퍼).

## WHERE — 비교 (반환 `WhereExprUnit`)

- `eq(source, target)` — 동등(NULL 안전: MySQL `<=>`, 그 외 `IS NULL OR =`).
- `gt(source, target)` / `lt(source, target)` / `gte(source, target)` / `lte(source, target)` — `>` / `<` / `>=` / `<=`.
- `between(source, from?, to?)` — 범위. `from`/`to` 중 하나가 undefined 면 그 방향 제한 없음(한쪽만 주면 `>=`/`<=` 로 동작).
- `null(source)` — IS NULL.
- `like(source, pattern)` — LIKE. `%`=0+ 문자, `_`=1 문자, 특수문자 `\` 이스케이프.
- `regexp(source, pattern)` — 정규식 매칭(구문은 DBMS 의존).
- `in(source, values)` — IN(값 목록).
- `inQuery(source, query)` — IN (SELECT ...). `query` 는 단일 column SELECT Queryable — 아니면 throw.
- `exists(query)` — EXISTS (서브쿼리 행 존재). SELECT 절은 제거되어 패킷 절약. (orm.md: SELECT 절 내부 `exists` 는 행당 N회 실행되므로 금지 — `joinSingle` 로 부착)

## WHERE — 논리 (반환 `WhereExprUnit`)

- `not(arg)` — NOT.
- `and(conditions)` — AND 결합. 빈 배열이면 throw. `where` 에 배열 넘기면 자동 AND 라 보통 불필요.
- `or(conditions)` — OR 결합. 빈 배열이면 throw.

## SELECT — 문자열 (반환 `ExprUnit`)

- `concat(...args)` — CONCAT(NULL→빈문자열).
- `left(source, length)` / `right(source, length)` — 왼쪽/오른쪽 N자.
- `trim(source)` — 양쪽 공백 제거.
- `padStart(source, length, fillString)` — LPAD(목표 길이까지 왼쪽 채움).
- `replace(source, from, to)` — 문자열 치환.
- `upper(source)` / `lower(source)` — 대/소문자 변환.
- `length(source)` — 문자 수. `byteLength(source)` — 바이트 수(UTF-8 CJK 3바이트).
- `substring(source, start, length?)` — 부분 문자열(1-기반 인덱스, length 생략 시 끝까지).
- `indexOf(source, search)` — 위치(1-기반, 없으면 0).

## SELECT — 숫자 (반환 `ExprUnit`)

- `abs(source)` — 절대값. `round(source, digits)` — 반올림(소수 자릿수). `ceil(source)` — 올림. `floor(source)` — 내림.

## SELECT — 날짜 (반환 `ExprUnit`)

- `year(source)` / `month(source)` / `day(source)` — 연/월/일(source: DateTime|DateOnly).
- `hour(source)` / `minute(source)` / `second(source)` — 시/분/초(source: DateTime|Time).
- `isoWeek(source)` — ISO 주 번호(1~53). `isoWeekStartDate(source)` — 그 주 월요일. `isoYearMonth(source)` — 해당 월 1일.
- `dateDiff(unit, from, to)` — 날짜 차(to - from). `unit`="year"|"month"|"day"|"hour"|"minute"|"second".
- `dateAdd(unit, source, value)` — 날짜 가감(value 음수 허용). 결과 타입은 source 와 동일.
- `formatDate(source, format)` — 포맷 문자열로 변환(`"%Y-%m-%d"` 등, 규칙 DBMS 의존).

## SELECT — 조건 (반환 `ExprUnit`)

- `coalesce(...args)` — 첫 non-null. 마지막 인수가 non-nullable 이면 결과도 non-nullable. join 도출 컬럼 기본값(`coalesce(p.state!.sum, 0)`)에 자주.
- `nullIf(source, value)` — source===value 이면 NULL(빈 문자열→NULL 변환 등).
- `is(condition)` — `WhereExprUnit` → boolean column 으로 변환(SELECT 절에서 조건 결과를 컬럼화).
- `switch<T>()` — CASE WHEN 빌더. `.case(condition, then).case(...).default(value)` 체이닝으로 `ExprUnit<T>` 마무리.
- `if(condition, then, else_)` — 삼항(IF/IIF). then/else 중 최소 하나 non-null 아니면 throw(타입 추론용).

## SELECT — 집계 (반환 `ExprUnit`)

NULL 값 행은 무시, 전부 NULL/무행이면 NULL.

- `count(arg?, distinct?)` — 행 수. `arg` 미지정=전체, `distinct: true`=중복 제거.
- `sum(arg)` / `avg(arg)` — 합/평균(number, 결과 nullable).
- `max(arg)` / `min(arg)` — 최대/최소(결과 nullable).

## SELECT — 기타 (반환 `ExprUnit`)

- `greatest(...args)` / `least(...args)` — 여러 값 중 최대/최소(행 내 비교). 인자 중 ExprUnit 하나는 있어야 타입 추론(없으면 throw).
- `rowNum()` — 전체 행 순번(1-기반, 단순 버전). `random()` — 0~1 난수(무작위 정렬에).
- `cast(source, targetType)` — 타입 변환. `targetType`=`DataType`(`{ type:"varchar", length:20 }` 등).
- `subquery(dataType, queryable)` — 스칼라 서브쿼리(1행 1열). `queryable`=`getSelectQueryDef()` 보유 객체. (orm.md: SELECT 절 내부 subquery 는 행당 N회 실행 → `joinSingle` 권장)

## SELECT — Window 함수 (반환 `ExprUnit`)

모두 `spec: { partitionBy?: ExprInput[]; orderBy?: [ExprInput, ("ASC"|"DESC")?][] }`(OVER 절) 인자를 받음.

- `rowNumber(spec)` — 파티션 내 순번(1-기반).
- `rank(spec)` — 순위(동순위 후 건너뜀: 1,1,3). `denseRank(spec)` — 순위(동순위 후 연속: 1,1,2).
- `ntile(n, spec)` — 파티션을 n 그룹으로 분할(그룹 번호 1~n).
- `lag(column, spec, options?)` / `lead(column, spec, options?)` — 이전/다음 행 값. `options.offset?`(기본 1), `options.default?`(없을 때 기본값).
- `firstValue(column, spec)` / `lastValue(column, spec)` — 프레임 내 첫/마지막 값.
- `sumOver(column, spec)` / `avgOver(column, spec)` / `minOver(column, spec)` / `maxOver(column, spec)` — window 합/평균/최소/최대(누적합·이동평균 등).
- `countOver(spec, column?)` — window 행 수. `column` 미지정=전체.

```typescript
db.order().select((o) => ({
  ...o,
  runningTotal: expr.sumOver(o.amount, { partitionBy: [o.userId], orderBy: [[o.createdAt, "ASC"]] }),
}));
```

## SwitchExprBuilder

`expr.switch<T>()` 반환 객체.

- `case(condition: WhereExprUnit, then: ExprInput<T>)` — 분기 추가(체이닝).
- `default(value: ExprInput<T>)` — ELSE 값 + 마무리, `ExprUnit<T>` 반환. case/default 중 최소 하나 non-null 아니면 throw.

```typescript
grade: expr.switch<string>()
  .case(expr.gte(u.score, 90), "A")
  .case(expr.gte(u.score, 80), "B")
  .default("F"),
```
