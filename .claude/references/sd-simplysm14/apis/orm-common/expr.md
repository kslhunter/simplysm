# @simplysm/orm-common — expr (SQL 표현식 빌더)

dialect 독립 SQL 표현식을 JSON AST(`Expr`)로 만드는 `expr` 객체. `where`/`having`/`search` 콜백에선 비교·논리 함수(`WhereExprUnit` 반환), `select`/`orderBy`/`groupBy` 콜백에선 값·함수·집계(`ExprUnit<T>` 반환)를 쓴다. `ExprInput<T>` = `ExprUnit<T> | T`(리터럴 직접 전달 가능). `ExprUnit.n` 게터는 nullable 을 non-null 타입으로 좁힌다.

## 값 생성

- `expr.val(dataType, value): ExprUnit` — 리터럴 래핑. `dataType` 은 `"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`, `value` 는 그 값(undefined=NULL 허용). UPDATE/UPSERT 쓰기값에 주로 사용.
- `expr.col(dataType, ...path): ExprUnit` — column 참조 직접 생성(보통은 프록시 사용, 내부용).
- `expr.raw(dataType)\`SQL ${expr}\`: ExprUnit` — Raw SQL 이스케이프 해치. 태그드 템플릿, 보간값은 자동 파라미터화. ORM 미지원 DB 함수가 필요할 때만.
- `expr.toExpr(value): Expr` — `ExprInput` → `Expr` AST 변환(내부 헬퍼).

## WHERE — 비교 (WhereExprUnit 반환)

