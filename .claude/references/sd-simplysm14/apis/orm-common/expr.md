# @simplysm/orm-common — expr (SQL 표현식 빌더)

`expr` 객체로 dialect 독립 SQL 표현식을 JSON AST(`Expr`)로 조립한다. dialect 별 QueryBuilder 가 MySQL/MSSQL/PostgreSQL 로 변환. where/having 콜백은 `WhereExprUnit[]`, select/orderBy/groupBy 콜백은 `ExprUnit<T>`, update/upsert/insert/where 비교값은 `ExprInput<T>`(= `ExprUnit<T> | T`)를 다룬다. 비교·쓰기 값은 리터럴을 그대로 넘긴다 — `expr.val` 로 감싸지 말 것(orm.md). `expr.subquery`/`expr.exists` 를 SELECT 절에 넣지 말고 `joinSingle` 로 집계를 부착한다(orm.md).

## 래퍼 타입

- `ExprUnit<T>` — 타입 안전 표현식 래퍼. `dataType`(`ColumnPrimitiveStr`)·`expr`(`Expr` AST) 보유. getter `n` 은 동일 표현식을 non-nullable 타입(`NonNullable<T>`)으로 다시 래핑(coalesce 후 null 아님이 보장될 때 타입만 좁힐 용도).
- `WhereExprUnit` — WHERE 절용 래퍼(`WhereExpr` AST 보유). `where`/`having` 콜백 반환 원소.
- `ExprInput<T>` = `ExprUnit<T> | T` — 표현식 또는 리터럴 둘 다 받는 입력 타입. 비교 target·쓰기 값 자리.
- `SwitchExprBuilder<T>` — `expr.switch()` 가 반환하는 CASE 빌더(`case`/`default`).

## 값 생성

- `val(dataType, value)` — 리터럴을 `ExprUnit` 으로 래핑. `dataType`=`"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Buffer"` 등 원시 타입 문자열. `value`=값(undefined 허용 → NULL). `ExprUnit` 이 요구되는 자리(select 의 리터럴 상수 컬럼 등)에서만 사용.
- `col(dataType, ...path)` — 컬럼 참조 `ExprUnit` 생성. `path`=별칭·컬럼 경로. 보통 콜백의 컬럼 프록시가 대신하므로 내부용.
- `raw(dataType)\`...\`` — Raw SQL 이스케이프 해치. 태그드 템플릿. 보간 값은 자동 파라미터화. ORM 미지원 DB 함수·UNION 의 타입 명시 NULL(`` expr.raw("number")`NULL` ``)에 사용.
- `toExpr(value)` — `ExprInput` 을 `Expr` AST 로 변환(내부 헬퍼).

## WHERE — 비교 (`WhereExprUnit` 반환)

- `eq(source, target)` — `=` 비교(NULL 안전: MySQL `<=>`, 그 외 `IS NULL OR =`). NULL 끼리도 일치 판정해야 할 때.
- `gt(source, target)` / `lt(source, target)` / `gte(source, target)` / `lte(source, target)` — `>` / `<` / `>=` / `<=`.
- `between(source, from?, to?)` — 범위. `from` undefined 면 하한 없음, `to` undefined 면 상한 없음(한쪽만 주면 단방향 부등호).
- `null(source)` — `IS NULL`. nullable 컬럼의 결측 판정.

## WHERE — 문자열/IN/논리

