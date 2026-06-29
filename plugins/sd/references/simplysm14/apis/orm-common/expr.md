# @simplysm/orm-common — expr 표현식 빌더

`where`/`select`/`orderBy`/`groupBy`/`having`/CUD callback에서 SQL expression AST를 만들 때 같이 읽는 군. 사용법: [orm.md](../../manuals/orm.md)

## ExprUnit / WhereExprUnit / ExprInput

```ts
class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;
  get n(): ExprUnit<NonNullable<TPrimitive>>;
  constructor(dataType: ColumnPrimitiveStr, expr: Expr);
}
class WhereExprUnit {
  constructor(readonly expr: WhereExpr);
}
type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```

- `TPrimitive` — expression 결과의 TypeScript primitive 타입.
- `$infer` — 타입 추론용 phantom field.
- `dataType` — SQL 렌더러와 result meta가 쓰는 primitive 타입 이름.
- `expr` — dialect 독립 JSON AST.
- `n` — 같은 `dataType`/`expr` 를 가진 새 `ExprUnit<NonNullable<TPrimitive>>`; 런타임 AST는 바꾸지 않는다.
- `WhereExprUnit.expr` — WHERE/HAVING 전용 boolean AST.
- `ExprInput<T>` — expression 자리에서 `ExprUnit<T>` 또는 literal `T` 를 받을 수 있게 하는 입력 타입.

## SwitchExprBuilder

