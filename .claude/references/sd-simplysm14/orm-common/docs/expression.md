# Expression

## `expr`

Dialect 독립적 SQL expression builder. SQL 문자열 대신 JSON AST(Expr)를 생성하며, QueryBuilder가 각 DBMS(MySQL, MSSQL, PostgreSQL)로 변환한다.

```typescript
export const expr: {
  // 값 생성
  val<TStr extends ColumnPrimitiveStr>(dataType: TStr, value: ColumnPrimitiveMap[TStr] | undefined): ExprUnit;
  col<TStr extends ColumnPrimitiveStr>(dataType: ColumnPrimitiveStr, ...path: string[]): ExprUnit;
  raw<T extends ColumnPrimitiveStr>(dataType: T): (strings: TemplateStringsArray, ...values: ExprInput[]) => ExprUnit;

  // WHERE - 비교 연산자
  eq<T>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  gt<T>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  lt<T>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  gte<T>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  lte<T>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit;
  between<T>(source: ExprUnit<T>, from?: ExprInput<T>, to?: ExprInput<T>): WhereExprUnit;

  // WHERE - NULL check
  null<T>(source: ExprUnit<T>): WhereExprUnit;

  // WHERE - 문자열 검색
  like(source: ExprUnit<string | undefined>, pattern: ExprInput<string | undefined>): WhereExprUnit;
  regexp(source: ExprUnit<string | undefined>, pattern: ExprInput<string | undefined>): WhereExprUnit;

  // WHERE - IN / EXISTS
  in<T>(source: ExprUnit<T>, values: ExprInput<T>[]): WhereExprUnit;
  inQuery<T>(source: ExprUnit<T>, query: Queryable): WhereExprUnit;
  exists(query: Queryable): WhereExprUnit;

  // WHERE - 논리 연산자
  not(arg: WhereExprUnit): WhereExprUnit;
  and(conditions: WhereExprUnit[]): WhereExprUnit;
  or(conditions: WhereExprUnit[]): WhereExprUnit;

  // SELECT - 문자열
  concat(...args: ExprInput<string | undefined>[]): ExprUnit<string>;
  left<T>(source: ExprUnit<T>, length: ExprInput<number>): ExprUnit<T>;
  right<T>(source: ExprUnit<T>, length: ExprInput<number>): ExprUnit<T>;
  trim<T>(source: ExprUnit<T>): ExprUnit<T>;
  padStart<T>(source: ExprUnit<T>, length: ExprInput<number>, fillString: ExprInput<string>): ExprUnit<T>;
  replace<T>(source: ExprUnit<T>, from: ExprInput<string>, to: ExprInput<string>): ExprUnit<T>;
  upper<T>(source: ExprUnit<T>): ExprUnit<T>;
  lower<T>(source: ExprUnit<T>): ExprUnit<T>;
  length(source: ExprUnit<string | undefined>): ExprUnit<number>;
  byteLength(source: ExprUnit<string | undefined>): ExprUnit<number>;
  substring<T>(source: ExprUnit<T>, start: ExprInput<number>, length?: ExprInput<number>): ExprUnit<T>;
  indexOf(source: ExprUnit<string | undefined>, search: ExprInput<string>): ExprUnit<number>;

  // SELECT - 숫자
  abs<T>(source: ExprUnit<T>): ExprUnit<T>;
  round<T>(source: ExprUnit<T>, digits: number): ExprUnit<T>;
  ceil<T>(source: ExprUnit<T>): ExprUnit<T>;
  floor<T>(source: ExprUnit<T>): ExprUnit<T>;

  // SELECT - 날짜/시간
  year(source: ExprUnit): ExprUnit<number>;
  month(source: ExprUnit): ExprUnit<number>;
  day(source: ExprUnit): ExprUnit<number>;
  hour(source: ExprUnit): ExprUnit<number>;
  minute(source: ExprUnit): ExprUnit<number>;
  second(source: ExprUnit): ExprUnit<number>;
  isoWeek(source: ExprUnit<DateOnly | undefined>): ExprUnit<number>;
  isoWeekStartDate<T>(source: ExprUnit<T>): ExprUnit<T>;
  isoYearMonth<T>(source: ExprUnit<T>): ExprUnit<T>;
  dateDiff<T>(unit: DateUnit, from: ExprInput<T>, to: ExprInput<T>): ExprUnit<number>;
  dateAdd<T>(unit: DateUnit, source: ExprUnit<T>, value: ExprInput<number>): ExprUnit<T>;
  formatDate<T>(source: ExprUnit<T>, format: string): ExprUnit<string>;

  // SELECT - 조건
  coalesce(...args: ExprInput[]): ExprUnit;
  nullIf<T>(source: ExprUnit<T>, value: ExprInput<T>): ExprUnit<T | undefined>;
  is(condition: WhereExprUnit): ExprUnit<boolean>;
  switch<T>(): SwitchExprBuilder<T>;
  if<T>(condition: WhereExprUnit, then: ExprInput<T>, else_: ExprInput<T>): ExprUnit<T>;

  // SELECT - 집계
  count(arg?: ExprUnit, distinct?: boolean): ExprUnit<number>;
  sum(arg: ExprUnit<number | undefined>): ExprUnit<number | undefined>;
  avg(arg: ExprUnit<number | undefined>): ExprUnit<number | undefined>;
  max<T>(arg: ExprUnit<T>): ExprUnit<T | undefined>;
  min<T>(arg: ExprUnit<T>): ExprUnit<T | undefined>;

  // SELECT - 기타
  greatest<T>(...args: ExprInput<T>[]): ExprUnit<T>;
  least<T>(...args: ExprInput<T>[]): ExprUnit<T>;
  rowNum(): ExprUnit<number>;
  random(): ExprUnit<number>;
  cast<T, TDataType>(source: ExprUnit<T>, targetType: TDataType): ExprUnit;
  subquery<TStr>(dataType: TStr, queryable: { getSelectQueryDef(): SelectQueryDef }): ExprUnit;

  // SELECT - Window 함수
  rowNumber(spec: WinSpecInput): ExprUnit<number>;
  rank(spec: WinSpecInput): ExprUnit<number>;
  denseRank(spec: WinSpecInput): ExprUnit<number>;
  ntile(n: number, spec: WinSpecInput): ExprUnit<number>;
  lag<T>(column: ExprUnit<T>, spec: WinSpecInput, options?: { offset?: number; default?: ExprInput<T> }): ExprUnit<T | undefined>;
  lead<T>(column: ExprUnit<T>, spec: WinSpecInput, options?: { offset?: number; default?: ExprInput<T> }): ExprUnit<T | undefined>;
  firstValue<T>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;
  lastValue<T>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;
  sumOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined>;
  avgOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined>;
  countOver(spec: WinSpecInput, column?: ExprUnit): ExprUnit<number>;
  minOver<T>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;
  maxOver<T>(column: ExprUnit<T>, spec: WinSpecInput): ExprUnit<T | undefined>;

  // Helper
  toExpr(value: ExprInput<ColumnPrimitive>): Expr;
};
```

