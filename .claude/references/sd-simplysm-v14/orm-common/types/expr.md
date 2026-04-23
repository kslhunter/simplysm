# Expr

SQL 표현식 AST 타입 모음. `expr.*` 함수들이 내부적으로 생성하며, `QueryBuilderBase`가 SQL 문자열로 변환한다.

## `Expr`

모든 SELECT 표현식 AST의 유니온 타입.

```typescript
export type Expr =
  | ExprColumn
  | ExprValue
  | ExprRaw
  | ExprConcat
  | ExprLeft
  | ExprRight
  | ExprTrim
  | ExprPadStart
  | ExprReplace
  | ExprUpper
  | ExprLower
  | ExprLength
  | ExprByteLength
  | ExprSubstring
  | ExprIndexOf
  | ExprAbs
  | ExprRound
  | ExprCeil
  | ExprFloor
  | ExprAdd
  | ExprSub
  | ExprMul
  | ExprDiv
  | ExprMod
  | ExprYear
  | ExprMonth
  | ExprDay
  | ExprHour
  | ExprMinute
  | ExprSecond
  | ExprDateDiff
  | ExprDateAdd
  | ExprCount
  | ExprSum
  | ExprAvg
  | ExprMax
  | ExprMin
  | ExprRowNumber
  | ExprRank
  | ExprDenseRank
  | ExprLag
  | ExprLead
  | ExprSumOver
  | ExprCountOver
  | ExprAvgOver
  | ExprMaxOver
  | ExprMinOver
  | ExprFirstValue
  | ExprLastValue
  | ExprNtile
  | ExprSubquery
  | ExprIf
  | ExprSwitch
  | ExprCoalesce
  | ExprNullIf
  | ExprCast
  | ExprToDateOnly
  | ExprToDateTime;
```

## `WhereExpr`

WHERE 절 표현식 AST 유니온 타입.

```typescript
export type WhereExpr =
  | ExprEq
  | ExprGt
  | ExprLt
  | ExprGte
  | ExprLte
  | ExprBetween
  | ExprIsNull
  | ExprLike
  | ExprRegexp
  | ExprIn
  | ExprInQuery
  | ExprExists
  | ExprNot
  | ExprAnd
  | ExprOr;
```

## `DateUnit`

날짜 연산 단위. `expr.dateDiff()`, `expr.dateAdd()`에서 사용.

```typescript
export type DateUnit = "year" | "month" | "day" | "hour" | "minute" | "second";
```

## `WinSpec`

윈도우 함수 스펙.

```typescript
export interface WinSpec {
  partitionBy?: Expr[];
  orderBy?: [Expr, ("ASC" | "DESC")?][];
}
```

## 값 표현식 인터페이스

| 인터페이스 | `type` 값 | 설명 |
|------------|-----------|------|
| `ExprColumn` | `"column"` | 컬럼 참조. `path: string[]` |
| `ExprValue` | `"value"` | 리터럴 값. `value: ColumnPrimitive` |
| `ExprRaw` | `"raw"` | Raw SQL. `sql: string`, `params: Expr[]` |

## 비교 표현식 인터페이스 (WhereExpr)

| 인터페이스 | `type` 값 | 설명 |
|------------|-----------|------|
| `ExprEq` | `"eq"` | `=` (NULL 안전). `source`, `target` |
| `ExprGt` | `"gt"` | `>`. `source`, `target` |
| `ExprLt` | `"lt"` | `<`. `source`, `target` |
| `ExprGte` | `"gte"` | `>=`. `source`, `target` |
| `ExprLte` | `"lte"` | `<=`. `source`, `target` |
| `ExprBetween` | `"between"` | `BETWEEN`. `source`, `from?`, `to?` |
| `ExprIsNull` | `"null"` | `IS NULL`. `arg` |
| `ExprLike` | `"like"` | `LIKE`. `source`, `pattern` |
| `ExprRegexp` | `"regexp"` | 정규식. `source`, `pattern` |
| `ExprIn` | `"in"` | `IN (...)`. `source`, `values: Expr[]` |
| `ExprInQuery` | `"inQuery"` | `IN (SELECT ...)`. `source`, `query: SelectQueryDef` |
| `ExprExists` | `"exists"` | `EXISTS (SELECT ...)`. `query: SelectQueryDef` |
| `ExprNot` | `"not"` | `NOT`. `arg: WhereExpr` |
| `ExprAnd` | `"and"` | `AND`. `conditions: WhereExpr[]` |
| `ExprOr` | `"or"` | `OR`. `conditions: WhereExpr[]` |

## 집계/윈도우 함수 인터페이스

| 인터페이스 | `type` 값 | 설명 |
|------------|-----------|------|
| `ExprCount` | `"count"` | `COUNT(*)` 또는 `COUNT(arg)`. `arg?: Expr` |
| `ExprSum` | `"sum"` | `SUM(arg)`. `arg: Expr` |
| `ExprAvg` | `"avg"` | `AVG(arg)`. `arg: Expr` |
| `ExprMax` | `"max"` | `MAX(arg)`. `arg: Expr` |
| `ExprMin` | `"min"` | `MIN(arg)`. `arg: Expr` |
| `ExprRowNumber` | `"rowNumber"` | `ROW_NUMBER() OVER (...)`. `winSpec: WinSpec` |
| `ExprRank` | `"rank"` | `RANK() OVER (...)`. `winSpec: WinSpec` |
| `ExprDenseRank` | `"denseRank"` | `DENSE_RANK() OVER (...)`. `winSpec: WinSpec` |
| `ExprLag` | `"lag"` | `LAG(...) OVER (...)`. `source`, `offset?`, `default?`, `winSpec?` |
| `ExprLead` | `"lead"` | `LEAD(...) OVER (...)`. `source`, `offset?`, `default?`, `winSpec?` |
| `ExprSumOver` | `"sumOver"` | `SUM(...) OVER (...)` |
| `ExprCountOver` | `"countOver"` | `COUNT(...) OVER (...)` |
| `ExprAvgOver` | `"avgOver"` | `AVG(...) OVER (...)` |
| `ExprMaxOver` | `"maxOver"` | `MAX(...) OVER (...)` |
| `ExprMinOver` | `"minOver"` | `MIN(...) OVER (...)` |
| `ExprFirstValue` | `"firstValue"` | `FIRST_VALUE(...) OVER (...)` |
| `ExprLastValue` | `"lastValue"` | `LAST_VALUE(...) OVER (...)` |
| `ExprNtile` | `"ntile"` | `NTILE(n) OVER (...)` |

## 조건부/변환 인터페이스

| 인터페이스 | `type` 값 | 설명 |
|------------|-----------|------|
| `ExprIf` | `"if"` | `IF(cond, then, else)`. `condition: WhereExpr`, `then: Expr`, `else_: Expr` |
| `ExprSwitch` | `"switch"` | `CASE WHEN`. `cases: { condition, then }[]`, `default?: Expr` |
| `ExprCoalesce` | `"coalesce"` | `COALESCE(...)`. `args: Expr[]` |
| `ExprNullIf` | `"nullIf"` | `NULLIF(source, target)` |
| `ExprCast` | `"cast"` | `CAST(source AS type)`. `source: Expr`, `dataType: DataType` |
| `ExprToDateOnly` | `"toDateOnly"` | DateTime → DateOnly 변환 |
| `ExprToDateTime` | `"toDateTime"` | DateOnly → DateTime 변환 |
| `ExprSubquery` | `"subquery"` | 단일 값 반환 서브쿼리. `dataType: ColumnPrimitiveStr`, `query: SelectQueryDef` |
