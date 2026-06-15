# @simplysm/orm-common — expr

dialect 독립 SQL 표현식 빌더 군. `expr.*` 함수가 SQL 문자열 대신 JSON AST(`Expr`)를 만들고, QueryBuilder 가 DBMS 별로 렌더링한다. `where`/`select`/`groupBy`/`orderBy`/`having`/`update` 콜백 안에서 컬럼 프록시(`ExprUnit`)를 받아 조합한다. 비교/논리 함수는 `WhereExprUnit`(WHERE 절용), 그 외는 `ExprUnit<T>`(값 표현식)를 반환한다.

`ExprInput<T> = ExprUnit<T> | T` — 비교 대상·값 인자는 리터럴을 그대로 받는다(`expr.val` 래핑 불필요, orm.md).

## ExprUnit / WhereExprUnit / ExprInput

```typescript
class ExprUnit<TPrimitive> {
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;
  get n(): ExprUnit<NonNullable<TPrimitive>>;   // nullable 제거(타입만)
}
class WhereExprUnit { readonly expr: WhereExpr; }
type ExprInput<TPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

- `ExprUnit<T>` — 타입 안전 표현식 래퍼. `dataType` 은 결과 원시 타입 이름, `expr` 은 AST. 컬럼 프록시의 각 필드가 이 타입.
- `.n` — 타입 수준에서 `undefined` 를 제거한 새 `ExprUnit`(런타임 AST 동일). nullable 컬럼을 non-null 로 단언할 때.
- `WhereExprUnit` — `where`/`having` 가 받는 boolean 조건 래퍼.
- `ExprInput<T>` — 표현식 또는 리터럴.

## 값 생성

- `expr.val(dataType, value)` — 리터럴을 `ExprUnit` 으로 래핑. `dataType` 은 `"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`. `value` 가 `undefined` 면 결과 타입이 nullable. **`select` 등 `ExprUnit` 이 요구되는 자리에서만** 사용(비교·CUD 값은 리터럴 직접 전달).
- `expr.col(dataType, ...path)` — 컬럼 참조(`{ type:"column", path }`). 보통 프록시가 자동 생성하므로 직접 호출은 드묾.
- `expr.raw(dataType)\`...\`` — Raw SQL 이스케이프 해치. 태그드 템플릿이며 보간값(`${u.x}`)은 자동 파라미터화. ORM 미지원 DB 함수·UNION NULL 자리채움(`expr.raw("number")\`NULL\``, orm-union.md)에 사용.
- `expr.toExpr(value)` — `ExprInput` → `Expr` 변환(내부 헬퍼).

