# @simplysm/orm-common — expr (SQL 표현식 빌더)

`expr` 객체로 dialect 독립 SQL 표현식을 JSON AST(`Expr`)로 조립한다. where/having 콜백은 `WhereExprUnit[]` 를, select/orderBy/groupBy/update 콜백은 `ExprUnit<T>` 또는 리터럴을 반환한다. 모든 인자는 `ExprInput<T>`(= `ExprUnit<T> | T`) — 컬럼·중첩 식·리터럴을 섞어 넘길 수 있다.

핵심 래퍼:

- `class ExprUnit<TPrimitive>` — 타입 추적 표현식 래퍼. `dataType: ColumnPrimitiveStr`, `expr: Expr`(AST), `get n` (= 반환 타입에서 `undefined` 제거한 non-null 버전, nullable 컬럼을 비-nullable 로 단언할 때).
- `class WhereExprUnit` — WHERE 조건 래퍼(`expr: WhereExpr`). 비교/논리 연산이 반환.
- `type ExprInput<T> = ExprUnit<T> | T` — 표현식 또는 리터럴 입력.
- `interface SwitchExprBuilder<T>` — `switch()` 가 반환하는 CASE 빌더(`.case(cond, then)` 체이닝 + `.default(value)` 종료).
- `expr.toExpr(value): Expr` — `ExprInput` 을 `Expr` AST 로 변환(내부용, 직접 AST 다룰 때).

## 값 생성 (val / col / raw)

- `val(dataType, value): ExprUnit` — 리터럴을 ExprUnit 으로. `dataType`=`"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`. `value`=값(undefined 허용 시 nullable 반환). update/insert 값에 타입을 명시할 때.
- `col(dataType, ...path): ExprUnit` — 컬럼 참조 직접 생성(보통 콜백 프록시가 대신). `path`=alias·컬럼명 분절.
- `raw(dataType)\`SQL ${val}\`: ExprUnit` — 이스케이프 해치. ORM 미지원 DB 함수를 태그드 템플릿으로. 보간 값은 자동 파라미터화. `dataType`=반환 타입.