- `expr.eq(source, target)` — 동등(=). **NULL 안전**(MySQL `<=>`, MSSQL/PG `IS NULL OR =`).
- `expr.gt(source, target)` — 초과(>).
- `expr.lt(source, target)` — 미만(<).
- `expr.gte(source, target)` — 이상(>=).
- `expr.lte(source, target)` — 이하(<=).
- `expr.between(source, from?, to?)` — 범위(BETWEEN). `from`/`to` undefined 면 해당 방향 무제한(한쪽만 주면 `>=`/`<=`).
- `expr.null(source)` — IS NULL 검사.
- `expr.like(source, pattern)` — LIKE 패턴(`%`=0+, `_`=1자, 특수문자 `\` 이스케이프).
- `expr.regexp(source, pattern)` — 정규식 매칭(구문은 DBMS 의존).
- `expr.in(source, values)` — IN 값 목록.
- `expr.inQuery(source, query)` — IN (서브쿼리). `query` 는 단일 column SELECT Queryable(아니면 throw).
- `expr.exists(query)` — EXISTS 서브쿼리(행 1개 이상이면 true). SELECT 절은 패킷 절약 위해 제거됨.

## WHERE — 논리

- `expr.not(arg: WhereExprUnit)` — 부정(NOT).
- `expr.and(conditions: WhereExprUnit[])` — AND 결합. 빈 배열 throw.
- `expr.or(conditions: WhereExprUnit[])` — OR 결합. 빈 배열 throw.

## SELECT — 문자열 (ExprUnit 반환)

- `expr.concat(...args)` — CONCAT(NULL 은 빈 문자열 취급).
- `expr.left(source, length)` / `expr.right(source, length)` — 좌/우 N자 추출.
- `expr.trim(source)` — 양쪽 공백 제거.
- `expr.padStart(source, length, fillString)` — 좌측 패딩(LPAD), 목표 길이까지 `fillString` 반복.
- `expr.replace(source, from, to)` — 치환.
- `expr.upper(source)` / `expr.lower(source)` — 대/소문자 변환.
- `expr.length(source)` — 문자 수(CHAR_LENGTH).
- `expr.byteLength(source)` — 바이트 길이(UTF-8 CJK 3바이트).
- `expr.substring(source, start, length?)` — 부분 문자열(1-base 인덱스, length 생략 시 끝까지).
- `expr.indexOf(source, search)` — 위치(1-base, 없으면 0).

## SELECT — 숫자

- `expr.abs(source)` — 절대값.
- `expr.round(source, digits: number)` — 반올림(소수 `digits` 자리).
- `expr.ceil(source)` / `expr.floor(source)` — 올림/내림.

## SELECT — 날짜

- `expr.year/month/day(source)` — 연/월/일 추출(`DateTime|DateOnly`).
- `expr.hour/minute/second(source)` — 시/분/초 추출(`DateTime|Time`).
- `expr.isoWeek(source)` — ISO 주 번호(월요일 시작, 1~53). `DateOnly`.
- `expr.isoWeekStartDate(source)` — 해당 주 월요일 날짜. `DateOnly`.
- `expr.isoYearMonth(source)` — 해당 월 1일. `DateOnly`.
- `expr.dateDiff(unit: DateUnit, from, to)` — 날짜 차(`to - from`). `unit` = `"year"|"month"|"day"|"hour"|"minute"|"second"`.
- `expr.dateAdd(unit, source, value)` — 날짜 가감(`value` 음수 허용). 반환 타입은 source 와 동일.
- `expr.formatDate(source, format: string)` — 포맷 문자열로 변환(규칙 DBMS 의존).

## SELECT — 조건

- `expr.coalesce(...args)` — 첫 non-null 반환(COALESCE). 마지막 인자가 non-nullable 이면 결과도 non-nullable.
- `expr.nullIf(source, value)` — `source===value` 면 NULL, 아니면 source.
- `expr.is(condition: WhereExprUnit): ExprUnit<boolean>` — WHERE 조건을 boolean 값으로 SELECT.
- `expr.switch<T>()` — CASE WHEN 빌더. `.case(condition, then).case(...).default(value)` 체이닝으로 분기 구성. 타입은 then/default 의 ExprUnit 또는 non-null 리터럴에서 추론(전부 null 이면 throw).
- `expr.if(condition, then, else_)` — 삼항(IF/IIF). then/else 중 최소 하나 non-null(전부 null throw).

## SELECT — 집계

집계는 모든 값 NULL/행 없음일 때만 NULL(NULL 행은 무시).
- `expr.count(arg?, distinct?: boolean)` — COUNT. `arg` 생략 시 전체 행, `distinct:true` 면 중복 제거.
- `expr.sum(arg)` — 합계(nullable number).
- `expr.avg(arg)` — 평균(nullable number).
- `expr.max(arg)` / `expr.min(arg)` — 최대/최소(nullable, 입력 타입 유지).

## SELECT — 기타

- `expr.greatest(...args)` / `expr.least(...args)` — 인자 중 최대/최소값(GREATEST/LEAST). 인자 중 ExprUnit 없으면 throw.
- `expr.rowNum(): ExprUnit<number>` — 단순 행 순번(1-base).
- `expr.random(): ExprUnit<number>` — 0~1 난수(무작위 정렬 등).
- `expr.cast(source, targetType: DataType): ExprUnit` — 타입 변환(CAST). `targetType` 예: `{ type: "varchar", length: 20 }`.
- `expr.subquery(dataType, queryable): ExprUnit` — 스칼라 서브쿼리(정확히 1행 1열). `queryable` 은 `getSelectQueryDef()` 를 가진 객체.

## SELECT — Window 함수

`spec: WinSpecInput` = `{ partitionBy?: ExprInput[]; orderBy?: [ExprInput, ("ASC"|"DESC")?][] }`.
- `expr.rowNumber(spec)` — ROW_NUMBER()(파티션 내 1-base 순번).
- `expr.rank(spec)` — RANK()(동순위 후 건너뜀: 1,1,3).
- `expr.denseRank(spec)` — DENSE_RANK()(동순위 후 연속: 1,1,2).
- `expr.ntile(n: number, spec)` — NTILE(n)(파티션을 n 그룹으로, 1~n).
- `expr.lag(column, spec, options?)` / `expr.lead(column, spec, options?)` — 이전/다음 행 값. `options` = `{ offset?: number; default?: ExprInput }`(offset 기본 1, default 는 경계값).
- `expr.firstValue(column, spec)` / `expr.lastValue(column, spec)` — 프레임 첫/마지막 값.
- `expr.sumOver/avgOver(column, spec)` — window 합/평균(누적합·이동평균).
- `expr.countOver(spec, column?)` — window 카운트(column 생략 시 전체).
- `expr.minOver/maxOver(column, spec)` — window 최소/최대.

```typescript
db.order().select((o) => ({
  ...o,
  rowNum: expr.rowNumber({ partitionBy: [o.userId], orderBy: [[o.createdAt, "DESC"]] }),
  runningTotal: expr.sumOver(o.amount, { partitionBy: [o.userId], orderBy: [[o.createdAt, "ASC"]] }),
}));
```

## 관련 타입 / 클래스

- `class ExprUnit<T>` — 값 표현식 래퍼. `dataType`/`expr`(AST)/`$infer`(타입). `.n` 게터로 non-null 좁히기.
- `class WhereExprUnit` — WHERE 절 표현식 래퍼(`expr` AST 만).
- `type ExprInput<T> = ExprUnit<T> | T`.
- `interface SwitchExprBuilder<T>` — `expr.switch()` 빌더 인터페이스(`case`/`default`).
