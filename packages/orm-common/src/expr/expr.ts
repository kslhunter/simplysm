import { ArgumentError, type DateOnly, type DateTime, type Time } from "@simplysm/core-common";
import {
  type ColumnPrimitive,
  type ColumnPrimitiveMap,
  type ColumnPrimitiveStr,
  type DataType,
  dataTypeStrToColumnPrimitiveStr,
  type InferColumnPrimitiveFromDataType,
  inferColumnPrimitiveStr,
} from "../types/column";
import type { ExprInput } from "./expr-unit";
import { ExprUnit, WhereExprUnit } from "./expr-unit";
import type { Expr, DateUnit, WhereExpr, WinSpec } from "../types/expr";
import type { SelectQueryDef } from "../types/query-def";
import type { Queryable } from "../exec/queryable";

// Window 함수 Spec 입력 (사용자 API용)
interface WinSpecInput {
  partitionBy?: ExprInput<ColumnPrimitive>[];
  orderBy?: [ExprInput<ColumnPrimitive>, ("ASC" | "DESC")?][];
}

/**
 * Switch expression builder 인터페이스
 */
export interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}

/**
 * Dialect 독립적 SQL expression builder
 *
 * SQL 문자열 대신 JSON AST(Expr)를 생성하며, QueryBuilder가
 * 각 DBMS(MySQL, MSSQL, PostgreSQL)로 변환
 *
 * @see {@link Queryable} Query builder 클래스
 * @see {@link ExprUnit} Expression 래퍼 클래스
 */
