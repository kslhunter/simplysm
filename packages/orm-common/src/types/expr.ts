import type { ColumnPrimitive, DataType } from "./column";
import type { SelectQueryDef } from "./query-def";

/**
 * Date operation unit
 *
 * Used in Date functions like dateDiff, dateAdd, etc.
 */
export type DateUnit = "year" | "month" | "day" | "hour" | "minute" | "second";

//#region ========== value expression ==========

/**
 * Column reference expression
 *
 * @property path - Column path (e.g. tableAlias.columnName)
 */
export interface ExprColumn {
  type: "column";
  path: string[];
}

/**
 * Literal value expression
 *
 * @property value - Column primitive value
 */
export interface ExprValue {
  type: "value";
  value: ColumnPrimitive;
}

/**
 * Raw SQL expression
 *
 * @property sql - SQL string (parameters denoted as {0}, {1})
 * @property params - Parameter expression array
 */
export interface ExprRaw {
  type: "raw";
  sql: string;
  params: Expr[];
}

//#endregion

//#region ========== Comparison operations (for WHERE) ==========

/** Equality comparison (=) - NULL-safe */
export interface ExprEq {
  type: "eq";
  source: Expr;
  target: Expr;
}

/** Greater than comparison (>) */
export interface ExprGt {
  type: "gt";
  source: Expr;
  target: Expr;
}

/** Less than comparison (<) */
export interface ExprLt {
  type: "lt";
  source: Expr;
  target: Expr;
}

/** Greater than or equal comparison (>=) */
export interface ExprGte {
  type: "gte";
  source: Expr;
  target: Expr;
}

/** Less than or equal comparison (<=) */
export interface ExprLte {
  type: "lte";
  source: Expr;
  target: Expr;
}

/** Range comparison (BETWEEN from AND to) */
export interface ExprBetween {
  type: "between";
  source: Expr;
  from?: Expr;
  to?: Expr;
}

/** NULL check (IS NULL) */
export interface ExprIsNull {
  type: "null";
  arg: Expr;
}

/** Pattern matching (LIKE) */
export interface ExprLike {
  type: "like";
  source: Expr;
  pattern: Expr;
}

/** Regular expression matching (REGEXP) */
export interface ExprRegexp {
  type: "regexp";
  source: Expr;
  pattern: Expr;
}

/** Value list inclusion check (IN) */
export interface ExprIn {
  type: "in";
  source: Expr;
  values: Expr[];
}

/** Subquery result inclusion check (IN subquery) */
export interface ExprInQuery {
  type: "inQuery";
  source: Expr;
  query: SelectQueryDef;
}

/** Subquery existence check (EXISTS) */
export interface ExprExists {
  type: "exists";
  query: SelectQueryDef;
}

//#endregion

//#region ========== Logical operations ==========

/** Logical negation (NOT) */
export interface ExprNot {
  type: "not";
  arg: WhereExpr;
}

/** Logical conjunction (AND) */
export interface ExprAnd {
  type: "and";
  conditions: WhereExpr[];
}

/** Logical disjunction (OR) */
export interface ExprOr {
  type: "or";
  conditions: WhereExpr[];
}

//#endregion

//#region ========== String function ==========

/** String concatenation (CONCAT) */
export interface ExprConcat {
  type: "concat";
  args: Expr[];
}

/** Extract left N characters (LEFT) */
export interface ExprLeft {
  type: "left";
  source: Expr;
  length: Expr;
}

/** Extract right N characters (RIGHT) */
export interface ExprRight {
  type: "right";
  source: Expr;
  length: Expr;
}

/** Remove leading and trailing whitespace (TRIM) */
export interface ExprTrim {
  type: "trim";
  arg: Expr;
}

/** Left padding (LPAD) */
export interface ExprPadStart {
  type: "padStart";
  source: Expr;
  length: Expr;
  fillString: Expr;
}

/** String replacement (REPLACE) */
export interface ExprReplace {
  type: "replace";
  source: Expr;
  from: Expr;
  to: Expr;
}

/** Uppercase transform (UPPER) */
export interface ExprUpper {
  type: "upper";
  arg: Expr;
}

/** Lowercase transform (LOWER) */
export interface ExprLower {
  type: "lower";
  arg: Expr;
}

/** Character length (CHAR_LENGTH) */
export interface ExprLength {
  type: "length";
  arg: Expr;
}

