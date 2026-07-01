# @simplysm/orm-common — expr 표현식 빌더

`expr` 는 dialect 독립 SQL 표현식을 JSON AST(`Expr`)로 만드는 빌더 객체. 결과는 `ExprUnit`(값/스칼라) 또는 `WhereExprUnit`(조건)으로 래핑되며, QueryBuilder 가 각 DBMS SQL 로 변환한다. `Queryable` 콜백 안에서 사용한다. 사용법: [orm.md](../../manuals/orm.md).

대부분 인자는 `ExprInput<T>`(= `ExprUnit<T> | T` 리터럴) 또는 `ExprUnit<T>` 를 받는다. 반환 값의 nullability(`T | undefined`)는 입력 컬럼의 nullable 여부를 끝까지 전파한다.

## ExprUnit / WhereExprUnit / ExprInput (`expr/expr-unit.ts`)

- `class ExprUnit<TPrimitive extends ColumnPrimitive>` — 타입 안전 표현식 래퍼. `$infer`(추론용 phantom), `dataType: ColumnPrimitiveStr`, `expr: Expr` 보유. getter `n` 은 타입을 `NonNullable<TPrimitive>` 로 좁힌 동일 expr(개발자가 NULL 아님을 단언).
- `class WhereExprUnit` — WHERE 조건 래퍼. `expr: WhereExpr` 보유. `where`/`having`/논리 연산 인자로 쓰인다.
- `type ExprInput<TPrimitive>` — `ExprUnit<TPrimitive> | TPrimitive`. 리터럴 값 또는 표현식 둘 다 허용하는 입력 타입.
- `SwitchExprBuilder<T>` — `switch()` 가 반환. `case(condition: WhereExprUnit, then: ExprInput<T>)` 누적 후 `default(value): ExprUnit<T>` 로 종료.

## 값 생성

- `val(dataType, value)` — 리터럴을 `ExprUnit` 으로 래핑. `value` 가 `undefined` 면 결과 타입에 `undefined` 포함. `dataType` 은 `ColumnPrimitiveStr`("string"/"number"/"boolean"/"DateTime"/"DateOnly"/"Time"/"Uuid"/"Bytes").
- `col(dataType, ...path)` — 컬럼 참조 `ExprUnit<T | undefined>`. 보통 직접 쓰지 않고 컬럼 프록시로 접근.
- `raw(dataType)` — 태그드 템플릿 함수 반환(이스케이프 해치). 보간 값은 자동 파라미터화. ORM 미지원 DB 전용 구문에 사용.
- `toExpr(value)` — `ExprInput` 을 `Expr` AST 로 변환(내부/고급용).

## WHERE — 비교 (반환 `WhereExprUnit`)

- `eq(source, target)` — 동등(=). **NULL 안전**(MySQL `<=>`, MSSQL/PG `IS NULL OR =`).
- `gt` / `lt` / `gte` / `lte(source, target)` — `>` / `<` / `>=` / `<=`.
- `between(source, from?, to?)` — BETWEEN. `from`/`to` 가 `undefined`(또는 null)이면 해당 방향 제한 없음.

## WHERE — NULL / 문자열 / IN / 논리

