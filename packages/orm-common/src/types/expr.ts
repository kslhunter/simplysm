import type { ColumnPrimitive, DataType } from "./column";
import type { SelectQueryDef } from "./query-def";

/**
 * 날짜 연산 단위
 *
 * dateDiff, dateAdd 등 Date function에서 사용
 */
export type DateSeparator = "year" | "month" | "day" | "hour" | "minute" | "second";

//#region ========== value expression ==========

/**
 * 컬럼 참조 expression
 *
 * @property path - Column 경로 (테이블별칭.컬럼명 등)
 */
export interface ExprColumn {
  type: "column";
  path: string[];
}

/**
 * 리터럴 value expression
 *
 * @property value - Column 프리미티브 value
 */
export interface ExprValue {
  type: "value";
  value: ColumnPrimitive;
}

/**
 * Raw SQL expression
 *
 * @property sql - SQL 문자열 (파라미터는 {0}, {1}로 표시)
 * @property params - 파라미터 expression array
 */
export interface ExprRaw {
  type: "raw";
  sql: string;
  params: Expr[];
}

//#endregion

//#region ========== comparison 연산 (WHERE용) ==========

/** 동등 comparison (=) - NULL-safe */
export interface ExprEq {
  type: "eq";
  source: Expr;
  target: Expr;
}

/** 초과 comparison (>) */
export interface ExprGt {
  type: "gt";
  source: Expr;
  target: Expr;
}

/** 미만 comparison (<) */
export interface ExprLt {
  type: "lt";
  source: Expr;
  target: Expr;
}

/** 이상 comparison (>=) */
export interface ExprGte {
  type: "gte";
  source: Expr;
  target: Expr;
}

/** 이하 comparison (<=) */
export interface ExprLte {
  type: "lte";
  source: Expr;
  target: Expr;
}

/** range comparison (BETWEEN from AND to) */
export interface ExprBetween {
  type: "between";
  source: Expr;
  from?: Expr;
  to?: Expr;
}

/** NULL 검사 (IS NULL) */
export interface ExprIsNull {
  type: "null";
  arg: Expr;
}

/** pattern 매칭 (LIKE) */
export interface ExprLike {
  type: "like";
  source: Expr;
  pattern: Expr;
}

/** regular expression 매칭 (REGEXP) */
export interface ExprRegexp {
  type: "regexp";
  source: Expr;
  pattern: Expr;
}

/** value 목록 include 검사 (IN) */
export interface ExprIn {
  type: "in";
  source: Expr;
  values: Expr[];
}

/** Subquery result include 검사 (IN subquery) */
export interface ExprInQuery {
  type: "inQuery";
  source: Expr;
  query: SelectQueryDef;
}

/** Subquery 존재 검사 (EXISTS) */
export interface ExprExists {
  type: "exists";
  query: SelectQueryDef;
}

//#endregion

//#region ========== logic 연산 ==========

/** logic 부정 (NOT) */
export interface ExprNot {
  type: "not";
  arg: WhereExpr;
}

/** logic 곱 (AND) */
export interface ExprAnd {
  type: "and";
  conditions: WhereExpr[];
}

/** logic 합 (OR) */
export interface ExprOr {
  type: "or";
  conditions: WhereExpr[];
}

//#endregion

//#region ========== String function ==========

/** 문자열 연결 (CONCAT) */
export interface ExprConcat {
  type: "concat";
  args: Expr[];
}

/** 왼쪽 N자 추출 (LEFT) */
export interface ExprLeft {
  type: "left";
  source: Expr;
  length: Expr;
}

/** 오른쪽 N자 추출 (RIGHT) */
export interface ExprRight {
  type: "right";
  source: Expr;
  length: Expr;
}

/** 좌우 공백 Remove (TRIM) */
export interface ExprTrim {
  type: "trim";
  arg: Expr;
}

/** 왼쪽 패딩 (LPAD) */
export interface ExprPadStart {
  type: "padStart";
  source: Expr;
  length: Expr;
  fillString: Expr;
}

/** 문자열 치환 (REPLACE) */
export interface ExprReplace {
  type: "replace";
  source: Expr;
  from: Expr;
  to: Expr;
}

/** 대문자 Transform (UPPER) */
export interface ExprUpper {
  type: "upper";
  arg: Expr;
}

/** 소문자 Transform (LOWER) */
export interface ExprLower {
  type: "lower";
  arg: Expr;
}

/** 문자 길이 (CHAR_LENGTH) */
export interface ExprLength {
  type: "length";
  arg: Expr;
}

/** 바이트 길이 (LENGTH/DATALENGTH) */
export interface ExprByteLength {
  type: "byteLength";
  arg: Expr;
}

/** 부분 문자열 (SUBSTRING) */
export interface ExprSubstring {
  type: "substring";
  source: Expr;
  start: Expr;
  length?: Expr;
}

/** 문자열 위치 (LOCATE/CHARINDEX/POSITION) */
export interface ExprIndexOf {
  type: "indexOf";
  source: Expr;
  search: Expr;
}

//#endregion

//#region ========== 숫자 function ==========

/** 절대값 (ABS) */
export interface ExprAbs {
  type: "abs";
  arg: Expr;
}

/** 반올림 (ROUND) */
export interface ExprRound {
  type: "round";
  arg: Expr;
  digits: number;
}

/** 올림 (CEIL) */
export interface ExprCeil {
  type: "ceil";
  arg: Expr;
}