/** Byte length (LENGTH/DATALENGTH) */
export interface ExprByteLength {
  type: "byteLength";
  arg: Expr;
}

/** Substring (SUBSTRING) */
export interface ExprSubstring {
  type: "substring";
  source: Expr;
  start: Expr;
  length?: Expr;
}

/** String position (LOCATE/CHARINDEX/POSITION) */
export interface ExprIndexOf {
  type: "indexOf";
  source: Expr;
  search: Expr;
}

//#endregion

//#region ========== Number function ==========

/** Absolute value (ABS) */
export interface ExprAbs {
  type: "abs";
  arg: Expr;
}

/** Rounding (ROUND) */
export interface ExprRound {
  type: "round";
  arg: Expr;
  digits: number;
}

/** Ceiling (CEIL) */
export interface ExprCeil {
  type: "ceil";
  arg: Expr;
}

/** Floor (FLOOR) */
export interface ExprFloor {
  type: "floor";
  arg: Expr;
}

//#endregion

//#region ========== Date function ==========

/** Year extraction (YEAR) */
export interface ExprYear {
  type: "year";
  arg: Expr;
}

/** Month extraction (MONTH) */
export interface ExprMonth {
  type: "month";
  arg: Expr;
}

/** Day extraction (DAY) */
export interface ExprDay {
  type: "day";
  arg: Expr;
}

/** Hour extraction (HOUR) */
export interface ExprHour {
  type: "hour";
  arg: Expr;
}

/** Minute extraction (MINUTE) */
export interface ExprMinute {
  type: "minute";
  arg: Expr;
}

/** Second extraction (SECOND) */
export interface ExprSecond {
  type: "second";
  arg: Expr;
}

/** ISO week number (WEEK) */
export interface ExprIsoWeek {
  type: "isoWeek";
  arg: Expr;
}

/** ISO week start date */
export interface ExprIsoWeekStartDate {
  type: "isoWeekStartDate";
  arg: Expr;
}

/** ISO year-month (YYYYMM format) */
export interface ExprIsoYearMonth {
  type: "isoYearMonth";
  arg: Expr;
}

/** Date difference (DATEDIFF) */
export interface ExprDateDiff {
  type: "dateDiff";
  unit: DateUnit;
  from: Expr;
  to: Expr;
}

/** Date arithmetic (DATEADD) */
export interface ExprDateAdd {
  type: "dateAdd";
  unit: DateUnit;
  source: Expr;
  value: Expr;
}

/** Date format (FORMAT/DATE_FORMAT) */
export interface ExprFormatDate {
  type: "formatDate";
  source: Expr;
  format: string;
}

//#endregion

//#region ========== Conditional ==========

/** NULL replacement (COALESCE - returns first non-null) */
export interface ExprCoalesce {
  type: "coalesce";
  args: Expr[];
}

/** Conditional NULL (NULLIF - returns NULL if source === value) */
export interface ExprNullIf {
  type: "nullIf";
  source: Expr;
  value: Expr;
}

/** Transform condition to value (boolean -> 0/1) */
export interface ExprIs {
  type: "is";
  condition: WhereExpr;
}

/** CASE WHEN expression */
export interface ExprSwitch {
  type: "switch";
  cases: { when: WhereExpr; then: Expr }[];
  else: Expr;
}

/** IF expression (IIF/IF) */
export interface ExprIf {
  type: "if";
  condition: WhereExpr;
  then: Expr;
  else?: Expr;
}

//#endregion

//#region ========== Aggregation ==========

/** Record count (COUNT) */
export interface ExprCount {
  type: "count";
  arg?: Expr;
  distinct?: boolean;
}

/** Sum (SUM) */
export interface ExprSum {
  type: "sum";
  arg: Expr;
}

/** Average (AVG) */
export interface ExprAvg {
  type: "avg";
  arg: Expr;
}

/** Maximum value (MAX) */
export interface ExprMax {
  type: "max";
  arg: Expr;
}

/** Minimum value (MIN) */
export interface ExprMin {
  type: "min";
  arg: Expr;
}

//#endregion

//#region ========== Other ==========

/** Maximum value selection (GREATEST) */
export interface ExprGreatest {
  type: "greatest";
  args: Expr[];
}

/** Minimum value selection (LEAST) */
export interface ExprLeast {
  type: "least";
  args: Expr[];
}

/** Row number (simple ROW_NUMBER version) */
export interface ExprRowNum {
  type: "rowNum";
}