- `null(source)` — IS NULL.
- `like(source, pattern)` — LIKE(`%`,`_` 와일드카드, 특수문자 `\` 이스케이프).
- `regexp(source, pattern)` — 정규식 매칭(구문은 DBMS 의존).
- `in(source, values: ExprInput<T>[])` — IN 값 목록.
- `inQuery(source, query: Queryable)` — IN (SELECT). 서브쿼리가 단일 컬럼이 아니면 throw.
- `exists(query: Queryable)` — EXISTS(SELECT 절 제거해 패킷 절약).
- `not(arg)` — NOT.
- `and(conditions: WhereExprUnit[])` — AND 결합. 빈 배열이면 `ArgumentError`.
- `or(conditions)` — OR 결합. 빈 배열이면 `ArgumentError`.

## SELECT — 문자열 (반환 `ExprUnit`)

- `concat(...args)` — CONCAT. NULL 은 빈 문자열 처리. 반환 `ExprUnit<string>`.
- `left(source, length)` / `right(source, length)` — 왼/오른쪽 N자.
- `trim(source)` — 양쪽 공백 제거.
- `padStart(source, length, fillString)` — 왼쪽 패딩(LPAD).
- `replace(source, from, to)` — 치환(REPLACE).
- `upper(source)` / `lower(source)` — 대/소문자.
- `length(source)` — 문자 수(`ExprUnit<number>`).
- `byteLength(source)` — 바이트 길이(UTF-8 CJK 3바이트).
- `substring(source, start, length?)` — 1-기반 부분 문자열, `length` 생략 시 끝까지.
- `indexOf(source, search)` — 위치. **0-기반, 미발견 시 -1**, source 가 NULL 이면 `undefined`.

문자열 변환 함수(`left`/`right`/`trim`/`padStart`/`replace`/`upper`/`lower`/`substring`)는 입력 `T extends string | undefined` 의 nullability 를 결과에 그대로 전파한다.

## SELECT — 숫자

- `abs(source)` / `ceil(source)` / `floor(source)` — 절대값 / 올림 / 내림. nullability 전파.
- `round(source, digits)` — 반올림, `digits`=소수 자릿수.

## SELECT — 날짜

- `year`/`month`/`day(source)` — `DateTime | DateOnly` 에서 연/월/일(`number`, NULL 전파).
- `hour`/`minute`/`second(source)` — `DateTime | Time` 에서 시/분/초.
- `isoWeek(source: DateOnly)` — ISO 주 번호(1~53).
- `isoWeekStartDate(source: DateOnly)` — 해당 주 월요일(`ExprUnit<DateOnly>`).
- `isoYearMonth(source: DateOnly)` — "YYYYMM" 문자열.
- `dateDiff(unit, from, to)` — 날짜 차이(`to - from`). `unit`=`DateUnit`("year"|"month"|"day"|"hour"|"minute"|"second").
- `dateAdd(unit, source, value)` — 날짜 가감(`value` 음수 허용). 반환 타입은 `source` 와 동일.
- `formatDate(source, format)` — 포맷 문자열(예 `"%Y-%m-%d"`, 규칙 DBMS 의존)로 `string` 반환.

## SELECT — 조건

- `coalesce(...args)` — 첫 non-null. 마지막 인수가 non-nullable 이면 결과도 `NonNullable`(오버로드).
- `nullIf(source, value)` — `source === value` 면 NULL(`ExprUnit<T | undefined>`).
- `is(condition: WhereExprUnit)` — 조건을 boolean(0/1) 값으로(`ExprUnit<boolean>`).
- `switch<T>()` — CASE WHEN 빌더(`SwitchExprBuilder<T>`). `T` 명시 시 case/default 값 타입 동질성 강제, 생략 시 비강제.
- `if(condition, then, else_)` — 삼항(IIF/IF). 둘 다 NULL 리터럴이면 throw(데이터 타입 추론 불가).

## SELECT — 집계

집계는 NULL 값 행을 무시하고, 모든 값이 NULL 이거나 행이 없을 때만 NULL 반환.

- `count(arg?, distinct?)` — COUNT(`ExprUnit<number>`). `arg` 생략=전체 행, `distinct: true`=중복 제거.
- `sum(arg)` / `avg(arg)` — 합/평균(`number | undefined`).
- `max(arg)` / `min(arg)` — 최대/최소(`T | undefined`, 타입 유지).

## SELECT — 기타

- `greatest(...args)` / `least(...args)` — 여러 값 중 최대/최소. 인자 중 최소 1개가 `ExprUnit` 이어야 dataType 추론(아니면 throw).
- `rowNum()` — 모든 행에 1부터 순번(`number`).
- `random()` — 0~1 난수. 무작위 정렬용.
- `cast(source, targetType: DataType)` — 타입 변환. 결과 타입은 `targetType` 에서 추론, source 가 NULL 이면 `undefined`.
- `subquery(dataType, queryable)` — 스칼라 서브쿼리(1행 1컬럼). `ExprUnit<T | undefined>`.

## SELECT — 윈도우 함수

모두 `spec: { partitionBy?, orderBy? }`(WinSpecInput; `orderBy`=`[expr, "ASC"|"DESC"?][]`)를 받는다.

- `rowNumber(spec)` — ROW_NUMBER(파티션 내 1부터).
- `rank(spec)` — RANK(동순위 후 건너뜀: 1,1,3).
- `denseRank(spec)` — DENSE_RANK(동순위 후 연속: 1,1,2).
- `ntile(n, spec)` — NTILE(파티션을 n 그룹).
- `lag(column, spec, options?)` / `lead(column, spec, options?)` — 이전/다음 행 값. `options.offset`(기본 1), `options.default`(경계 기본값).
- `firstValue(column, spec)` / `lastValue(column, spec)` — 파티션 첫/마지막 값.
- `sumOver`/`avgOver(column, spec)` — 윈도우 합/평균(`number | undefined`).
- `countOver(spec, column?)` — 윈도우 행 수(`number`).
- `minOver`/`maxOver(column, spec)` — 윈도우 최소/최대(`T | undefined`).