export const expr = {
  //#region ========== 값 생성 ==========

  /**
   * 리터럴 값을 ExprUnit으로 래핑
   *
   * dataType에 맞는 기본 타입으로 확장, 리터럴 타입 제거
   *
   * @param dataType - 값의 데이터 타입 ("string", "number", "boolean", "DateTime", "DateOnly", "Time", "Uuid", "Buffer")
   * @param value - 래핑할 값 (undefined 허용)
   * @returns 래핑된 ExprUnit 인스턴스
   */
  val<TStr extends ColumnPrimitiveStr, T extends ColumnPrimitiveMap[TStr] | undefined>(
    dataType: TStr,
    value: T,
  ): ExprUnit<
    T extends undefined ? ColumnPrimitiveMap[TStr] | undefined : ColumnPrimitiveMap[TStr]
  > {
    return new ExprUnit(dataType, { type: "value", value });
  },

  /**
   * Column 참조 생성
   *
   * 일반적으로 Queryable 콜백 내부에서 프록시 객체를 사용
   *
   * @param dataType - Column 데이터 타입
   * @param path - Column 경로 (테이블 별칭, column 이름 등)
   * @returns Column 참조 ExprUnit 인스턴스
   */
  col<TStr extends ColumnPrimitiveStr>(
    dataType: TStr,
    ...path: string[]
  ): ExprUnit<ColumnPrimitiveMap[TStr] | undefined> {
    return new ExprUnit(dataType, { type: "column", path });
  },

  /**
   * Raw SQL expression 생성 (이스케이프 해치)
   *
   * ORM에서 지원하지 않는 DB 전용 함수나 구문을 직접 사용해야 할 때 사용.
   * 태그드 템플릿 리터럴로 사용하며, 보간된 값은 자동으로 파라미터화됨
   *
   * @param dataType - 반환 값의 데이터 타입
   * @returns 태그드 템플릿 함수
   */
  raw<T extends ColumnPrimitiveStr>(
    dataType: T,
  ): (
    strings: TemplateStringsArray,
    ...values: ExprInput<ColumnPrimitive>[]
  ) => ExprUnit<ColumnPrimitiveMap[T] | undefined> {
    return (strings, ...values) => {
      const sql = strings.reduce((acc, str, i) => {
        if (i < values.length) {
          return acc + str + `$${i + 1}`; // 플레이스홀더 (ExprRenderer에서 변환)
        }
        return acc + str;
      }, "");

      const params = values.map((v) => toExpr(v));

      return new ExprUnit(dataType, { type: "raw", sql, params });
    };
  },

  //#endregion

  //#region ========== WHERE - Comparison operators ==========

  /**
   * 동등 비교 (NULL 안전)
   *
   * NULL 값도 안전하게 비교 (MySQL: `<=>`, MSSQL/PostgreSQL: `IS NULL OR =`)
   *
   * @param source - 비교할 column 또는 expression
   * @param target - 비교 대상 값 또는 expression
   * @returns WHERE 조건 expression
   */
  eq<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "eq",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 초과 비교 (>)
   *
   * @param source - 비교할 column 또는 expression
   * @param target - 비교 대상 값 또는 expression
   * @returns WHERE 조건 expression
   */
  gt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "gt",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 미만 비교 (<)
   *
   * @param source - 비교할 column 또는 expression
   * @param target - 비교 대상 값 또는 expression
   * @returns WHERE 조건 expression
   */
  lt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "lt",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 이상 비교 (>=)
   *
   * @param source - 비교할 column 또는 expression
   * @param target - 비교 대상 값 또는 expression
   * @returns WHERE 조건 expression
   */
  gte<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "gte",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 이하 비교 (<=)
   *
   * @param source - 비교할 column 또는 expression
   * @param target - 비교 대상 값 또는 expression
   * @returns WHERE 조건 expression
   */
  lte<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "lte",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * range comparison (BETWEEN)
   *
   * from/to가 undefined이면 해당 방향은 제한 없음
   *
   * @param source - 비교할 column 또는 expression
   * @param from - 시작 값 (undefined이면 하한 없음)
   * @param to - 끝 값 (undefined이면 상한 없음)
   * @returns WHERE 조건 expression
   */
  between<T extends ColumnPrimitive>(
    source: ExprUnit<T>,
    from?: ExprInput<T>,
    to?: ExprInput<T>,
  ): WhereExprUnit {
    return new WhereExprUnit({
      type: "between",
      source: toExpr(source),
      from: from != null ? toExpr(from) : undefined,
      to: to != null ? toExpr(to) : undefined,
    });
  },

  //#endregion

  //#region ========== WHERE - NULL check ==========

  /**
   * NULL check (IS NULL)
   *
   * @param source - Column or expression to check
   * @returns WHERE condition expression
   */
  null<T extends ColumnPrimitive>(source: ExprUnit<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "null",
      arg: toExpr(source),
    });
  },

  //#endregion

  //#region ========== WHERE - String search ==========

  /**
   * LIKE pattern matching
   *
   * `%` matches zero or more characters, `_` matches a single character.
   * 특수 문자는 `\`로 이스케이프됨
   *
   * @param source - Column or expression to search
   * @param pattern - Search pattern (%, _ wildcards available)
   * @returns WHERE condition expression
   */
  like(
    source: ExprUnit<string | undefined>,
    pattern: ExprInput<string | undefined>,
  ): WhereExprUnit {
    return new WhereExprUnit({
      type: "like",
      source: toExpr(source),
      pattern: toExpr(pattern),
    });
  },

  /**
   * 정규식 패턴 매칭
   *
   * 참고: 정규식 구문은 DBMS 구현에 따라 다를 수 있음
   *
   * @param source - Column or expression to search
   * @param pattern - Regular expression pattern
   * @returns WHERE condition expression
   */
  regexp(
    source: ExprUnit<string | undefined>,
    pattern: ExprInput<string | undefined>,
  ): WhereExprUnit {
    return new WhereExprUnit({
      type: "regexp",
      source: toExpr(source),
      pattern: toExpr(pattern),
    });
  },

  //#endregion

  //#region ========== WHERE - IN ==========

  /**
   * IN operator - Compare against a list of values
   *
   * @param source - Column or expression to compare
   * @param values - List of values to compare against
   * @returns WHERE condition expression
   */
  in<T extends ColumnPrimitive>(source: ExprUnit<T>, values: ExprInput<T>[]): WhereExprUnit {
    return new WhereExprUnit({
      type: "in",
      source: toExpr(source),
      values: values.map((v) => toExpr(v)),
    });
  },

  /**
   * IN (SELECT ...) - Compare against subquery results
   *
   * 서브쿼리는 단일 column만 SELECT해야 함
   *
   * @param source - Column or expression to compare
   * @param query - Queryable that returns a single column
   * @returns WHERE condition expression
   * @throws {Error} When the subquery does not return a single column
   */
  inQuery<T extends ColumnPrimitive, TData extends Record<string, T>>(
    source: ExprUnit<T>,
    query: Queryable<TData, any>,
  ): WhereExprUnit {
    const queryDef = query.getSelectQueryDef();
    if (queryDef.select == null || Object.keys(queryDef.select).length !== 1) {
      throw new Error("inQuery 서브쿼리는 단일 column만 SELECT해야 합니다.");
    }
    return new WhereExprUnit({
      type: "inQuery",
      source: toExpr(source),
      query: queryDef,
    });
  },

  /**
   * EXISTS (SELECT ...) - Check if subquery returns any rows
   *
   * 서브쿼리가 하나 이상의 행을 반환하면 true 반환
   *
   * @param query - Queryable to check for existence
   * @returns WHERE condition expression
   */
  exists(query: Queryable<any, any>): WhereExprUnit {
    const { select: _, ...queryDefWithoutSelect } = query.getSelectQueryDef(); // EXISTS는 SELECT 절이 불필요, 패킷 크기 절약
    return new WhereExprUnit({
      type: "exists",
      query: queryDefWithoutSelect,
    });
  },

  //#endregion

  //#region ========== WHERE - Logical operators ==========

  /**
   * NOT operator - Negate a condition
   *
   * @param arg - Condition to negate
   * @returns Negated WHERE condition expression
   */
  not(arg: WhereExprUnit): WhereExprUnit {
    return new WhereExprUnit({
      type: "not",
      arg: arg.expr,
    });
  },

  /**
   * AND operator - All conditions must be satisfied
   *
   * 여러 조건을 AND로 결합. where()에 배열을 전달하면 자동으로 AND 적용
   *
   * @param conditions - List of conditions to combine with AND
   * @returns Combined WHERE condition expression
   */
  and(conditions: WhereExprUnit[]): WhereExprUnit {
    if (conditions.length === 0) {
      throw new ArgumentError({ conditions: "empty arrays are not allowed" });
    }
    return new WhereExprUnit({
      type: "and",
      conditions: conditions.map((c) => c.expr),
    });
  },

  /**
   * OR operator - At least one condition must be satisfied
   *
   * @param conditions - List of conditions to combine with OR
   * @returns Combined WHERE condition expression
   */
  or(conditions: WhereExprUnit[]): WhereExprUnit {
    if (conditions.length === 0) {
      throw new ArgumentError({ conditions: "empty arrays are not allowed" });
    }
    return new WhereExprUnit({
      type: "or",
      conditions: conditions.map((c) => c.expr),
    });
  },

  //#endregion

  //#region ========== SELECT - String ==========

  /**
   * 문자열 연결 (CONCAT)
   *
   * NULL 값은 빈 문자열로 처리 (DBMS별 자동 변환)
   *
   * @param args - Strings to concatenate
   * @returns Concatenated string expression
   */
  concat(...args: ExprInput<string | undefined>[]): ExprUnit<string> {
    return new ExprUnit("string", {
      type: "concat",
      args: args.map((arg) => toExpr(arg)),
    });
  },

  /**
   * 문자열 왼쪽에서 지정 길이만큼 추출 (LEFT)
   *
   * @param source - Original string
   * @param length - Number of characters to extract
   * @returns Extracted string expression
   */
  left<T extends string | undefined>(source: ExprUnit<T>, length: ExprInput<number>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "left",
      source: toExpr(source),
      length: toExpr(length),
    });
  },

  /**
   * 문자열 오른쪽에서 지정 길이만큼 추출 (RIGHT)
   *
   * @param source - Original string
   * @param length - Number of characters to extract
   * @returns Extracted string expression
   */
  right<T extends string | undefined>(source: ExprUnit<T>, length: ExprInput<number>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "right",
      source: toExpr(source),
      length: toExpr(length),
    });
  },

  /**
   * 문자열 양쪽 공백 제거 (TRIM)
   *
   * @param source - Original string
   * @returns String expression with whitespace removed
   */
  trim<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "trim",
      arg: toExpr(source),
    });
  },

  /**
   * 왼쪽 패딩 (LPAD)
   *
   * 대상 길이에 도달할 때까지 왼쪽에 fillString을 반복 추가
   *
   * @param source - Original string
   * @param length - Target length
   * @param fillString - String to use for padding
   * @returns Padded string expression
   */
  padStart<T extends string | undefined>(
    source: ExprUnit<T>,
    length: ExprInput<number>,
    fillString: ExprInput<string>,
  ): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "padStart",
      source: toExpr(source),
      length: toExpr(length),
      fillString: toExpr(fillString),
    });
  },

  /**
   * 문자열 치환 (REPLACE)
   *
   * @param source - Original string
   * @param from - String to find
   * @param to - Replacement string
   * @returns Replaced string expression
   */
  replace<T extends string | undefined>(
    source: ExprUnit<T>,
    from: ExprInput<string>,
    to: ExprInput<string>,
  ): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "replace",
      source: toExpr(source),
      from: toExpr(from),
      to: toExpr(to),
    });
  },

  /**
   * 문자열 대문자 변환 (UPPER)
   *
   * @param source - Original string
   * @returns Uppercase string expression
   */
  upper<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "upper",
      arg: toExpr(source),
    });
  },

  /**
   * 문자열 소문자 변환 (LOWER)
   *
   * @param source - Original string
   * @returns Lowercase string expression
   */
  lower<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "lower",
      arg: toExpr(source),
    });
  },

  /**
   * 문자열 길이 (문자 수)
   *
   * @param source - Original string
   * @returns Character count
   */
  length(source: ExprUnit<string | undefined>): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "length",
      arg: toExpr(source),
    });
  },

  /**
   * 문자열 바이트 길이
   *
   * UTF-8에서 CJK 문자는 각 3바이트
   *
   * @param source - Original string
   * @returns Byte count
   */
  byteLength(source: ExprUnit<string | undefined>): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "byteLength",
      arg: toExpr(source),
    });
  },

  /**
   * 문자열 부분 추출 (SUBSTRING)
   *
   * SQL 표준에 따라 1부터 시작하는 인덱스 사용
   *
   * @param source - Original string
   * @param start - Start position (starting from 1)
   * @param length - Length to extract (to the end if omitted)
   * @returns Extracted string expression
   */
  substring<T extends string | undefined>(
    source: ExprUnit<T>,
    start: ExprInput<number>,
    length?: ExprInput<number>,
  ): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "substring",
      source: toExpr(source),
      start: toExpr(start),
      ...(length != null ? { length: toExpr(length) } : {}),
    });
  },

  /**
   * 문자열 내 위치 찾기 (LOCATE/CHARINDEX)
   *
   * 0부터 시작하는 인덱스 반환, 찾지 못하면 -1 반환. source가 NULL이면 undefined.
   *
   * @param source - String to search in
   * @param search - String to find
   * @returns Position (0-based, -1 if not found; undefined if source is NULL)
   */
  indexOf<T extends string | undefined>(
    source: ExprUnit<T>,
    search: ExprInput<string>,
  ): ExprUnit<T extends undefined ? number | undefined : number> {
    return new ExprUnit("number", {
      type: "indexOf",
      source: toExpr(source),
      search: toExpr(search),
    });
  },

  //#endregion

  //#region ========== SELECT - Number ==========

  /**
   * 절대값 (ABS)
   *
   * @param source - Original number
   * @returns Absolute value expression
   */
  abs<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("number", {
      type: "abs",
      arg: toExpr(source),
    });
  },

  /**
   * 반올림 (ROUND)
   *
   * @param source - Original number
   * @param digits - Number of decimal places
   * @returns Rounded number expression
   */
  round<T extends number | undefined>(source: ExprUnit<T>, digits: number): ExprUnit<T> {
    return new ExprUnit("number", {
      type: "round",
      arg: toExpr(source),
      digits,
    });
  },

  /**
   * 올림 (CEILING)
   *
   * @param source - Original number
   * @returns Ceiling number expression
   */
  ceil<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("number", {
      type: "ceil",
      arg: toExpr(source),
    });
  },

  /**
   * 내림 (FLOOR)
   *
   * @param source - Original number
   * @returns Floor number expression
   */
  floor<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("number", {
      type: "floor",
      arg: toExpr(source),
    });
  },

  //#endregion

  //#region ========== SELECT - Date ==========

  /**
   * 연도 추출 (YEAR)
   *
   * @param source - DateTime or DateOnly expression
   * @returns Year (4-digit number)
   */
  year<T extends DateTime | DateOnly | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "year",
      arg: toExpr(source),
    });
  },

  /**
   * 월 추출 (MONTH)
   *
   * @param source - DateTime or DateOnly expression
   * @returns Month (1~12)
   */
  month<T extends DateTime | DateOnly | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "month",
      arg: toExpr(source),
    });
  },

  /**
   * 일 추출 (DAY)
   *
   * @param source - DateTime or DateOnly expression
   * @returns Day (1~31)
   */
  day<T extends DateTime | DateOnly | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "day",
      arg: toExpr(source),
    });
  },

  /**
   * 시 추출 (HOUR)
   *
   * @param source - DateTime or Time expression
   * @returns Hour (0~23)
   */
  hour<T extends DateTime | Time | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "hour",
      arg: toExpr(source),
    });
  },

  /**
   * 분 추출 (MINUTE)
   *
   * @param source - DateTime or Time expression
   * @returns Minute (0~59)
   */
  minute<T extends DateTime | Time | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "minute",
      arg: toExpr(source),
    });
  },

  /**
   * 초 추출 (SECOND)
   *
   * @param source - DateTime or Time expression
   * @returns Second (0~59)
   */
  second<T extends DateTime | Time | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "second",
      arg: toExpr(source),
    });
  },

  /**
   * ISO 주 번호 추출
   *
   * ISO 8601 week number (starts Monday, 1~53)
   *
   * @param source - DateOnly expression
   * @returns ISO week number
   */
  isoWeek<T extends DateOnly | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "isoWeek",
      arg: toExpr(source),
    });
  },

  /**
   * ISO week start date (Monday)
   *
   * 주어진 날짜가 속한 주의 월요일 반환
   *
   * @param source - DateOnly expression
   * @returns Week start date (Monday)
   */
  isoWeekStartDate<T extends DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("DateOnly", {
      type: "isoWeekStartDate",
      arg: toExpr(source),
    });
  },

  /**
   * ISO year-month (YYYYMM)
   *
   * 주어진 날짜의 연월을 "YYYYMM" 문자열로 반환
   *
   * @param source - DateOnly expression
   * @returns Year-month string (YYYYMM)
   */
  isoYearMonth<T extends DateOnly | undefined>(
    source: ExprUnit<T>,
  ): ExprUnit<T extends undefined ? undefined : string> {
    return new ExprUnit("string", {
      type: "isoYearMonth",
      arg: toExpr(source),
    });
  },

  /**
   * 날짜 차이 계산 (DATEDIFF)
   *
   * @param unit - Unit ("year", "month", "day", "hour", "minute", "second")
   * @param from - Start date
   * @param to - End date
   * @returns Difference value (to - from)
   */
  dateDiff<T extends DateTime | DateOnly | Time | undefined>(
    unit: DateUnit,
    from: ExprInput<T>,
    to: ExprInput<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "dateDiff",
      unit,
      from: toExpr(from),
      to: toExpr(to),
    });
  },

  /**
   * 날짜 더하기 (DATEADD)
   *
   * @param unit - Unit ("year", "month", "day", "hour", "minute", "second")
   * @param source - Original date
   * @param value - Value to add (negative allowed)
   * @returns Calculated date
   */
  dateAdd<T extends DateTime | DateOnly | Time | undefined>(
    unit: DateUnit,
    source: ExprUnit<T>,
    value: ExprInput<number>,
  ): ExprUnit<T> {
    return new ExprUnit(source.dataType, {
      type: "dateAdd",
      unit,
      source: toExpr(source),
      value: toExpr(value),
    });
  },

  /**
   * 날짜 포맷 (DATE_FORMAT)
   *
   * 포맷 문자열 규칙은 DBMS 구현에 따라 다를 수 있음
   *
   * @param source - Date expression
   * @param format - Format string (e.g., "%Y-%m-%d")
   * @returns Formatted string expression
   */
  formatDate<T extends DateTime | DateOnly | Time | undefined>(
    source: ExprUnit<T>,
    format: string,
  ): ExprUnit<T extends undefined ? undefined : string> {
    return new ExprUnit("string", {
      type: "formatDate",
      source: toExpr(source),
      format,
    });
  },

  //#endregion

  //#region ========== SELECT - Condition ==========

  /**
   * NULL replacement (COALESCE/IFNULL)
   *
   * 첫 번째 non-null 값 반환. 마지막 인수가 non-nullable이면 결과도 non-nullable
   *
   * @param args - Values to inspect (last is default value)
   * @returns First non-null value
   */
  coalesce,

  /**
   * 값이 일치하면 NULL 반환 (NULLIF)
   *
   * source === value이면 NULL 반환, 아니면 source 반환
   *
   * @param source - Original value
   * @param value - Value to compare
   * @returns NULL or original value
   */
  nullIf<T extends ColumnPrimitive>(
    source: ExprUnit<T>,
    value: ExprInput<T>,
  ): ExprUnit<T | undefined> {
    return new ExprUnit(source.dataType, {
      type: "nullIf",
      source: toExpr(source),
      value: toExpr(value),
    });
  },

  /**
   * WHERE expression을 boolean으로 변환
   *
   * 조건 결과를 SELECT 절에서 boolean column으로 사용할 때 사용
   *
   * @param condition - Condition to transform
   * @returns boolean expression
   */
  is(condition: WhereExprUnit): ExprUnit<boolean> {
    return new ExprUnit("boolean", {
      type: "is",
      condition: condition.expr,
    });
  },

  /**
   * CASE WHEN expression builder
   *
   * 메서드 체이닝으로 조건 분기 구성
   *
   * 타입 인자 생략 시 case/default 값 타입이 강제되지 않음.
   * 분기 값 타입의 동질성을 컴파일 시점에 강제하려면 `expr.switch<T>()` 로 T 를 명시.
   *
   * @returns SwitchExprBuilder instance
   */
  switch<T extends ColumnPrimitive>(): SwitchExprBuilder<T> {
    return createSwitchBuilder<T>();
  },

  /**
   * 단순 IF 조건 (삼항 연산자)
   *
   * @param condition - Condition
   * @param then - Value when condition is true
   * @param else_ - Value when condition is false
   * @returns Conditional value expression
   */
  if<T extends ColumnPrimitive>(
    condition: WhereExprUnit,
    then: ExprInput<T>,
    else_: ExprInput<T>,
  ): ExprUnit<T> {
    const allValues = [then, else_];
    // 1. Find dataType from ExprUnit
    const exprUnit = allValues.find((v): v is ExprUnit<T> => v instanceof ExprUnit);
    if (exprUnit) {
      return new ExprUnit(exprUnit.dataType, {
        type: "if",
        condition: condition.expr,
        then: toExpr(then),
        else: toExpr(else_),
      });
    }

    // 2. Infer from non-null literal
    const nonNullLiteral = allValues.find((v) => v != null) as ColumnPrimitive;
    if (nonNullLiteral == null) {
      throw new Error("At least one of if's then/else must be non-null.");
    }

    return new ExprUnit(inferColumnPrimitiveStr(nonNullLiteral), {
      type: "if",
      condition: condition.expr,
      then: toExpr(then),
      else: toExpr(else_),
    });
  },

  //#endregion

  //#region ========== SELECT - Aggregate ==========
  // SUM, AVG, MAX 등 집계는 모든 값이 NULL이거나 행이 없을 때만 NULL 반환 (NULL 값을 가진 행은 무시됨)

  /**
   * 행 수 세기 (COUNT)
   *
   * @param arg - Column to count (all rows if omitted)
   * @param distinct - If true, remove duplicates
   * @returns Row count
   */
  count(arg?: ExprUnit<ColumnPrimitive>, distinct?: boolean): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "count",
      arg: arg != null ? toExpr(arg) : undefined,
      distinct,
    });
  },

  /**
   * 합계 (SUM)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Number column to sum
   * @returns Sum (or NULL)
   */
  sum(arg: ExprUnit<number | undefined>): ExprUnit<number | undefined> {
    return new ExprUnit("number", {
      type: "sum",
      arg: toExpr(arg),
    });
  },

  /**
   * 평균 (AVG)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Number column to average
   * @returns Average (or NULL)
   */
  avg(arg: ExprUnit<number | undefined>): ExprUnit<number | undefined> {
    return new ExprUnit("number", {
      type: "avg",
      arg: toExpr(arg),
    });
  },

  /**
   * 최대값 (MAX)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Column to find maximum of
   * @returns Maximum value (or NULL)
   */
  max<T extends ColumnPrimitive>(arg: ExprUnit<T>): ExprUnit<T | undefined> {
    return new ExprUnit(arg.dataType, {
      type: "max",
      arg: toExpr(arg),
    });
  },

  /**
   * 최소값 (MIN)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Column to find minimum of
   * @returns Minimum value (or NULL)
   */
  min<T extends ColumnPrimitive>(arg: ExprUnit<T>): ExprUnit<T | undefined> {
    return new ExprUnit(arg.dataType, {
      type: "min",
      arg: toExpr(arg),
    });
  },

  //#endregion

  //#region ========== SELECT - Other ==========

  /**
   * 여러 값 중 최대값 선택 (GREATEST)
   *
   * @param args - Values to compare
   * @returns Greatest value
   */
  greatest<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T> {
    return new ExprUnit(findDataType(args), {
      type: "greatest",
      args: args.map((a) => toExpr(a)),
    });
  },

  /**
   * 여러 값 중 최소값 선택 (LEAST)
   *
   * @param args - Values to compare
   * @returns Least value
   */
  least<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T> {
    return new ExprUnit(findDataType(args), {
      type: "least",
      args: args.map((a) => toExpr(a)),
    });
  },

  /**
   * 행 번호 (ROW_NUMBER 없이 모든 행에 순번 부여)
   *
   * @returns Row number (starting from 1)
   */
  rowNum(): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "rowNum",
    });
  },

  /**
   * 난수 생성 (RAND/RANDOM)
   *
   * 0과 1 사이의 난수 반환. 주로 ORDER BY에서 무작위 정렬에 사용
   *
   * @returns Random number between 0 and 1
   */
  random(): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "random",
    });
  },

  /**
   * type transformation (CAST)
   *
   * @param source - Expression to transform
   * @param targetType - Target data type
   * @returns Transformed expression
   */
  cast<T extends ColumnPrimitive, TDataType extends DataType>(
    source: ExprUnit<T>,
    targetType: TDataType,
  ): ExprUnit<T extends undefined ? undefined : InferColumnPrimitiveFromDataType<TDataType>> {
    return new ExprUnit(dataTypeStrToColumnPrimitiveStr[targetType.type], {
      type: "cast",
      source: toExpr(source),
      targetType,
    });
  },

  /**
   * 스칼라 Subquery - SELECT 절에서 단일 값을 반환하는 서브쿼리
   *
   * 서브쿼리는 정확히 하나의 행과 하나의 column을 반환해야 함
   *
   * @param dataType - Data type of the returned value
   * @param queryable - Queryable that returns a scalar value
   * @returns Subquery result expression
   */
  subquery<TStr extends ColumnPrimitiveStr>(
    dataType: TStr,
    queryable: { getSelectQueryDef(): SelectQueryDef },
  ): ExprUnit<ColumnPrimitiveMap[TStr] | undefined> {
    return new ExprUnit(dataType, {
      type: "subquery",
      queryDef: queryable.getSelectQueryDef(),
    });
  },

  //#endregion

  //#region ========== SELECT - Window Functions ==========

  /**
   * ROW_NUMBER() - Row number within a partition
   *
   * 각 파티션 내에서 1부터 시작하는 순번 부여
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Row number (starting from 1)
   */
  rowNumber(spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "rowNumber" },
      spec: toWinSpec(spec),
    });
  },

  /**
   * RANK() - Rank within a partition (ties get same rank, next rank is skipped)
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Rank (skips after ties: 1, 1, 3)
   */
  rank(spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "rank" },
      spec: toWinSpec(spec),
    });
  },

  /**
   * DENSE_RANK() - Dense rank within a partition (ties get same rank, next rank is consecutive)
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Dense rank (consecutive after ties: 1, 1, 2)
   */
  denseRank(spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "denseRank" },
      spec: toWinSpec(spec),
    });
  },

  /**
   * NTILE(n) - Split partition into n groups
   *
   * @param n - Number of groups to split into
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Group number (1 ~ n)
   */
  ntile(n: number, spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "ntile", n },
      spec: toWinSpec(spec),
    });
  },

  /**
   * LAG() - Reference value from a previous row
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @param options - offset (default 1), default (default value when no previous row)
   * @returns Previous row's value (or default value/NULL)
   */
  lag<T extends ColumnPrimitive>(
    column: ExprUnit<T>,
    spec: WinSpecInput,
    options?: { offset?: number; default?: ExprInput<T> },
  ): ExprUnit<T | undefined> {
    return new ExprUnit(column.dataType, {
      type: "window",
      fn: {
        type: "lag",
        column: toExpr(column),
        offset: options?.offset,
        default: options?.default != null ? toExpr(options.default) : undefined,
      },
      spec: toWinSpec(spec),
    });
  },

  /**
   * LEAD() - Reference value from a following row
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @param options - offset (default 1), default (default value when no following row)
   * @returns Following row's value (or default value/NULL)
   */
  lead<T extends ColumnPrimitive>(
    column: ExprUnit<T>,
    spec: WinSpecInput,
    options?: { offset?: number; default?: ExprInput<T> },
  ): ExprUnit<T | undefined> {
    return new ExprUnit(column.dataType, {
      type: "window",
      fn: {
        type: "lead",
        column: toExpr(column),
        offset: options?.offset,
        default: options?.default != null ? toExpr(options.default) : undefined,
      },
      spec: toWinSpec(spec),
    });
  },

  /**
   * FIRST_VALUE() - First value in the partition/frame
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns First value
   */
  firstValue<T extends ColumnPrimitive>(
    column: ExprUnit<T>,
    spec: WinSpecInput,
  ): ExprUnit<T | undefined> {
    return new ExprUnit(column.dataType, {
      type: "window",
      fn: { type: "firstValue", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  /**
   * LAST_VALUE() - Last value in the partition/frame
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Last value
   */
  lastValue<T extends ColumnPrimitive>(
    column: ExprUnit<T>,
    spec: WinSpecInput,
  ): ExprUnit<T | undefined> {
    return new ExprUnit(column.dataType, {
      type: "window",
      fn: { type: "lastValue", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  /**
   * SUM() OVER - Window sum
   *
   * @param column - Column to sum
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Sum within window
   */
  sumOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "sum", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  /**
   * AVG() OVER - Window average
   *
   * @param column - Column to average
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Average within window
   */
  avgOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "avg", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  /**
   * COUNT() OVER - Window count
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @param column - Column to count (all rows if omitted)
   * @returns Row count within window
   */
  countOver(spec: WinSpecInput, column?: ExprUnit<ColumnPrimitive>): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "count", column: column != null ? toExpr(column) : undefined },
      spec: toWinSpec(spec),
    });
  },

  /**
   * MIN() OVER - Window minimum
   *
   * @param column - Column to find minimum of
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Minimum value within window
   */
  minOver<T extends ColumnPrimitive>(
    column: ExprUnit<T>,
    spec: WinSpecInput,
  ): ExprUnit<T | undefined> {
    return new ExprUnit(column.dataType, {
      type: "window",
      fn: { type: "min", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  /**
   * MAX() OVER - Window maximum
   *
   * @param column - Column to find maximum of
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Maximum value within window
   */
  maxOver<T extends ColumnPrimitive>(
    column: ExprUnit<T>,
    spec: WinSpecInput,
  ): ExprUnit<T | undefined> {
    return new ExprUnit(column.dataType, {
      type: "window",
      fn: { type: "max", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  //#endregion

  //#region ========== Helper ==========

  /**
   * ExprInput을 Expr로 변환 (내부 사용)
   *
   * @param value - Value to transform
   * @returns Expr JSON AST
   */
  toExpr(value: ExprInput<ColumnPrimitive>): Expr {
    return toExpr(value);
  },

  //#endregion
};

//#region ========== Internal Helpers ==========

// 여러 값 중 첫 번째 non-null 값 반환 (COALESCE)
function coalesce<TPrimitive extends ColumnPrimitive>(
  ...args: [
    ExprInput<TPrimitive | undefined>,
    ...ExprInput<TPrimitive | undefined>[],
    ExprInput<NonNullable<TPrimitive>>,
  ]
): ExprUnit<NonNullable<TPrimitive>>;
function coalesce<TPrimitive extends ColumnPrimitive>(
  ...args: ExprInput<TPrimitive>[]
): ExprUnit<TPrimitive>;
function coalesce<TPrimitive extends ColumnPrimitive>(
  ...args: ExprInput<TPrimitive>[]
): ExprUnit<TPrimitive> {
  return new ExprUnit(findDataType(args), {
    type: "coalesce",
    args: args.map((a) => toExpr(a)),
  });
}

function createSwitchBuilder<TPrimitive extends ColumnPrimitive>(): SwitchExprBuilder<TPrimitive> {
  const cases: { when: WhereExpr; then: Expr }[] = [];
  const thenValues: ExprInput<TPrimitive>[] = []; // then 값 저장

  return {
    case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): typeof this {
      cases.push({
        when: condition.expr,
        then: toExpr(then),
      });
      thenValues.push(then);
      return this;
    },
    default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive> {
      const allValues = [...thenValues, value];
      // 1. ExprUnit에서 dataType 찾기
      const exprUnit = allValues.find((v): v is ExprUnit<TPrimitive> => v instanceof ExprUnit);
      if (exprUnit) {
        return new ExprUnit(exprUnit.dataType, {
          type: "switch",
          cases,
          else: toExpr(value),
        });
      }

      // 2. non-null 리터럴에서 추론
      const nonNullLiteral = allValues.find((v) => v != null) as ColumnPrimitive;
      if (nonNullLiteral == null) {
        throw new Error("At least one of switch's case/default must be non-null.");
      }

      return new ExprUnit(inferColumnPrimitiveStr(nonNullLiteral), {
        type: "switch",
        cases,
        else: toExpr(value),
      });
    },
  };
}

export function toExpr(value: ExprInput<ColumnPrimitive>): Expr {
  if (value instanceof ExprUnit) {
    return value.expr;
  }
  return { type: "value", value };
}

function findDataType<TPrimitive extends ColumnPrimitive>(
  args: ExprInput<TPrimitive>[],
): ColumnPrimitiveStr {
  const exprUnit = args.find((a): a is ExprUnit<TPrimitive> => a instanceof ExprUnit);
  if (!exprUnit) {
    throw new Error("At least one of the arguments must be an ExprUnit.");
  }
  return exprUnit.dataType;
}

function toWinSpec(spec: WinSpecInput): WinSpec {
  const result: WinSpec = {};
  if (spec.partitionBy != null) {
    result.partitionBy = spec.partitionBy.map((e) => toExpr(e));
  }
  if (spec.orderBy != null) {
    result.orderBy = spec.orderBy.map(([e, dir]) => [toExpr(e), dir]);
  }
  return result;
}

//#endregion