/** 내림 (FLOOR) */
export interface ExprFloor {
  type: "floor";
  arg: Expr;
}

//#endregion

//#region ========== Date function ==========

/** 연도 추출 (YEAR) */
export interface ExprYear {
  type: "year";
  arg: Expr;
}

/** 월 추출 (MONTH) */
export interface ExprMonth {
  type: "month";
  arg: Expr;
}

/** 일 추출 (DAY) */
export interface ExprDay {
  type: "day";
  arg: Expr;
}

/** 시간 추출 (HOUR) */
export interface ExprHour {
  type: "hour";
  arg: Expr;
}

/** 분 추출 (MINUTE) */
export interface ExprMinute {
  type: "minute";
  arg: Expr;
}

/** 초 추출 (SECOND) */
export interface ExprSecond {
  type: "second";
  arg: Expr;
}

/** ISO 주차 (WEEK) */
export interface ExprIsoWeek {
  type: "isoWeek";
  arg: Expr;
}

/** ISO 주 시작일 */
export interface ExprIsoWeekStartDate {
  type: "isoWeekStartDate";
  arg: Expr;
}

/** ISO 연월 (YYYYMM 형식) */
export interface ExprIsoYearMonth {
  type: "isoYearMonth";
  arg: Expr;
}

/** 날짜 차이 (DATEDIFF) */
export interface ExprDateDiff {
  type: "dateDiff";
  separator: DateSeparator;
  from: Expr;
  to: Expr;
}

/** 날짜 연산 (DATEADD) */
export interface ExprDateAdd {
  type: "dateAdd";
  separator: DateSeparator;
  source: Expr;
  value: Expr;
}

/** 날짜 포맷 (FORMAT/DATE_FORMAT) */
export interface ExprFormatDate {
  type: "formatDate";
  source: Expr;
  format: string;
}

//#endregion

//#region ========== condition ==========

/** NULL 대체 (COALESCE - 첫 번째 non-null return) */
export interface ExprIfNull {
  type: "ifNull";
  args: Expr[];
}

/** 조건부 NULL (NULLIF - source === value 이면 NULL) */
export interface ExprNullIf {
  type: "nullIf";
  source: Expr;
  value: Expr;
}

/** 조건을 값으로 Transform (boolean → 0/1) */
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

//#region ========== aggregation ==========

/** 레코드 수 (COUNT) */
export interface ExprCount {
  type: "count";
  arg?: Expr;
  distinct?: boolean;
}

/** 합계 (SUM) */
export interface ExprSum {
  type: "sum";
  arg: Expr;
}

/** 평균 (AVG) */
export interface ExprAvg {
  type: "avg";
  arg: Expr;
}

/** 최대값 (MAX) */
export interface ExprMax {
  type: "max";
  arg: Expr;
}

/** 최소값 (MIN) */
export interface ExprMin {
  type: "min";
  arg: Expr;
}

//#endregion

//#region ========== 기타 ==========

/** 최대값 selection (GREATEST) */
export interface ExprGreatest {
  type: "greatest";
  args: Expr[];
}

/** 최소값 selection (LEAST) */
export interface ExprLeast {
  type: "least";
  args: Expr[];
}

/** row 번호 (ROW_NUMBER 단순 Version) */
export interface ExprRowNum {
  type: "rowNum";
}

/** 난수 (RAND/RANDOM) */
export interface ExprRandom {
  type: "random";
}

/** type Transform (CAST) */
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

/** LAG() - 이전 row value */
export interface WinFnLag {
  type: "lag";
  column: Expr;
  offset?: number;
  default?: Expr;
}

/** LEAD() - 다음 row value */
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

/** 윈도우 SUM */
export interface WinFnSum {
  type: "sum";
  column: Expr;
}

/** 윈도우 AVG */
export interface WinFnAvg {
  type: "avg";
  column: Expr;
}

/** 윈도우 COUNT */
export interface WinFnCount {
  type: "count";
  column?: Expr;
}

/** 윈도우 MIN */
export interface WinFnMin {
  type: "min";
  column: Expr;
}

/** 윈도우 MAX */
export interface WinFnMax {
  type: "max";
  column: Expr;
}

/**
 * Window function union type
 *
 * 순위, 탐색, aggregation Window function
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
 * 윈도우 스펙 (OVER 절)
 *
 * @property partitionBy - PARTITION BY expression 목록
 * @property orderBy - ORDER BY [컬럼, 방향] 목록
 */
export interface WinSpec {
  partitionBy?: Expr[];
  orderBy?: [Expr, ("ASC" | "DESC")?][];
}

/**
 * 윈도우 expression
 *
 * Window function + 윈도우 스펙 composition
 */
export interface ExprWindow {
  type: "window";
  fn: WinFn;
  spec: WinSpec;
}

//#endregion

//#region ========== 시스템 ==========

/** 스칼라 Subquery */
export interface ExprSubquery {
  type: "subquery";
  queryDef: SelectQueryDef;
}

//#endregion

//#region ========== Union Types ==========

/**
 * WHERE 절에 사용되는 expression (boolean return)
 *
 * comparison 연산 + logic 연산의 union type
 * where(), having() 등에서 사용
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
 * 모든 expression union type
 *
 * value, 문자열, 숫자, 날짜, condition, aggregation, 윈도우 등 모든 expression
 * select(), orderBy() 등에서 사용
 *
 * @see {@link WhereExpr} WHERE 절 전용 expression
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
  | ExprIfNull
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
