# @simplysm/sd-orm-common — QueryHelper (db.qh) + CASE 헬퍼

- `class QueryHelper`. `db.qh` 로 노출.
- WHERE 조건과 SQL 함수/식을 dialect 인지하며 생성함.
  - 조건 메서드는 `TQueryBuilderValue`(또는 그 배열)를 반환해 `Queryable.where`/`having`/`qh.and`/`qh.or` 인자로 씀.
  - 필드/함수 메서드는 `QueryUnit<T>` 를 반환해 `select`/다른 함수의 인자로 합성함.
- 인자 `TEntityValue<T>` = 평면 값 `T` 또는 `QueryUnit<T>`.

생성: `new QueryHelper(dialect)`. dialect 가 mysql/sqlite/mssql/mssql-azure 인지에 따라 `<=>`, `||` vs `+`, `N'...'` vs `'...'`, `LONGTEXT` vs `NTEXT`, `TIMESTAMPDIFF` vs `DATEDIFF` 등이 갈림.

## WHERE 조건 (→ TQueryBuilderValue[])

- `equal(source, target)` — `=`. target null 이면 `IS NULL`.
  - mysql 은 `<=>`(null-safe), 그 외 QueryUnit 쌍이면 (둘다 null) OR (=) 로 null-safe 처리.
- `notEqual(source, target)` — `!=`. null 처리를 OR 조합으로 보정.
- `isNull(source)` / `isNotNull(source)` — `IS NULL` / `IS NOT NULL`.
- `isTrue(source)` / `isFalse(source)` — bool 참/거짓(false 는 null 포함).
- `lessThen` / `lessThenOrEqual` / `greaterThen` / `greaterThenOrEqual(source, target)` — `<`/`<=`/`>`/`>=`. 문자/숫자/날짜류.
- `between(source, from, to)` — from/to 중 존재하는 쪽만 `>=`/`<=` AND. 둘 다 null 이면 `[]`(조건 없음).
- `includes` / `notIncludes(source, target)` — `LIKE %target%` / `NOT LIKE`(null OR 보정).
- `like` / `notLike(source, target)` — 원시 `LIKE` 패턴 그대로.
- `regexp` / `notRegexp(source, target)` — `REGEXP` / `NOT REGEXP`.
- `startsWith` / `notStartsWith` / `endsWith` / `notEndsWith(source, target)` — 접두/접미 매칭(dialect별 `||`/`+`/CONCAT).
- `in(src, target[])` / `notIn(src, target[])` — `IN`/`NOT IN`.
  - 빈 배열이면 항상 거짓(`1=0`)/참(`1=1`). null 포함 시 `IS NULL` OR 보정.
- `and(args)` / `or(args)` — 조건들을 `AND`/`OR` 결합. and 는 undefined 항목 스킵.

## 값 / 표현식 빌드 (→ QueryUnit)

- `query<T>(type, texts: (string | QueryUnit)[])` — raw SQL 토큰으로 QueryUnit 합성. `type`=결과 런타임 타입.
- `val<T>(value, type?)` — 값을 QueryUnit 로 래핑(type 미지정 시 값에서 추론).
- `is(where: TQueryBuilderValue): QueryUnit<boolean>` — 조건식을 boolean 값 컬럼으로(`CASE WHEN ... THEN 1 ELSE 0`). select 에 조건을 넣을 때 필수 래퍼.
- `ifNull(source, ...targets): QueryUnit` — `ISNULL`(mssql)/`IFNULL` 연쇄.
- `cast<T>(src, targetType)` — `CONVERT`. mysql 은 `mysqlConvertType` 매핑, 그 외 `type()` 매핑.
- `concat(...args)` — 문자열 연결(mysql CONCAT, 그 외 `+`/`||`, null→'').

## 날짜/시간

- `dateDiff(separator: TDbDateSeparator, from, to): QueryUnit<number>` — 차이(mysql TIMESTAMPDIFF / 그 외 DATEDIFF).
- `dateAdd(separator, from, value): QueryUnit<T>` — 가감(DATE_ADD/DATEADD).
- `dateToString(value, code: number): QueryUnit<string>` — 포맷 변환. `code` 는 MSSQL CONVERT 스타일 코드.
  - mssql 은 `CONVERT(NVARCHAR(25), v, code)`, mysql 은 code 112/120/114 만 지원(그 외 NotImplementError).