/** Random number (RAND/RANDOM) */
export interface ExprRandom {
  type: "random";
}

/** Type cast (CAST) */
export interface ExprCast {
  type: "cast";
  source: Expr;
  targetType: DataType;
}

//#endregion

//#region ========== Window Functions ==========

// Window Function Types

/** ROW_NUMBER() */
export interface WinFnRowNumber {
  type: "rowNumber";
}

/** RANK() */
export interface WinFnRank {
  type: "rank";
}

/** DENSE_RANK() */
export interface WinFnDenseRank {
  type: "denseRank";
}

/** NTILE(n) */
export interface WinFnNtile {
  type: "ntile";
  n: number;
}

/** LAG() - Previous row value */
export interface WinFnLag {
  type: "lag";
  column: Expr;
  offset?: number;
  default?: Expr;
}

/** LEAD() - Next row value */
export interface WinFnLead {
  type: "lead";
  column: Expr;
  offset?: number;
  default?: Expr;
}

/** FIRST_VALUE() */
export interface WinFnFirstValue {
  type: "firstValue";
  column: Expr;
}

/** LAST_VALUE() */
export interface WinFnLastValue {
  type: "lastValue";
  column: Expr;
}

/** Window SUM */
export interface WinFnSum {
  type: "sum";
  column: Expr;
}

/** Window AVG */
export interface WinFnAvg {
  type: "avg";
  column: Expr;
}

/** Window COUNT */
export interface WinFnCount {
  type: "count";
  column?: Expr;
}

/** Window MIN */
export interface WinFnMin {
  type: "min";
  column: Expr;
}

/** Window MAX */
export interface WinFnMax {
  type: "max";
  column: Expr;
}

/**
 * Window function union type
 *
 * Ranking, navigation, and aggregation Window functions
 */
export type WinFn =
  | WinFnRowNumber
  | WinFnRank
  | WinFnDenseRank
  | WinFnNtile
  | WinFnLag
  | WinFnLead
  | WinFnFirstValue
  | WinFnLastValue
  | WinFnSum
  | WinFnAvg
  | WinFnCount
  | WinFnMin
  | WinFnMax;

/**
 * Window specification (OVER clause)
 *
 * @property partitionBy - PARTITION BY expression list
 * @property orderBy - ORDER BY [column, direction] list
 */
export interface WinSpec {
  partitionBy?: Expr[];
  orderBy?: [Expr, ("ASC" | "DESC")?][];
}

/**
 * Window expression
 *
 * Window function + Window specification composition
 */
export interface ExprWindow {
  type: "window";
  fn: WinFn;
  spec: WinSpec;
}

//#endregion

//#region ========== System ==========

/** Scalar Subquery */
export interface ExprSubquery {
  type: "subquery";
  queryDef: SelectQueryDef;
}

//#endregion

//#region ========== Union Types ==========

/**
 * Expression used in WHERE clause (returns boolean)
 *
 * Union type of comparison operations + logical operations
 * Used in where(), having(), etc.
 */
export type WhereExpr =
  // Comparison
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

  // Logical
  | ExprNot
  | ExprAnd
  | ExprOr;

/**
 * All expression union type
 *
 * All expressions including value, string, number, date, conditional, aggregation, window, etc.
 * Used in select(), orderBy(), etc.
 *
 * @see {@link WhereExpr} WHERE clause-specific expression
 */
export type Expr =
  // Value
  | ExprColumn
  | ExprValue
  | ExprRaw

  // String
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

  // Numeric
  | ExprAbs
  | ExprRound
  | ExprCeil
  | ExprFloor

  // Date
  | ExprYear
  | ExprMonth
  | ExprDay
  | ExprHour
  | ExprMinute
  | ExprSecond
  | ExprIsoWeek
  | ExprIsoWeekStartDate
  | ExprIsoYearMonth
  | ExprDateDiff
  | ExprDateAdd
  | ExprFormatDate

  // Condition
  | ExprCoalesce
  | ExprNullIf
  | ExprIs
  | ExprSwitch
  | ExprIf

  // Aggregate
  | ExprCount
  | ExprSum
  | ExprAvg
  | ExprMax
  | ExprMin

  // Other
  | ExprGreatest
  | ExprLeast
  | ExprRowNum
  | ExprRandom
  | ExprCast

  // Window
  | ExprWindow

  // System
  | ExprSubquery;

//#endregion