```typescript
db.user().select((u) => ({ name: u.name, label: expr.val("string", "fixed") }));
expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`;
```

## WHERE — 비교 (→ WhereExprUnit)

- `expr.eq(source, target)` — 동등 비교. **NULL 안전**(MySQL `<=>`, 그 외 `IS NULL OR =`).
- `expr.gt` / `expr.lt` / `expr.gte` / `expr.lte` — `>` / `<` / `>=` / `<=`.
- `expr.between(source, from?, to?)` — 범위(BETWEEN). `from`/`to` 가 undefined 면 그 방향 제한 없음(한쪽만 주면 `>=`/`<=`).
- `expr.null(source)` — IS NULL.
- `expr.like(source, pattern)` — LIKE(`%`/`_` 와일드카드, `\` 이스케이프).
- `expr.regexp(source, pattern)` — 정규식 매칭(구문은 DBMS 의존).
- `expr.in(source, values)` — IN 값 목록.
- `expr.inQuery(source, query)` — IN (SELECT). 서브쿼리는 **단일 컬럼만** SELECT 해야 함(아니면 throw).
- `expr.exists(query)` — EXISTS(서브쿼리가 1행 이상이면 true). SELECT 절을 제거해 패킷 절약.

```typescript
db.user().where((u) => [expr.eq(u.status, "active"), expr.between(u.age, 18, 65)]);
db.user().where((u) => [expr.inQuery(u.id, db.order().select((o) => ({ userId: o.userId })))]);
```

## WHERE — 논리 (→ WhereExprUnit)

- `expr.not(arg)` — 조건 부정(NOT).
- `expr.and(conditions)` — AND 결합. **빈 배열이면 `ArgumentError`**.
- `expr.or(conditions)` — OR 결합. **빈 배열이면 `ArgumentError`**.

```typescript
db.user().where((u) => [expr.or([expr.eq(u.status, "active"), expr.eq(u.status, "pending")])]);
```

## SELECT — 문자열 (→ ExprUnit)

- `expr.concat(...args)` — CONCAT(NULL 은 빈 문자열).
- `expr.left(source, length)` / `expr.right(source, length)` — 왼/오른쪽 N자.
- `expr.trim(source)` — 양쪽 공백 제거.
- `expr.padStart(source, length, fillString)` — LPAD(목표 길이까지 왼쪽 채움).
- `expr.replace(source, from, to)` — 치환.
- `expr.upper(source)` / `expr.lower(source)` — 대/소문자.
- `expr.length(source)` — 문자 수. `expr.byteLength(source)` — 바이트 수(UTF-8 CJK 3바이트).
- `expr.substring(source, start, length?)` — 부분 문자열(**1부터 시작**).
- `expr.indexOf(source, search)` — 위치(1부터, 없으면 0).

## SELECT — 숫자 (→ ExprUnit)

- `expr.abs(source)` — 절대값.
- `expr.round(source, digits)` — 반올림(소수 자릿수).
- `expr.ceil(source)` / `expr.floor(source)` — 올림/내림.

## SELECT — 날짜 (→ ExprUnit)

- `expr.year` / `expr.month` / `expr.day` (DateTime|DateOnly), `expr.hour` / `expr.minute` / `expr.second` (DateTime|Time) — 각 단위 추출(number).
- `expr.isoWeek(source)` — ISO 8601 주 번호(1~53). `expr.isoWeekStartDate(source)` — 그 주의 월요일(DateOnly). `expr.isoYearMonth(source)` — `"YYYYMM"` 문자열.
- `expr.dateDiff(unit, from, to)` — 날짜 차(`to - from`). `unit` 은 `"year"|"month"|"day"|"hour"|"minute"|"second"`.
- `expr.dateAdd(unit, source, value)` — 날짜 가감(음수 가능).
- `expr.formatDate(source, format)` — 포맷 문자열(예 `"%Y-%m-%d"`, DBMS 의존).

```typescript
db.user().select((u) => ({
  age: expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today())),
}));
```

## SELECT — 조건 (→ ExprUnit)

- `expr.coalesce(...args)` — 첫 non-null(COALESCE). 마지막 인자가 non-nullable 이면 결과도 non-nullable(오버로드).
- `expr.nullIf(source, value)` — `source === value` 면 NULL, 아니면 source.
- `expr.is(condition)` — `WhereExprUnit` 을 boolean 컬럼으로(SELECT 절에서 조건 결과 노출).
- `expr.switch<T>()` — CASE WHEN 빌더. `.case(condition, then)` 체이닝 후 `.default(value)` 로 종료해 `ExprUnit` 반환. then/default 중 하나 이상 non-null 이어야 dataType 추론 가능.
- `expr.if(condition, then, else_)` — 삼항(IF/IIF). then/else 중 하나 이상 non-null 필요.

```typescript
db.user().select((u) => ({
  grade: expr.switch<string>()
    .case(expr.gte(u.score, 90), "A")
    .case(expr.gte(u.score, 80), "B")
    .default("F"),
  isAdult: expr.is(expr.gte(u.age, 18)),
}));
```

## SELECT — 집계 (→ ExprUnit)

NULL 값 행은 무시되고, 행이 없거나 전부 NULL 일 때만 NULL 반환.

- `expr.count(arg?, distinct?)` — COUNT. `arg` 없으면 `COUNT(*)`, `distinct: true` 면 중복 제거.
- `expr.sum(arg)` / `expr.avg(arg)` — SUM/AVG(nullable number).
- `expr.max(arg)` / `expr.min(arg)` — MAX/MIN(인자 타입 유지, nullable).

## SELECT — 기타 (→ ExprUnit)

- `expr.greatest(...args)` / `expr.least(...args)` — 여러 값 중 최대/최소(GREATEST/LEAST). 인자 중 하나 이상 `ExprUnit` 이어야 dataType 추론(아니면 throw).
- `expr.rowNum()` — 모든 행에 1부터 순번(단순).
- `expr.random()` — 0~1 난수(주로 `orderBy` 무작위 정렬).
- `expr.cast(source, targetType)` — 타입 변환(CAST). `targetType` 은 `DataType`(예 `{ type:"varchar", length:20 }`).
- `expr.subquery(dataType, queryable)` — 스칼라 서브쿼리(정확히 1행 1컬럼). SELECT 절에서 단일 값. (행당 N회 실행 주의 — 집계는 `joinSingle` 권장, orm.md.)

```typescript
db.order().select((o) => ({ idStr: expr.cast(o.id, { type: "varchar", length: 20 }) }));
```

## SELECT — 윈도우 함수 (→ ExprUnit, OVER)

모두 `spec: { partitionBy?: ExprInput[]; orderBy?: [ExprInput, ("ASC"|"DESC")?][] }` 를 받는다.

- `expr.rowNumber(spec)` — ROW_NUMBER(파티션 내 1부터).
- `expr.rank(spec)` — RANK(동순위 후 건너뜀: 1,1,3). `expr.denseRank(spec)` — DENSE_RANK(연속: 1,1,2).
- `expr.ntile(n, spec)` — 파티션을 n 그룹으로(1~n).
- `expr.lag(column, spec, options?)` / `expr.lead(column, spec, options?)` — 이전/다음 행 값. `options.offset`(기본 1)·`options.default`(없을 때 값).
- `expr.firstValue(column, spec)` / `expr.lastValue(column, spec)` — 프레임 첫/끝 값.
- `expr.sumOver` / `expr.avgOver` / `expr.minOver` / `expr.maxOver` (column, spec) — 윈도우 집계. `expr.countOver(spec, column?)` — 윈도우 COUNT(`column` 생략 시 전체).

```typescript
db.order().select((o) => ({
  ...o,
  rowNum: expr.rowNumber({ partitionBy: [o.userId], orderBy: [[o.createdAt, "DESC"]] }),
  runningTotal: expr.sumOver(o.amount, { partitionBy: [o.userId], orderBy: [[o.createdAt, "ASC"]] }),
}));
```

## SwitchExprBuilder

```typescript
interface SwitchExprBuilder<TPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

`expr.switch<T>()` 의 반환 인터페이스. `case` 누적 후 `default` 로 종료해야 `ExprUnit` 이 나온다.

## 주의사항

- 비교(`eq` 등)·CUD 값은 리터럴 직접 — `expr.val` 금지(orm.md). `expr.val`/`expr.raw` 는 `ExprUnit` 이 요구되는 select 컬럼·UNION 자리채움에서만.
- `and`/`or` 에 빈 배열, `inQuery` 에 다중 컬럼 서브쿼리, `greatest`/`least`/`coalesce` 에 ExprUnit 없는 인자 전부 throw.
- 집계·도출은 SELECT 절 subquery/exists 대신 `joinSingle` 로 outer 행에 부착(orm.md 안티패턴).