- `like(source, pattern)` — `LIKE`(% 다수, _ 단일, `\` 이스케이프). 부분/접두/접미 검색.
- `regexp(source, pattern)` — 정규식 매칭(구문은 DBMS 의존).
- `in(source, values)` — `IN (값목록)`. `values`=`ExprInput[]`.
- `inQuery(source, query)` — `IN (SELECT 단일컬럼)`. 서브쿼리가 단일 컬럼 select 가 아니면 throw.
- `exists(query)` — `EXISTS (...)`. 서브쿼리 SELECT 절은 패킷 절약 위해 제거됨. WHERE 절 존재 검사용(SELECT 절에는 쓰지 말 것).
- `not(arg)` — 조건 부정.
- `and(conditions)` / `or(conditions)` — 조건 배열 AND/OR 결합. 빈 배열이면 `ArgumentError`. (`where` 에 배열을 넘기면 자동 AND 이므로 `and` 는 OR 안에서 묶을 때 등에 사용.)

```typescript
db.user().where((u) => [
  expr.eq(u.status, "active"),
  expr.between(u.age, 18, undefined),
  expr.or([expr.like(u.name, "김%"), expr.like(u.name, "이%")]),
])
```

## SELECT — 문자열 (`ExprUnit` 반환)

- `concat(...args)` — `CONCAT`(NULL 은 빈 문자열 처리).
- `left(source, length)` / `right(source, length)` — 왼쪽/오른쪽 N자 추출.
- `trim(source)` — 양쪽 공백 제거.
- `padStart(source, length, fillString)` — `LPAD`. `length` 도달까지 `fillString` 으로 왼쪽 패딩(주문번호 zero-pad 등).
- `replace(source, from, to)` — 문자열 치환.
- `upper(source)` / `lower(source)` — 대/소문자 변환.
- `length(source)` — 문자 수. `byteLength(source)` — 바이트 수(UTF-8 CJK 3바이트).
- `substring(source, start, length?)` — 부분 문자열(1부터 시작, `length` 생략 시 끝까지).
- `indexOf(source, search)` — 위치 찾기(1부터, 없으면 0).

## SELECT — 숫자 / 날짜

- `abs(source)` / `round(source, digits)` / `ceil(source)` / `floor(source)` — 절대값/반올림(`digits`=소수자릿수)/올림/내림.
- `year`/`month`/`day`/`hour`/`minute`/`second`(source) — 날짜·시간 구성요소 추출(number).
- `isoWeek(source)` — ISO 8601 주 번호(월요일 시작, 1~53). `isoWeekStartDate(source)` — 해당 주 월요일(DateOnly). `isoYearMonth(source)` — 해당 월 1일(DateOnly).
- `dateDiff(unit, from, to)` — 날짜 차이(`to - from`). `unit`=`"year"|"month"|"day"|"hour"|"minute"|"second"`.
- `dateAdd(unit, source, value)` — 날짜 가감(`value` 음수 허용). 결과 타입은 `source` 와 동일.
- `formatDate(source, format)` — 날짜 포맷 문자열(포맷 구문 DBMS 의존, 예 `"%Y-%m-%d"`).

## SELECT — 조건

- `coalesce(...args)` — 첫 non-null 값(`COALESCE`). 마지막 인자가 non-nullable 이면 결과도 non-nullable 로 추론.
- `nullIf(source, value)` — `source === value` 면 NULL, 아니면 source(빈 문자열 → NULL 변환 등).
- `is(condition)` — `WhereExprUnit` 을 boolean `ExprUnit` 으로 변환(조건 결과를 컬럼으로). select 절에서 도메인 boolean 컬럼 만들 때.
- `switch<T>()` — CASE WHEN 빌더(`SwitchExprBuilder`). `case(condition, then)` 체이닝 후 `default(value)` 로 종료. then/default 의 타입에서 결과 타입 추론(모두 리터럴이면 non-null 하나에서 추론, 전부 null 이면 throw).
- `if(condition, then, else_)` — 삼항(IIF/IF). then/else 중 ExprUnit 또는 non-null 리터럴에서 타입 추론.

```typescript
db.user().select((u) => ({
  isActive: expr.is(expr.eq(u.status, "active")),
  grade: expr.switch<string>().case(expr.gte(u.score, 90), "A").case(expr.gte(u.score, 80), "B").default("F"),
}))
```

## SELECT — 집계 / 기타

집계는 NULL 값 행을 무시하고, 모든 값이 NULL 이거나 행이 없을 때만 NULL 반환.

- `count(arg?, distinct?)` — `COUNT`. `arg` 생략 시 전체 행, 지정 시 그 컬럼의 non-null 행. `distinct` true 면 중복 제거 카운트.
- `sum(arg)` / `avg(arg)` — 합계/평균(number, NULL 가능).
- `max(arg)` / `min(arg)` — 최대/최소(타입 유지, NULL 가능).
- `greatest(...args)` / `least(...args)` — 인자들 중 최대/최소값(행 단위, 집계 아님).
- `rowNum()` — 단순 행 순번(1부터). `random()` — 0~1 난수(무작위 정렬 `orderBy(() => expr.random())`).
- `cast(source, targetType)` — 타입 변환. `targetType`=`DataType`(예 `{ type: "varchar", length: 20 }`).
- `subquery(dataType, queryable)` — 스칼라 서브쿼리(단일 행·단일 컬럼). SELECT 절에서 단일 값 반환. (행마다 N회 실행되므로 집계는 `joinSingle` 권장, orm.md.)

## SELECT — 윈도우 함수

모두 `spec: { partitionBy?: ExprInput[]; orderBy?: [ExprInput, ("ASC"|"DESC")?][] }` 를 받는다(`partitionBy`=구간 분할 컬럼, `orderBy`=구간 내 정렬).

- `rowNumber(spec)` — `ROW_NUMBER()`(파티션 내 1부터 순번).
- `rank(spec)` — `RANK()`(동순위 후 건너뜀: 1,1,3). `denseRank(spec)` — `DENSE_RANK()`(연속: 1,1,2).
- `ntile(n, spec)` — `NTILE(n)`(파티션을 `n` 그룹으로 분할, 1~n).
- `lag(column, spec, options?)` / `lead(column, spec, options?)` — 이전/다음 행 값. `options.offset`(기본 1)·`options.default`(이전/다음 행 없을 때 기본값).
- `firstValue(column, spec)` / `lastValue(column, spec)` — 프레임 내 첫/마지막 값.
- `sumOver`/`avgOver`(column, spec) — 윈도우 합계/평균(누적합·이동평균).
- `countOver(spec, column?)` — 윈도우 카운트(`column` 생략 시 전체 행).
- `minOver`/`maxOver`(column, spec) — 윈도우 최소/최대.

```typescript
db.order().select((o) => ({
  ...o,
  rowNum: expr.rowNumber({ partitionBy: [o.userId], orderBy: [[o.createdAt, "DESC"]] }),
  runningTotal: expr.sumOver(o.amount, { partitionBy: [o.userId], orderBy: [[o.createdAt, "ASC"]] }),
}))
```