```typescript
expr.val("string", "active")
expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`
```

## WHERE — 비교 (eq / gt / lt / gte / lte / between)

전부 `(source: ExprUnit<T>, target: ExprInput<T>) => WhereExprUnit`(between 제외).

- `eq(source, target)` — `=` (NULL 안전: MySQL `<=>`, MSSQL/PG `IS NULL OR =`).
- `gt` / `lt` / `gte` / `lte` — `>` / `<` / `>=` / `<=`.
- `between(source, from?, to?)` — BETWEEN. `from`/`to` undefined 면 그 방향 무제한(`from`만 주면 `>=`, `to`만 주면 `<=`).

## WHERE — NULL / 문자열 / IN / EXISTS

- `null(source): WhereExprUnit` — `IS NULL`.
- `like(source, pattern)` — `LIKE`(`%`=다수, `_`=단일, `\` 이스케이프). 부분/접두 검색.
- `regexp(source, pattern)` — 정규식 매칭(구문은 DBMS별 상이).
- `in(source, values: ExprInput[])` — `IN (값목록)`.
- `inQuery(source, query: Queryable)` — `IN (SELECT ...)`. 서브쿼리가 단일 컬럼만 SELECT 해야 함(아니면 throw).
- `exists(query: Queryable)` — `EXISTS (SELECT ...)`. SELECT 절은 제거해 패킷 절약. 상관 서브쿼리로 존재 검사.

```typescript
db.user().where((u) => [expr.in(u.status, ["active", "pending"]), expr.exists(db.order().where((o) => [expr.eq(o.userId, u.id)]))])
```

## WHERE — 논리 (not / and / or)

- `not(arg: WhereExprUnit)` — 조건 부정.
- `and(conditions: WhereExprUnit[])` — AND 결합. 빈 배열이면 throw.
- `or(conditions: WhereExprUnit[])` — OR 결합. 빈 배열이면 throw.

## SELECT — 문자열

- `concat(...args)` — CONCAT(NULL→빈문자). 반환 `ExprUnit<string>`.
- `left(source, length)` / `right(source, length)` — 좌/우에서 length 글자.
- `trim(source)` — 양쪽 공백 제거.
- `padStart(source, length, fillString)` — LPAD, 대상 길이까지 왼쪽 채움.
- `replace(source, from, to)` — 문자열 치환.
- `upper(source)` / `lower(source)` — 대/소문자.
- `length(source)` — 문자 수(반환 `number`). `byteLength(source)` — 바이트 수(UTF-8 CJK 3B).
- `substring(source, start, length?)` — 부분 추출(1-기반 인덱스, length 생략 시 끝까지).
- `indexOf(source, search)` — 위치(1-기반, 없으면 0).

(string 입력류는 `<T extends string|undefined>` 로 nullable 전파.)

## SELECT — 숫자

- `abs(source)` — 절대값. `round(source, digits)` — 반올림(digits 자리). `ceil(source)` — 올림. `floor(source)` — 내림. 모두 nullable 전파.

## SELECT — 날짜

- `year/month/day(source)` — DateTime|DateOnly 에서 연/월/일(`number`). `hour/minute/second(source)` — DateTime|Time 에서 시/분/초.
- `isoWeek(source)` — ISO 주번호(1~53). `isoWeekStartDate(source)` — 주의 월요일(`DateOnly`). `isoYearMonth(source)` — 해당 월 1일(`DateOnly`).
- `dateDiff(unit, from, to)` — 날짜 차(`to - from`). `unit`=`DateUnit`(`"year"|"month"|"day"|"hour"|"minute"|"second"`).
- `dateAdd(unit, source, value)` — 날짜 더하기(음수 허용, 결과 타입은 source 와 동일).
- `formatDate(source, format)` — 포맷 문자열(`"%Y-%m-%d"`, 규칙 DBMS별 상이) → `string`.

(nullable source 면 결과도 nullable.)

## SELECT — 조건 (coalesce / nullIf / is / switch / if)

- `coalesce(...args)` — 첫 non-null(COALESCE). 마지막 인자가 non-nullable 이면 결과도 non-nullable.
- `nullIf(source, value)` — `source === value` 면 NULL, 아니면 source(빈문자→NULL 정규화 등). 결과 nullable.
- `is(condition: WhereExprUnit): ExprUnit<boolean>` — WHERE 조건을 boolean 컬럼으로(SELECT 절에서).
- `switch<T>(): SwitchExprBuilder<T>` — CASE WHEN. `.case(cond, then)` 체이닝 후 `.default(value)` 로 종료. then/default 중 하나는 non-null 이어야 타입 추론(전부 null 이면 throw).
- `if<T>(condition, then, else_): ExprUnit<T>` — 삼항(IF). then/else 중 하나는 non-null 필요(아니면 throw).

```typescript
db.user().select((u) => ({
  grade: expr.switch<string>().case(expr.gte(u.score, 90), "A").case(expr.gte(u.score, 80), "B").default("F"),
  isAdult: expr.is(expr.gte(u.age, 18)),
}))
```

## SELECT — 집계 (count / sum / avg / max / min)

집계는 행이 없거나 전부 NULL 일 때만 NULL(NULL 행은 무시). count 만 항상 `number`, 나머지는 nullable.

- `count(arg?, distinct?)` — 행 수. `arg` 생략 시 전체, `distinct:true` 면 중복 제거.
- `sum(arg)` / `avg(arg)` — number 컬럼 합/평균(`number|undefined`).
- `max(arg)` / `min(arg)` — 임의 타입 최대/최소(`T|undefined`, 타입은 arg 따라감).

## SELECT — 기타 (greatest / least / rowNum / random / cast / subquery)

- `greatest(...args)` / `least(...args)` — 여러 값 중 최대/최소(인자 중 ExprUnit 1개 이상 필요, 없으면 throw).
- `rowNum(): ExprUnit<number>` — 행 순번(1-기반). `random(): ExprUnit<number>` — 0~1 난수(무작위 정렬용).
- `cast(source, targetType: DataType): ExprUnit` — 타입 변환. `targetType`=`{ type: "varchar", length: 20 }` 등. 결과 타입은 targetType 으로 추론, nullable 전파.
- `subquery(dataType, queryable): ExprUnit` — 스칼라 서브쿼리(1행 1컬럼). SELECT 절에서 상관 집계 등에. 결과 nullable.

```typescript
db.user().select((u) => ({ id: u.id, postCount: expr.subquery("number", db.post().where((p) => [expr.eq(p.userId, u.id)]).select(() => ({ c: expr.count() }))) }))
```

## SELECT — Window 함수

전부 `spec: { partitionBy?: ExprInput[]; orderBy?: [ExprInput, ("ASC"|"DESC")?][] }` 를 받아 OVER 절 구성.

- `rowNumber(spec): ExprUnit<number>` — ROW_NUMBER(파티션 내 1-기반 순번).
- `rank(spec)` / `denseRank(spec)` — RANK(동순위 후 건너뜀: 1,1,3) / DENSE_RANK(연속: 1,1,2).
- `ntile(n, spec)` — NTILE, 파티션을 n 그룹으로(1~n).
- `lag(column, spec, options?)` / `lead(column, spec, options?)` — 이전/다음 행 값. `options.offset`(기본 1), `options.default`(없을 때 기본값). 결과 nullable.
- `firstValue(column, spec)` / `lastValue(column, spec)` — 프레임 첫/마지막 값(nullable).
- `sumOver(column, spec)` / `avgOver(column, spec)` — 윈도우 합/평균(누적합·이동평균).
- `countOver(spec, column?)` — 윈도우 행 수(`column` 생략 시 전체).
- `minOver(column, spec)` / `maxOver(column, spec)` — 윈도우 최소/최대(nullable).

```typescript
db.order().select((o) => ({ ...o, runningTotal: expr.sumOver(o.amount, { partitionBy: [o.userId], orderBy: [[o.createdAt, "ASC"]] }) }))
```