- `year` / `month` / `day(value): QueryUnit<number>` — 연/월/일 추출.
- `isoWeek` / `isoWeekStartDate` / `isoYearMonth(value)` — ISO 주차 번호 / 그 주 시작일 / ISO 기준 연-월. mysql/mssql 분기 내장.
- `separator: TDbDateSeparator` — `"year"|"quarter"|"month"|"day"|"week"|"hour"|"minute"|"second"|"millisecond"|"microsecond"|"nanosecond"`.

## 문자열 / 수치 함수

- `left` / `right(src, num)` — 좌/우 num 글자.
- `padStart(src, length, fillString)` — fillString 으로 좌측 패딩하여 length 길이.
- `trim(src)` — 양끝 공백 제거(RTRIM/LTRIM).
- `replace(src, from, to)` — 치환.
- `toUpperCase` / `toLowerCase(src)` — 대소문자.
- `abs(src)` — 절댓값.
- `dataLength(arg)` — 바이트 길이(LENGTH/DATALENGTH).
- `stringLength(arg)` — 문자 길이(CHAR_LENGTH/LEN).
- `rowIndex(orderBy: [값, "asc"|"desc"][], groupBy?)` — `ROW_NUMBER() OVER(...)`. groupBy 주면 PARTITION BY.

## 집계 (GROUP BY 컨텍스트)

- `count(arg?): QueryUnit<number>` — 인자 없으면 `COUNT(*)`, 있으면 `COUNT(DISTINCT(arg))`.
- `sum(arg)` / `avg(arg)` — 합/평균.
- `round(arg, len)` / `ceil(arg)` / `floor(arg)` — 반올림(자릿수)/올림/내림.
- `max(unit)` / `min(unit)` — 최대/최소. Boolean 은 Number 캐스팅 후 다시 Boolean 캐스팅.
- `greatest(...args): QueryUnit<T>` — `GREATEST(...)`. (mssql 2022 이하 미지원 → `greater(source, target)` 는 `@deprecated` CASE 기반 대체.)
- `exists(arg)` / `notExists(arg): QueryUnit<boolean>` — count 기반 존재/부재.

## 변환/직렬화 헬퍼 (주로 내부/어댑터)

- `getQueryValue(value): string` (Queryable 이면 `ISelectQueryDef`) — 값/QueryUnit/Queryable 을 SQL 단편으로.
  - 문자열은 `N'...'`/`'...'`, bool→1/0, 날짜/Uuid/Buffer dialect별 직렬화.
  - Queryable 은 서브쿼리(top 1, 단일 컬럼 아니면 throw).
- `getBulkInsertQueryValue(value)` — 대량 INSERT용 raw 값 변환(따옴표 없이 원시값/포맷 문자열).
- `type(type: Type | TSdOrmDataType | string | undefined): string` — TS 타입/`TSdOrmDataType`/문자열을 dialect별 DB 타입 문자열로. 미인식 타입은 TypeError.
- `mysqlConvertType(type): string` — mysql `CONVERT` 대상 타입 매핑.

## CaseQueryHelper&lt;T&gt; (qh.case)

`qh.case(predicate, then)` 이 반환. 단순 `CASE WHEN <조건> THEN ... [WHEN ...] ELSE ... END`.

- `case(predicate: 조건 | TQueryBuilderValue, then): this` — WHEN/THEN 절 추가(체이닝).
- `else(then): QueryUnit<T>` — ELSE 후 종료, 최종 QueryUnit 반환.

## CaseWhenQueryHelper&lt;T&gt; (qh.caseWhen)

`qh.caseWhen(arg)` 이 반환. 단일 식 `arg` 를 여러 값과 동등 비교하는 `CASE ... END`(switch 형).

- `when(arg, then): CaseWhenQueryHelper<T>` — `arg == when값` 일 때 then(내부적으로 `qh.equal`).
- `else(then): QueryUnit<T>` — ELSE 후 종료.