### 주요 함수 설명

- **val()**: 리터럴 값을 ExprUnit으로 래핑. dataType에 맞는 기본 타입으로 확장.
- **raw()**: 태그드 템플릿 리터럴로 Raw SQL expression 생성. 보간된 값은 자동 파라미터화.
- **eq()**: NULL 안전 동등 비교. MySQL: `<=>`, MSSQL/PostgreSQL: `IS NULL OR =`.
- **between()**: from/to가 undefined이면 해당 방향 제한 없음.
- **inQuery()**: 서브쿼리는 단일 column만 SELECT해야 함.
- **coalesce()**: 마지막 인수가 non-nullable이면 결과도 non-nullable.
- **switch()**: 메서드 체이닝으로 CASE WHEN 구성. `.case().case().default()`.
- **subquery()**: 스칼라 서브쿼리. 정확히 하나의 행과 하나의 column 반환해야 함.
- **rowNumber()/rank()/denseRank()**: Window 함수. partitionBy와 orderBy로 구간 지정.
- **lag()/lead()**: 이전/다음 행 값 참조. offset과 default 지정 가능.
- **sumOver()/avgOver()/countOver()/minOver()/maxOver()**: Window 집계 함수.

## `SwitchExprBuilder`

CASE WHEN 표현식 빌더 인터페이스.

```typescript
export interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}
```

## `ExprUnit`

타입 안전 표현식 래퍼. TypeScript 제네릭을 사용하여 표현식 반환 타입을 추적한다.

```typescript
export class ExprUnit<TPrimitive extends ColumnPrimitive> {
  readonly $infer!: TPrimitive;
  readonly dataType: ColumnPrimitiveStr;
  readonly expr: Expr;

  get n(): ExprUnit<NonNullable<TPrimitive>>;

  constructor(dataType: ColumnPrimitiveStr, expr: Expr);
}
```

| Field | Type | Description |
|-------|------|-------------|
| `$infer` | `TPrimitive` | 타입 추론용 phantom 필드 |
| `dataType` | `ColumnPrimitiveStr` | 데이터 타입 문자열 |
| `expr` | `Expr` | 내부 AST 표현 |
| `n` (getter) | `ExprUnit<NonNullable<TPrimitive>>` | non-nullable 버전 반환 |

## `WhereExprUnit`

WHERE 절용 표현식 래퍼.

```typescript
export class WhereExprUnit {
  readonly expr: WhereExpr;
  constructor(expr: WhereExpr);
}
```

## `ExprInput`

ExprUnit 또는 리터럴 값을 받는 입력 타입.

```typescript
export type ExprInput<TPrimitive extends ColumnPrimitive> = ExprUnit<TPrimitive> | TPrimitive;
```