```ts
interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

- `condition` — CASE WHEN 조건.
- `then` — 조건이 참일 때 반환할 expression/literal.
- `value` — CASE ELSE 값.
- `default(value)` — 수집한 case들과 else 값으로 `type: "switch"` AST를 만든다.

## expr 값 생성

```ts
const expr: {
  val<TStr extends ColumnPrimitiveStr, T extends ColumnPrimitiveMap[TStr] | undefined>(dataType: TStr, value: T): ExprUnit<T extends undefined ? ColumnPrimitiveMap[TStr] | undefined : ColumnPrimitiveMap[TStr]>;
  col<TStr extends ColumnPrimitiveStr>(dataType: TStr, ...path: string[]): ExprUnit<ColumnPrimitiveMap[TStr] | undefined>;
  raw<T extends ColumnPrimitiveStr>(dataType: T): (strings: TemplateStringsArray, ...values: ExprInput<ColumnPrimitive>[]) => ExprUnit<ColumnPrimitiveMap[T] | undefined>;
  toExpr(value: ExprInput<ColumnPrimitive>): Expr;
}
function toExpr(value: ExprInput<ColumnPrimitive>): Expr;
```

- `val(dataType, value)` — literal value를 `type: "value"` AST로 감싼다.
- `dataType: ColumnPrimitiveStr` — value의 primitive 타입 이름.
- `value` — 저장할 literal 값. `undefined` 를 넘기면 반환 타입에 `undefined` 가 포함된다.
- `col(dataType, ...path)` — `type: "column"` AST를 만든다.
- `path: string[]` — table alias와 column path 조각.
- `raw(dataType)` — tagged template SQL escape hatch를 만든다.
- `strings` — raw SQL template 조각. 보간 위치는 `$1`, `$2` placeholder로 저장된다.
- `values` — raw SQL parameter expression 배열. 각 값은 `toExpr` 로 AST가 된다.
- `expr.toExpr` / `toExpr` — `ExprUnit` 이면 내부 `expr`, literal이면 `type: "value"` AST를 반환한다.

## expr 비교 / WHERE

```ts
eq<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
gt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
lt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
gte<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
lte<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
between<T extends ColumnPrimitive>(source: ExprUnit<T>, from?: ExprInput<T>, to?: ExprInput<T>): WhereExprUnit;
null<T extends ColumnPrimitive>(source: ExprUnit<T>): WhereExprUnit;
like(source: ExprUnit<string | undefined>, pattern: ExprInput<string | undefined>): WhereExprUnit;
regexp(source: ExprUnit<string | undefined>, pattern: ExprInput<string | undefined>): WhereExprUnit;
in<T extends ColumnPrimitive>(source: ExprUnit<T>, values: ExprInput<T>[]): WhereExprUnit;
inQuery<T extends ColumnPrimitive, TData extends Record<string, T>>(source: ExprUnit<T>, query: Queryable<TData, any>): WhereExprUnit;
exists(query: Queryable<any, any>): WhereExprUnit;
```

- `eq` — NULL-safe equality AST. 렌더러가 dialect별 NULL-safe 비교로 바꾼다.
- `gt` / `lt` / `gte` / `lte` — 초과/미만/이상/이하 비교 AST.
- `between(source, from?, to?)` — 범위 비교 AST. `from` 또는 `to` 가 없으면 해당 방향 제한을 생략한다.
- `null(source)` — IS NULL 조건 AST.
- `like(source, pattern)` — LIKE 조건 AST. 렌더러는 ESCAPE 구문을 붙인다.
- `regexp(source, pattern)` — 정규식 조건 AST. MSSQL renderer는 기본 REGEXP 미지원으로 throw한다.
- `in(source, values)` — IN 값 목록 AST. 빈 배열은 renderer에서 항상 false 조건으로 렌더링된다.
- `inQuery(source, query)` — IN subquery AST. subquery SelectQueryDef의 select column 수가 1개가 아니면 throw한다.
- `exists(query)` — EXISTS subquery AST. SelectQueryDef에서 select 절을 제거해 저장한다.
- `source` — 비교할 column/expression.
- `target` / `pattern` / `values` — 비교 대상 expression/literal.
- `query` — subquery로 사용할 Queryable.

## expr 논리

```ts
not(arg: WhereExprUnit): WhereExprUnit;
and(conditions: WhereExprUnit[]): WhereExprUnit;
or(conditions: WhereExprUnit[]): WhereExprUnit;
```

- `not(arg)` — NOT AST.
- `and(conditions)` — AND AST. 빈 배열이면 `ArgumentError`.
- `or(conditions)` — OR AST. 빈 배열이면 `ArgumentError`.
- `conditions` — 결합할 WHERE 조건 배열.

## expr 문자열

```ts
concat(...args: ExprInput<string | undefined>[]): ExprUnit<string>;
left<T extends string | undefined>(source: ExprUnit<T>, length: ExprInput<number>): ExprUnit<T>;
right<T extends string | undefined>(source: ExprUnit<T>, length: ExprInput<number>): ExprUnit<T>;
trim<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T>;
padStart<T extends string | undefined>(source: ExprUnit<T>, length: ExprInput<number>, fillString: ExprInput<string>): ExprUnit<T>;
replace<T extends string | undefined>(source: ExprUnit<T>, from: ExprInput<string>, to: ExprInput<string>): ExprUnit<T>;
upper<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T>;
lower<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T>;
length(source: ExprUnit<string | undefined>): ExprUnit<number>;
byteLength(source: ExprUnit<string | undefined>): ExprUnit<number>;
substring<T extends string | undefined>(source: ExprUnit<T>, start: ExprInput<number>, length?: ExprInput<number>): ExprUnit<T>;
indexOf<T extends string | undefined>(source: ExprUnit<T>, search: ExprInput<string>): ExprUnit<T extends undefined ? number | undefined : number>;
```

- `concat(...args)` — 문자열 연결 AST. renderer는 NULL을 빈 문자열로 처리하는 구문을 쓴다.
- `left` / `right` — 왼쪽/오른쪽에서 지정 길이만큼 추출하는 AST.
- `trim` — 양쪽 공백 제거 AST.
- `padStart` — 지정 길이에 도달할 때까지 왼쪽에 fillString을 추가하는 AST.
- `replace` — 문자열 치환 AST.
- `upper` / `lower` — 대문자/소문자 변환 AST.
- `length` — 문자 수 AST. renderer는 NULL을 빈 문자열로 처리한다.
- `byteLength` — 바이트 길이 AST. renderer는 NULL을 빈 문자열로 처리한다.
- `substring(source, start, length?)` — 부분 문자열 AST. SQL 표준 기준 시작 위치는 1부터.
- `indexOf(source, search)` — 문자열 위치 AST. 렌더링 결과는 0-based이며 못 찾으면 -1, nullable source면 타입에 `undefined` 포함.
- `length: ExprInput<number>` — 문자 개수 또는 target 길이.
- `fillString` — padding 문자열.
- `from` / `to` — 찾을 문자열과 대체 문자열.
- `start` — substring 시작 위치.
- `search` — 찾을 문자열.

## expr 숫자

```ts
abs<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T>;
round<T extends number | undefined>(source: ExprUnit<T>, digits: number): ExprUnit<T>;
ceil<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T>;
floor<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T>;
```

- `abs` — 절대값 AST.
- `round(source, digits)` — 반올림 AST.
- `digits: number` — 소수점 이하 자릿수.
- `ceil` — 올림 AST.
- `floor` — 내림 AST.

## expr 날짜

```ts
type DateUnit = "year" | "month" | "day" | "hour" | "minute" | "second";
year<T extends DateTime | DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : number>;
month<T extends DateTime | DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : number>;
day<T extends DateTime | DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : number>;
hour<T extends DateTime | Time | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : number>;
minute<T extends DateTime | Time | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : number>;
second<T extends DateTime | Time | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : number>;
isoWeek<T extends DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : number>;
isoWeekStartDate<T extends DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T>;
isoYearMonth<T extends DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T extends undefined ? undefined : string>;
dateDiff<T extends DateTime | DateOnly | Time | undefined>(unit: DateUnit, from: ExprInput<T>, to: ExprInput<T>): ExprUnit<T extends undefined ? undefined : number>;
dateAdd<T extends DateTime | DateOnly | Time | undefined>(unit: DateUnit, source: ExprUnit<T>, value: ExprInput<number>): ExprUnit<T>;
formatDate<T extends DateTime | DateOnly | Time | undefined>(source: ExprUnit<T>, format: string): ExprUnit<T extends undefined ? undefined : string>;
```

- `"year"` — 연 단위.
- `"month"` — 월 단위.
- `"day"` — 일 단위.
- `"hour"` — 시 단위.
- `"minute"` — 분 단위.
- `"second"` — 초 단위.
- `year`/`month`/`day` — DateTime 또는 DateOnly에서 연/월/일을 추출한다.
- `hour`/`minute`/`second` — DateTime 또는 Time에서 시/분/초를 추출한다.
- `isoWeek` — ISO week number AST.
- `isoWeekStartDate` — 입력 날짜가 속한 ISO 주의 월요일 date AST.
- `isoYearMonth` — `YYYYMM` 문자열 AST.
- `dateDiff(unit, from, to)` — `to - from` 차이 AST.
- `dateAdd(unit, source, value)` — source에 value 단위를 더하는 AST. value는 음수도 expression으로 받을 수 있다.
- `formatDate(source, format)` — 날짜 포맷 문자열 AST. dialect renderer가 포맷 문자열을 변환한다.
- `format: string` — formatDate renderer에 전달되는 포맷 문자열.

## expr 조건부

```ts
coalesce<TPrimitive extends ColumnPrimitive>(...args: ExprInput<TPrimitive>[]): ExprUnit<TPrimitive>;
nullIf<T extends ColumnPrimitive>(source: ExprUnit<T>, value: ExprInput<T>): ExprUnit<T | undefined>;
is(condition: WhereExprUnit): ExprUnit<boolean>;
switch<T extends ColumnPrimitive>(): SwitchExprBuilder<T>;
if<T extends ColumnPrimitive>(condition: WhereExprUnit, then: ExprInput<T>, else_: ExprInput<T>): ExprUnit<T>;
```

- `coalesce(...args)` — 첫 번째 non-null 값을 반환하는 AST. 마지막 인자가 non-nullable인 overload는 반환 타입도 non-nullable.
- `nullIf(source, value)` — source와 value가 같으면 NULL, 아니면 source를 반환하는 AST.
- `is(condition)` — WHERE 조건을 boolean value expression으로 바꾼다.
- `switch<T>()` — CASE WHEN builder를 만든다. T를 명시하면 case/default 값 타입을 강제한다.
- `if(condition, then, else_)` — 조건부 값 AST. then/else 중 ExprUnit이 있으면 그 dataType을 쓰고, 없으면 non-null literal에서 dataType을 추론한다. 둘 다 null이면 throw한다.
- `condition` — 분기 조건.
- `then` — 참일 때 값.
- `else_` — 거짓일 때 값.

## expr 집계

```ts
count(arg?: ExprUnit<ColumnPrimitive>, distinct?: boolean): ExprUnit<number>;
sum(arg: ExprUnit<number | undefined>): ExprUnit<number | undefined>;
avg(arg: ExprUnit<number | undefined>): ExprUnit<number | undefined>;
max<T extends ColumnPrimitive>(arg: ExprUnit<T>): ExprUnit<T | undefined>;
min<T extends ColumnPrimitive>(arg: ExprUnit<T>): ExprUnit<T | undefined>;
```

- `count(arg?, distinct?)` — 행 수 AST. arg 없으면 전체 행, arg 있으면 해당 column/expression을 count한다.
- `distinct?: boolean` — `true` 면 count 대상 중복 제거 플래그를 AST에 저장한다.
- `sum` / `avg` — number 합계/평균 AST. NULL 값은 무시되고 모두 NULL이거나 행이 없으면 NULL 타입.
- `max` / `min` — 최대/최소 AST. NULL 값은 무시되고 모두 NULL이거나 행이 없으면 NULL 타입.
- `arg` — 집계 대상 expression.

## expr 기타 / subquery

```ts
greatest<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T>;
least<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T>;
rowNum(): ExprUnit<number>;
random(): ExprUnit<number>;
cast<T extends ColumnPrimitive, TDataType extends DataType>(source: ExprUnit<T>, targetType: TDataType): ExprUnit<T extends undefined ? undefined : InferColumnPrimitiveFromDataType<TDataType>>;
subquery<TStr extends ColumnPrimitiveStr>(dataType: TStr, queryable: { getSelectQueryDef(): SelectQueryDef }): ExprUnit<ColumnPrimitiveMap[TStr] | undefined>;
```

- `greatest(...args)` — 여러 값 중 최대값 AST. dataType은 첫 ExprUnit 인자에서 찾으며 없으면 throw한다.
- `least(...args)` — 여러 값 중 최소값 AST. dataType은 첫 ExprUnit 인자에서 찾으며 없으면 throw한다.
- `rowNum()` — 1부터 시작하는 행 번호 AST.
- `random()` — 0과 1 사이의 난수 AST.
- `cast(source, targetType)` — source를 target SQL DataType으로 변환하는 AST.
- `targetType: DataType` — 변환 대상 SQL 타입. 반환 TS 타입은 `dataTypeStrToColumnPrimitiveStr[targetType.type]` 로 계산된다.
- `subquery(dataType, queryable)` — SELECT 절에서 단일 값을 반환하는 scalar subquery AST.
- `queryable.getSelectQueryDef()` — subquery AST에 저장할 SelectQueryDef 공급자.

## expr window

```ts
interface WinSpecInput {
  partitionBy?: ExprInput<ColumnPrimitive>[];
  orderBy?: [ExprInput<ColumnPrimitive>, ("ASC" | "DESC")?][];
}
rowNumber(spec: WinSpecInput): ExprUnit<number>;
rank(spec: WinSpecInput): ExprUnit<number>;
denseRank(spec: WinSpecInput): ExprUnit<number>;
ntile(n: number, spec: WinSpecInput): ExprUnit<number>;
lag<T extends ColumnPrimitive>(column: ExprUnit<T>, spec: WinSpecInput, options?: { offset?: number; default?: ExprInput<T> }): ExprUnit<T | undefined>;
lead<T extends ColumnPrimitive>(column: ExprUnit<T>, spec: WinSpecInput, options?: { offset?: number; default?: ExprInput<T> }): ExprUnit<T | undefined>;
firstValue<T extends ColumnPrimitive>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;
lastValue<T extends ColumnPrimitive>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;
sumOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined>;
avgOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined>;
countOver(spec: WinSpecInput, column?: ExprUnit<ColumnPrimitive>): ExprUnit<number>;
minOver<T extends ColumnPrimitive>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;
maxOver<T extends ColumnPrimitive>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;
```

- `partitionBy?: ExprInput[]` — window `PARTITION BY` expression 목록.
- `orderBy?: [ExprInput, "ASC"|"DESC"?][]` — window `ORDER BY` expression과 방향 목록.
- `"ASC"` — window 정렬 오름차순.
- `"DESC"` — window 정렬 내림차순.
- `rowNumber` — partition 내 1부터 시작하는 순번 AST.
- `rank` — 동점 같은 순위, 다음 순위 건너뜀 AST.
- `denseRank` — 동점 같은 순위, 다음 순위 연속 AST.
- `ntile(n, spec)` — partition을 n개 그룹으로 나눈 그룹 번호 AST.
- `n: number` — NTILE group 수.
- `lag(column, spec, options?)` — 이전 row 값 AST.
- `lead(column, spec, options?)` — 다음 row 값 AST.
- `options.offset?: number` — lag/lead 이동 row 수. renderer는 미지정 시 1을 사용한다.
- `options.default?: ExprInput<T>` — 이전/다음 row가 없을 때 기본값.
- `firstValue` — partition/frame 첫 값 AST.
- `lastValue` — partition/frame 마지막 값 AST. renderer는 order spec이 있을 때 전체 frame 구문을 추가한다.
- `sumOver` / `avgOver` / `countOver` / `minOver` / `maxOver` — window 집계 AST.
- `column` — window 함수 대상 expression.
