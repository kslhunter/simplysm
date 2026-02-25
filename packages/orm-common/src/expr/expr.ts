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
import type { Expr, DateSeparator, WhereExpr, WinSpec } from "../types/expr";
import type { SelectQueryDef } from "../types/query-def";
import type { Queryable } from "../exec/queryable";

// Window Function Spec Input (for user API)
interface WinSpecInput {
  partitionBy?: ExprInput<ColumnPrimitive>[];
  orderBy?: [ExprInput<ColumnPrimitive>, ("ASC" | "DESC")?][];
}

/**
 * Switch expression builder interface
 */
export interface SwitchExprBuilder<TPrimitive extends ColumnPrimitive> {
  case(condition: WhereExprUnit, then: ExprInput<TPrimitive>): SwitchExprBuilder<TPrimitive>;
  default(value: ExprInput<TPrimitive>): ExprUnit<TPrimitive>;
}

/**
 * Dialect-independent SQL expression builder
 *
 * Generates JSON AST (Expr) instead of SQL strings, which QueryBuilder
 * converts to each DBMS (MySQL, MSSQL, PostgreSQL)
 *
 * @example
 * ```typescript
 * // WHERE condition
 * db.user().where((u) => [
 *   expr.eq(u.status, "active"),
 *   expr.gt(u.age, 18),
 * ])
 *
 * // SELECT expression
 * db.user().select((u) => ({
 *   name: expr.concat(u.firstName, " ", u.lastName),
 *   age: expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today())),
 * }))
 *
 * // Aggregate function
 * db.order().groupBy((o) => o.userId).select((o) => ({
 *   userId: o.userId,
 *   total: expr.sum(o.amount),
 * }))
 * ```
 *
 * @see {@link Queryable} Query builder class
 * @see {@link ExprUnit} Expression wrapper class
 */
export const expr = {
  //#region ========== Value creation ==========

  /**
   * 리터럴 값을 ExprUnit으로 래핑
   *
   * dataType에 맞는 base 타입으로 widening하여 리터럴 type Remove
   *
   * @param dataType - Value의 data type ("string", "number", "boolean", "DateTime", "DateOnly", "Time", "Uuid", "Buffer")
   * @param value - 래핑할 value (undefined allow)
   * @returns 래핑된 ExprUnit instance
   *
   * @example
   * ```typescript
   * // 문자열 value
   * expr.val("string", "active")
   *
   * // 숫자 value
   * expr.val("number", 100)
   *
   * // 날짜 value
   * expr.val("DateOnly", DateOnly.today())
   *
   * // undefined value
   * expr.val("string", undefined)
   * ```
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
   * 컬럼 참조를 Generate
   *
   * Typically proxy objects are used inside Queryable callbacks
   *
   * @param dataType - Column의 data type
   * @param path - Column 경로 (table alias, 컬럼명 등)
   * @returns 컬럼 참조 ExprUnit instance
   *
   * @example
   * ```typescript
   * // 직접 컬럼 참조 (내부용)
   * expr.col("string", "T1", "name")
   * ```
   */
  col<TStr extends ColumnPrimitiveStr>(
    dataType: ColumnPrimitiveStr,
    ...path: string[]
  ): ExprUnit<ColumnPrimitiveMap[TStr] | undefined> {
    return new ExprUnit(dataType, { type: "column", path });
  },

  /**
   * Raw SQL expression Generate (escape hatch)
   *
   * ORM에서 지원하지 않는 DB별 함수나 문법을 직접 사용할 때 사용.
   * tagged template literal 형식으로 사용하며, interpolated value은 automatic으로 parameterized됨
   *
   * @param dataType - 반환될 값의 data type
   * @returns 태그 템플릿 function
   *
   * @example
   * ```typescript
   * // MySQL JSON function 사용
   * db.user().select((u) => ({
   *   name: u.name,
   *   data: expr.raw("string")`JSON_EXTRACT(${u.metadata}, '$.email')`,
   * }))
   *
   * // PostgreSQL array function
   * expr.raw("number")`ARRAY_LENGTH(${u.tags}, 1)`
   * ```
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
          return acc + str + `$${i + 1}`; // placeholder (ExprRenderer에서 Transform)
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
   * 동등 comparison (NULL-safe)
   *
   * NULL 값도 안전하게 comparison (MySQL: `<=>`, MSSQL/PostgreSQL: `IS NULL OR =`)
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param target - comparison 대상 value 또는 expression
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.eq(u.status, "active")])
   * // WHERE status <=> 'active' (MySQL)
   * ```
   */
  eq<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "eq",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 초과 comparison (>)
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param target - comparison 대상 value 또는 expression
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.gt(u.age, 18)])
   * // WHERE age > 18
   * ```
   */
  gt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "gt",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 미만 comparison (<)
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param target - comparison 대상 value 또는 expression
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.lt(u.score, 60)])
   * // WHERE score < 60
   * ```
   */
  lt<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "lt",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 이상 comparison (>=)
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param target - comparison 대상 value 또는 expression
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.gte(u.age, 18)])
   * // WHERE age >= 18
   * ```
   */
  gte<T extends ColumnPrimitive>(source: ExprUnit<T>, target: ExprInput<T>): WhereExprUnit {
    return new WhereExprUnit({
      type: "gte",
      source: toExpr(source),
      target: toExpr(target),
    });
  },

  /**
   * 이하 comparison (<=)
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param target - comparison 대상 value 또는 expression
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.lte(u.score, 100)])
   * // WHERE score <= 100
   * ```
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
   * from/to가 undefined이면 해당 방향은 무제한
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param from - start value (undefined이면 하한 없음)
   * @param to - 끝 value (undefined이면 상한 없음)
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * // range 지정
   * db.user().where((u) => [expr.between(u.age, 18, 65)])
   * // WHERE age BETWEEN 18 AND 65
   *
   * // Specify only lower bound
   * db.user().where((u) => [expr.between(u.age, 18, undefined)])
   * // WHERE age >= 18
   * ```
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
   * NULL 체크 (IS NULL)
   *
   * @param source - 체크할 컬럼 또는 expression
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.null(u.deletedAt)])
   * // WHERE deletedAt IS NULL
   * ```
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
   * LIKE pattern 매칭
   *
   * `%`는 0개 이상의 문자, `_`는 단일 문자와 매칭.
   * 특수문자는 `\`로 escape됨
   *
   * @param source - 검색할 컬럼 또는 expression
   * @param pattern - 검색 pattern (%, _ wildcard 사용 가능)
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * // 접두사 검색
   * db.user().where((u) => [expr.like(u.name, "John%")])
   * // WHERE name LIKE 'John%' ESCAPE '\'
   *
   * // include 검색
   * db.user().where((u) => [expr.like(u.email, "%@gmail.com")])
   * ```
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
   * regular expression pattern 매칭
   *
   * DBMS별 regular expression 문법 차이 주의 필요
   *
   * @param source - 검색할 컬럼 또는 expression
   * @param pattern - regular expression pattern
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.regexp(u.email, "^[a-z]+@")])
   * // MySQL: WHERE email REGEXP '^[a-z]+@'
   * ```
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
   * IN operator - Value 목록과 comparison
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param values - 비교할 value 목록
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.in(u.status, ["active", "pending"])])
   * // WHERE status IN ('active', 'pending')
   * ```
   */
  in<T extends ColumnPrimitive>(source: ExprUnit<T>, values: ExprInput<T>[]): WhereExprUnit {
    return new WhereExprUnit({
      type: "in",
      source: toExpr(source),
      values: values.map((v) => toExpr(v)),
    });
  },

  /**
   * IN (SELECT ...) - Subquery 결과와 comparison
   *
   * Subquery는 반드시 단일 컬럼만 SELECT해야 함
   *
   * @param source - 비교할 컬럼 또는 expression
   * @param query - 단일 컬럼을 반환하는 Queryable
   * @returns WHERE condition expression
   * @throws {Error} Subquery가 단일 컬럼이 아닌 경우
   *
   * @example
   * ```typescript
   * db.user().where((u) => [
   *   expr.inQuery(
   *     u.id,
   *     db.order()
   *       .where((o) => [expr.gt(o.amount, 1000)])
   *       .select((o) => ({ userId: o.userId }))
   *   ),
   * ])
   * // WHERE id IN (SELECT userId FROM Order WHERE amount > 1000)
   * ```
   */
  inQuery<T extends ColumnPrimitive, TData extends Record<string, T>>(
    source: ExprUnit<T>,
    query: Queryable<TData, any>,
  ): WhereExprUnit {
    const queryDef = query.getSelectQueryDef();
    if (queryDef.select == null || Object.keys(queryDef.select).length !== 1) {
      throw new Error("inQuery subquery must SELECT only a single column.");
    }
    return new WhereExprUnit({
      type: "inQuery",
      source: toExpr(source),
      query: queryDef,
    });
  },

  /**
   * EXISTS (SELECT ...) - Subquery result 존재 여부 확인
   *
   * Subquery가 하나 이상의 행을 반환하면 true
   *
   * @param query - 존재 여부를 확인할 Queryable
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * // 주문이 있는 사용자 조회
   * db.user().where((u) => [
   *   expr.exists(
   *     db.order().where((o) => [expr.eq(o.userId, u.id)])
   *   ),
   * ])
   * // WHERE EXISTS (SELECT 1 FROM Order WHERE userId = User.id)
   * ```
   */
  exists(query: Queryable<any, any>): WhereExprUnit {
    const { select: _, ...queryDefWithoutSelect } = query.getSelectQueryDef(); // EXISTS는 SELECT 절 불필요, 패킷 절약
    return new WhereExprUnit({
      type: "exists",
      query: queryDefWithoutSelect,
    });
  },

  //#endregion

  //#region ========== WHERE - Logical operators ==========

  /**
   * NOT operator - Condition 부정
   *
   * @param arg - 부정할 condition
   * @returns 부정된 WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [expr.not(expr.eq(u.status, "deleted"))])
   * // WHERE NOT (status <=> 'deleted')
   * ```
   */
  not(arg: WhereExprUnit): WhereExprUnit {
    return new WhereExprUnit({
      type: "not",
      arg: arg.expr,
    });
  },

  /**
   * AND operator - 모든 condition 충족
   *
   * 여러 조건을 AND로 결합. where() 메서드에 배열로 전달하면 automatic으로 AND applied
   *
   * @param conditions - AND로 결합할 condition 목록
   * @returns 결합된 WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [
   *   expr.and([
   *     expr.eq(u.status, "active"),
   *     expr.gte(u.age, 18),
   *   ]),
   * ])
   * // WHERE (status <=> 'active' AND age >= 18)
   * ```
   */
  and(conditions: WhereExprUnit[]): WhereExprUnit {
    if (conditions.length === 0) {
      throw new ArgumentError({ conditions: "빈 배열은 허용되지 않습니다" });
    }
    return new WhereExprUnit({
      type: "and",
      conditions: conditions.map((c) => c.expr),
    });
  },

  /**
   * OR operator - 하나 이상의 condition 충족
   *
   * @param conditions - OR로 결합할 condition 목록
   * @returns 결합된 WHERE condition expression
   *
   * @example
   * ```typescript
   * db.user().where((u) => [
   *   expr.or([
   *     expr.eq(u.status, "active"),
   *     expr.eq(u.status, "pending"),
   *   ]),
   * ])
   * // WHERE (status <=> 'active' OR status <=> 'pending')
   * ```
   */
  or(conditions: WhereExprUnit[]): WhereExprUnit {
    if (conditions.length === 0) {
      throw new ArgumentError({ conditions: "빈 배열은 허용되지 않습니다" });
    }
    return new WhereExprUnit({
      type: "or",
      conditions: conditions.map((c) => c.expr),
    });
  },

  //#endregion

  //#region ========== SELECT - 문자열 ==========

  /**
   * 문자열 연결 (CONCAT)
   *
   * NULL 값은 빈 문자열로 처리됨 (DBMS별 automatic Transform)
   *
   * @param args - 연결할 문자열들
   * @returns 연결된 문자열 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   fullName: expr.concat(u.firstName, " ", u.lastName),
   * }))
   * // SELECT CONCAT(firstName, ' ', lastName) AS fullName
   * ```
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
   * @param source - 원본 문자열
   * @param length - 추출할 문자 수
   * @returns 추출된 문자열 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   initial: expr.left(u.name, 1),
   * }))
   * // SELECT LEFT(name, 1) AS initial
   * ```
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
   * @param source - 원본 문자열
   * @param length - 추출할 문자 수
   * @returns 추출된 문자열 expression
   *
   * @example
   * ```typescript
   * db.phone().select((p) => ({
   *   lastFour: expr.right(p.number, 4),
   * }))
   * // SELECT RIGHT(number, 4) AS lastFour
   * ```
   */
  right<T extends string | undefined>(source: ExprUnit<T>, length: ExprInput<number>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "right",
      source: toExpr(source),
      length: toExpr(length),
    });
  },

  /**
   * 문자열 양쪽 공백 Remove (TRIM)
   *
   * @param source - 원본 문자열
   * @returns 공백이 제거된 문자열 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   name: expr.trim(u.name),
   * }))
   * // SELECT TRIM(name) AS name
   * ```
   */
  trim<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "trim",
      arg: toExpr(source),
    });
  },

  /**
   * 문자열 왼쪽 패딩 (LPAD)
   *
   * 지정 길이가 될 때까지 왼쪽에 fillString loop Add
   *
   * @param source - 원본 문자열
   * @param length - 목표 길이
   * @param fillString - 패딩에 사용할 문자열
   * @returns 패딩된 문자열 expression
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   orderNo: expr.padStart(expr.cast(o.id, { type: "varchar", length: 10 }), 8, "0"),
   * }))
   * // SELECT LPAD(CAST(id AS VARCHAR(10)), 8, '0') AS orderNo
   * // Result: "00000123"
   * ```
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
   * @param source - 원본 문자열
   * @param from - 찾을 문자열
   * @param to - 대체할 문자열
   * @returns 치환된 문자열 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   phone: expr.replace(u.phone, "-", ""),
   * }))
   * // SELECT REPLACE(phone, '-', '') AS phone
   * ```
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
   * 문자열 대문자 Transform (UPPER)
   *
   * @param source - 원본 문자열
   * @returns 대문자로 Transform된 문자열 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   code: expr.upper(u.code),
   * }))
   * // SELECT UPPER(code) AS code
   * ```
   */
  upper<T extends string | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("string", {
      type: "upper",
      arg: toExpr(source),
    });
  },

  /**
   * 문자열 소문자 Transform (LOWER)
   *
   * @param source - 원본 문자열
   * @returns 소문자로 Transform된 문자열 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   email: expr.lower(u.email),
   * }))
   * // SELECT LOWER(email) AS email
   * ```
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
   * @param source - 원본 문자열
   * @returns 문자 수
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   nameLength: expr.length(u.name),
   * }))
   * // SELECT CHAR_LENGTH(name) AS nameLength
   * ```
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
   * UTF-8 환경에서 한글은 3바이트
   *
   * @param source - 원본 문자열
   * @returns 바이트 수
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   byteLen: expr.byteLength(u.name),
   * }))
   * // SELECT OCTET_LENGTH(name) AS byteLen
   * ```
   */
  byteLength(source: ExprUnit<string | undefined>): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "byteLength",
      arg: toExpr(source),
    });
  },

  /**
   * 문자열 일부 추출 (SUBSTRING)
   *
   * SQL 표준에 따라 1-based index 사용
   *
   * @param source - 원본 문자열
   * @param start - start 위치 (1부터 start)
   * @param length - 추출할 길이 (생략 시 끝까지)
   * @returns 추출된 문자열 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   // "Hello World"에서 Index 1부터 5글자: "Hello"
   *   prefix: expr.substring(u.name, 1, 5),
   * }))
   * // SELECT SUBSTRING(name, 1, 5) AS prefix
   * ```
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
   * 1-based index return, 없으면 0 return
   *
   * @param source - 검색할 문자열
   * @param search - 찾을 문자열
   * @returns 위치 (1부터 start, 없으면 0)
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   atPos: expr.indexOf(u.email, "@"),
   * }))
   * // SELECT LOCATE('@', email) AS atPos (MySQL)
   * // "john@example.com" → 5
   * ```
   */
  indexOf(source: ExprUnit<string | undefined>, search: ExprInput<string>): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "indexOf",
      source: toExpr(source),
      search: toExpr(search),
    });
  },

  //#endregion

  //#region ========== SELECT - 숫자 ==========

  /**
   * 절대값 (ABS)
   *
   * @param source - 원본 숫자
   * @returns 절대값 expression
   *
   * @example
   * ```typescript
   * db.account().select((a) => ({
   *   balance: expr.abs(a.balance),
   * }))
   * // SELECT ABS(balance) AS balance
   * ```
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
   * @param source - 원본 숫자
   * @param digits - 소수점 이하 자릿수
   * @returns 반올림된 숫자 expression
   *
   * @example
   * ```typescript
   * db.product().select((p) => ({
   *   price: expr.round(p.price, 2),
   * }))
   * // SELECT ROUND(price, 2) AS price
   * // 123.456 → 123.46
   * ```
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
   * @param source - 원본 숫자
   * @returns 올림된 숫자 expression
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   pages: expr.ceil(expr.divide(o.itemCount, 10)),
   * }))
   * // SELECT CEILING(itemCount / 10) AS pages
   * // 25 / 10 = 2.5 → 3
   * ```
   */
  ceil<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("number", {
      type: "ceil",
      arg: toExpr(source),
    });
  },

  /**
   * 버림 (FLOOR)
   *
   * @param source - 원본 숫자
   * @returns 버림된 숫자 expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   ageGroup: expr.floor(expr.divide(u.age, 10)),
   * }))
   * // SELECT FLOOR(age / 10) AS ageGroup
   * // 25 / 10 = 2.5 → 2
   * ```
   */
  floor<T extends number | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("number", {
      type: "floor",
      arg: toExpr(source),
    });
  },

  //#endregion

  //#region ========== SELECT - 날짜 ==========

  /**
   * 연도 추출 (YEAR)
   *
   * @param source - DateTime 또는 DateOnly expression
   * @returns 연도 (4자리 숫자)
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   birthYear: expr.year(u.birthDate),
   * }))
   * // SELECT YEAR(birthDate) AS birthYear
   * ```
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
   * @param source - DateTime 또는 DateOnly expression
   * @returns 월 (1~12)
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   orderMonth: expr.month(o.createdAt),
   * }))
   * // SELECT MONTH(createdAt) AS orderMonth
   * ```
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
   * @param source - DateTime 또는 DateOnly expression
   * @returns 일 (1~31)
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   birthDay: expr.day(u.birthDate),
   * }))
   * // SELECT DAY(birthDate) AS birthDay
   * ```
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
   * @param source - DateTime 또는 Time expression
   * @returns 시 (0~23)
   *
   * @example
   * ```typescript
   * db.log().select((l) => ({
   *   logHour: expr.hour(l.createdAt),
   * }))
   * // SELECT HOUR(createdAt) AS logHour
   * ```
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
   * @param source - DateTime 또는 Time expression
   * @returns 분 (0~59)
   *
   * @example
   * ```typescript
   * db.log().select((l) => ({
   *   logMinute: expr.minute(l.createdAt),
   * }))
   * // SELECT MINUTE(createdAt) AS logMinute
   * ```
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
   * @param source - DateTime 또는 Time expression
   * @returns 초 (0~59)
   *
   * @example
   * ```typescript
   * db.log().select((l) => ({
   *   logSecond: expr.second(l.createdAt),
   * }))
   * // SELECT SECOND(createdAt) AS logSecond
   * ```
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
   * ISO 주차 추출
   *
   * ISO 8601 기준 주차 (월요일 start, 1~53)
   *
   * @param source - DateOnly expression
   * @returns ISO 주차 번호
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   weekNum: expr.isoWeek(o.orderDate),
   * }))
   * // SELECT WEEK(orderDate, 3) AS weekNum (MySQL)
   * ```
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
   * ISO 주 시작일 (월요일)
   *
   * 해당 날짜가 속한 주의 월요일 return
   *
   * @param source - DateOnly expression
   * @returns 주의 start 날짜 (월요일)
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   weekStart: expr.isoWeekStartDate(o.orderDate),
   * }))
   * // 2024-01-10 (수) → 2024-01-08 (월)
   * ```
   */
  isoWeekStartDate<T extends DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("DateOnly", {
      type: "isoWeekStartDate",
      arg: toExpr(source),
    });
  },

  /**
   * ISO 연월 (해당 월의 1일)
   *
   * 해당 날짜의 월 첫째 날 return
   *
   * @param source - DateOnly expression
   * @returns 월의 첫째 날
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   yearMonth: expr.isoYearMonth(o.orderDate),
   * }))
   * // 2024-01-15 → 2024-01-01
   * ```
   */
  isoYearMonth<T extends DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("DateOnly", {
      type: "isoYearMonth",
      arg: toExpr(source),
    });
  },

  /**
   * 날짜 차이 계산 (DATEDIFF)
   *
   * @param separator - 단위 ("year", "month", "day", "hour", "minute", "second")
   * @param from - start 날짜
   * @param to - 끝 날짜
   * @returns 차이 value (to - from)
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   age: expr.dateDiff("year", u.birthDate, expr.val("DateOnly", DateOnly.today())),
   * }))
   * // SELECT DATEDIFF(year, birthDate, '2024-01-15') AS age
   * ```
   */
  dateDiff<T extends DateTime | DateOnly | Time | undefined>(
    separator: DateSeparator,
    from: ExprInput<T>,
    to: ExprInput<T>,
  ): ExprUnit<T extends undefined ? undefined : number> {
    return new ExprUnit("number", {
      type: "dateDiff",
      separator,
      from: toExpr(from),
      to: toExpr(to),
    });
  },

  /**
   * 날짜 더하기 (DATEADD)
   *
   * @param separator - 단위 ("year", "month", "day", "hour", "minute", "second")
   * @param source - 원본 날짜
   * @param value - 더할 value (음수 가능)
   * @returns 계산된 날짜
   *
   * @example
   * ```typescript
   * db.subscription().select((s) => ({
   *   expiresAt: expr.dateAdd("month", s.startDate, 12),
   * }))
   * // SELECT DATEADD(month, 12, startDate) AS expiresAt
   * ```
   */
  dateAdd<T extends DateTime | DateOnly | Time | undefined>(
    separator: DateSeparator,
    source: ExprUnit<T>,
    value: ExprInput<number>,
  ): ExprUnit<T> {
    return new ExprUnit(source.dataType, {
      type: "dateAdd",
      separator,
      source: toExpr(source),
      value: toExpr(value),
    });
  },

  /**
   * 날짜 포맷 (DATE_FORMAT)
   *
   * DBMS별로 포맷 문자열 규칙이 다를 수 있음
   *
   * @param source - 날짜 expression
   * @param format - 포맷 문자열 (예: "%Y-%m-%d")
   * @returns 포맷된 문자열 expression
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   orderDate: expr.formatDate(o.createdAt, "%Y-%m-%d"),
   * }))
   * // SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS orderDate (MySQL)
   * // 2024-01-15 10:30:00 → "2024-01-15"
   * ```
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
   * NULL 대체 (COALESCE/IFNULL)
   *
   * 첫 번째 non-null 값을 return. 마지막 인자가 non-nullable이면 결과도 non-nullable
   *
   * @param args - Inspect할 값들 (마지막은 Default value)
   * @returns 첫 번째 non-null value
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   displayName: expr.ifNull(u.nickname, u.name, "Guest"),
   * }))
   * // SELECT COALESCE(nickname, name, 'Guest') AS displayName
   * ```
   */
  ifNull,

  /**
   * 특정 값이면 NULL return (NULLIF)
   *
   * source === value 이면 NULL return, 아니면 source return
   *
   * @param source - 원본 value
   * @param value - 비교할 value
   * @returns NULL 또는 원본 value
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   // 빈 문자열을 NULL로 Transform
   *   bio: expr.nullIf(u.bio, ""),
   * }))
   * // SELECT NULLIF(bio, '') AS bio
   * ```
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
   * WHERE 표현식을 boolean으로 Transform
   *
   * SELECT 절에서 condition 결과를 boolean 컬럼으로 사용할 때 사용
   *
   * @param condition - Transform할 condition
   * @returns boolean expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   isActive: expr.is(expr.eq(u.status, "active")),
   * }))
   * // SELECT (status <=> 'active') AS isActive
   * ```
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
   * 체이닝 방식으로 condition 분기를 구성
   *
   * @returns SwitchExprBuilder instance
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   grade: expr.switch<string>()
   *     .case(expr.gte(u.score, 90), "A")
   *     .case(expr.gte(u.score, 80), "B")
   *     .case(expr.gte(u.score, 70), "C")
   *     .default("F"),
   * }))
   * // SELECT CASE WHEN score >= 90 THEN 'A' ... ELSE 'F' END AS grade
   * ```
   */
  switch<T extends ColumnPrimitive>(): SwitchExprBuilder<T> {
    return createSwitchBuilder<T>();
  },

  /**
   * 단순 IF condition (삼항 operator)
   *
   * @param condition - Condition
   * @param then - Condition이 참일 때 value
   * @param else_ - Condition이 거짓일 때 value
   * @returns 조건부 value expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   type: expr.if(expr.gte(u.age, 18), "adult", "minor"),
   * }))
   * // SELECT IF(age >= 18, 'adult', 'minor') AS type
   * ```
   */
  if<T extends ColumnPrimitive>(
    condition: WhereExprUnit,
    then: ExprInput<T>,
    else_: ExprInput<T>,
  ): ExprUnit<T> {
    const allValues = [then, else_];
    // 1. ExprUnit에서 dataType 찾기
    const exprUnit = allValues.find((v): v is ExprUnit<T> => v instanceof ExprUnit);
    if (exprUnit) {
      return new ExprUnit(exprUnit.dataType, {
        type: "if",
        condition: condition.expr,
        then: toExpr(then),
        else: toExpr(else_),
      });
    }

    // 2. non-null 리터럴에서 추론
    const nonNullLiteral = allValues.find((v) => v != null) as ColumnPrimitive;
    if (nonNullLiteral == null) {
      throw new Error("if의 then/else 중 적어도 하나는 non-null이어야 합니다.");
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
  // SUM, AVG, MAX등의 집계는 모든 값이 NULL이거나 행이 없을 때만 NULL return (값이 NULL인 행은 무시함)

  /**
   * row 수 카운트 (COUNT)
   *
   * @param arg - 카운트할 컬럼 (생략 시 전체 row 수)
   * @param distinct - true면 중복 Remove
   * @returns row 수
   *
   * @example
   * ```typescript
   * // 전체 row 수
   * db.user().select(() => ({ total: expr.count() }))
   *
   * // 중복 Remove 카운트
   * db.order().select((o) => ({
   *   uniqueCustomers: expr.count(o.customerId, true),
   * }))
   * ```
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
   * NULL 값은 무시됨. 모든 값이 NULL이면 NULL return
   *
   * @param arg - 합계를 구할 숫자 컬럼
   * @returns 합계 (또는 NULL)
   *
   * @example
   * ```typescript
   * db.order().groupBy((o) => o.userId).select((o) => ({
   *   userId: o.userId,
   *   totalAmount: expr.sum(o.amount),
   * }))
   * ```
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
   * NULL 값은 무시됨. 모든 값이 NULL이면 NULL return
   *
   * @param arg - 평균을 구할 숫자 컬럼
   * @returns 평균 (또는 NULL)
   *
   * @example
   * ```typescript
   * db.product().groupBy((p) => p.categoryId).select((p) => ({
   *   categoryId: p.categoryId,
   *   avgPrice: expr.avg(p.price),
   * }))
   * ```
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
   * NULL 값은 무시됨. 모든 값이 NULL이면 NULL return
   *
   * @param arg - 최대값을 구할 컬럼
   * @returns 최대값 (또는 NULL)
   *
   * @example
   * ```typescript
   * db.order().groupBy((o) => o.userId).select((o) => ({
   *   userId: o.userId,
   *   lastOrderDate: expr.max(o.createdAt),
   * }))
   * ```
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
   * NULL 값은 무시됨. 모든 값이 NULL이면 NULL return
   *
   * @param arg - 최소값을 구할 컬럼
   * @returns 최소값 (또는 NULL)
   *
   * @example
   * ```typescript
   * db.product().groupBy((p) => p.categoryId).select((p) => ({
   *   categoryId: p.categoryId,
   *   minPrice: expr.min(p.price),
   * }))
   * ```
   */
  min<T extends ColumnPrimitive>(arg: ExprUnit<T>): ExprUnit<T | undefined> {
    return new ExprUnit(arg.dataType, {
      type: "min",
      arg: toExpr(arg),
    });
  },

  //#endregion

  //#region ========== SELECT - 기타 ==========

  /**
   * 여러 value 중 최대값 (GREATEST)
   *
   * @param args - 비교할 값들
   * @returns 최대값
   *
   * @example
   * ```typescript
   * db.product().select((p) => ({
   *   effectivePrice: expr.greatest(p.price, p.minPrice),
   * }))
   * // SELECT GREATEST(price, minPrice) AS effectivePrice
   * ```
   */
  greatest<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T> {
    return new ExprUnit(findDataType(args), {
      type: "greatest",
      args: args.map((a) => toExpr(a)),
    });
  },

  /**
   * 여러 value 중 최소값 (LEAST)
   *
   * @param args - 비교할 값들
   * @returns 최소값
   *
   * @example
   * ```typescript
   * db.product().select((p) => ({
   *   effectivePrice: expr.least(p.price, p.maxDiscount),
   * }))
   * // SELECT LEAST(price, maxDiscount) AS effectivePrice
   * ```
   */
  least<T extends ColumnPrimitive>(...args: ExprInput<T>[]): ExprUnit<T> {
    return new ExprUnit(findDataType(args), {
      type: "least",
      args: args.map((a) => toExpr(a)),
    });
  },

  /**
   * row 번호 (ROW_NUMBER 없이 전체 행에 대한 순번)
   *
   * @returns row 번호 (1부터 start)
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   rowNum: expr.rowNum(),
   *   name: u.name,
   * }))
   * ```
   */
  rowNum(): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "rowNum",
    });
  },

  /**
   * 난수 Generate (RAND/RANDOM)
   *
   * 0~1 사이의 난수 return. ORDER BY에서 랜덤 정렬용으로 주로 사용
   *
   * @returns 0~1 사이의 난수
   *
   * @example
   * ```typescript
   * // 랜덤 sorting
   * db.user().orderBy(() => expr.random()).limit(10)
   * ```
   */
  random(): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "random",
    });
  },

  /**
   * type Transform (CAST)
   *
   * @param source - Transform할 expression
   * @param targetType - 대상 data type
   * @returns Transform된 expression
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   idStr: expr.cast(o.id, { type: "varchar", length: 20 }),
   * }))
   * // SELECT CAST(id AS VARCHAR(20)) AS idStr
   * ```
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
   * 스칼라 Subquery - SELECT 절에서 단일 value return Subquery
   *
   * Subquery는 반드시 단일 row, 단일 컬럼을 반환해야 함
   *
   * @param dataType - 반환될 값의 data type
   * @param queryable - 스칼라 값을 반환하는 Queryable
   * @returns Subquery result expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   id: u.id,
   *   postCount: expr.subquery(
   *     "number",
   *     db.post()
   *       .where((p) => [expr.eq(p.userId, u.id)])
   *       .select(() => ({ cnt: expr.count() }))
   *   ),
   * }))
   * // SELECT id, (SELECT COUNT(*) FROM Post WHERE userId = User.id) AS postCount
   * ```
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
   * ROW_NUMBER() - 파티션 내 row 번호
   *
   * 각 파티션 내에서 1부터 시작하는 sequential 번호 부여
   *
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns row 번호 (1부터 start)
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   ...o,
   *   rowNum: expr.rowNumber({
   *     partitionBy: [o.userId],
   *     orderBy: [[o.createdAt, "DESC"]],
   *   }),
   * }))
   * // SELECT *, ROW_NUMBER() OVER (PARTITION BY userId ORDER BY createdAt DESC)
   * ```
   */
  rowNumber(spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "rowNumber" },
      spec: toWinSpec(spec),
    });
  },

  /**
   * RANK() - 파티션 내 순위 (동점 시 같은 순위, 다음 순위 건너뜀)
   *
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 순위 (동점 후 건너뜀: 1, 1, 3)
   *
   * @example
   * ```typescript
   * db.student().select((s) => ({
   *   name: s.name,
   *   rank: expr.rank({
   *     orderBy: [[s.score, "DESC"]],
   *   }),
   * }))
   * ```
   */
  rank(spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "rank" },
      spec: toWinSpec(spec),
    });
  },

  /**
   * DENSE_RANK() - 파티션 내 밀집 순위 (동점 시 같은 순위, 다음 순위 유지)
   *
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 밀집 순위 (동점 후 연속: 1, 1, 2)
   *
   * @example
   * ```typescript
   * db.student().select((s) => ({
   *   name: s.name,
   *   denseRank: expr.denseRank({
   *     orderBy: [[s.score, "DESC"]],
   *   }),
   * }))
   * ```
   */
  denseRank(spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "denseRank" },
      spec: toWinSpec(spec),
    });
  },

  /**
   * NTILE(n) - 파티션을 n개 그룹으로 split
   *
   * @param n - 분할할 그룹 수
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 그룹 번호 (1 ~ n)
   *
   * @example
   * ```typescript
   * // 상위 25%를 찾기 위한 사분위 split
   * db.user().select((u) => ({
   *   name: u.name,
   *   quartile: expr.ntile(4, {
   *     orderBy: [[u.score, "DESC"]],
   *   }),
   * }))
   * ```
   */
  ntile(n: number, spec: WinSpecInput): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "ntile", n },
      spec: toWinSpec(spec),
    });
  },

  /**
   * LAG() - 이전 행의 value 참조
   *
   * @param column - 참조할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @param options - offset (기본 1), default (이전 행이 없을 때 Default value)
   * @returns 이전 행의 value (또는 Default value/NULL)
   *
   * @example
   * ```typescript
   * db.stock().select((s) => ({
   *   date: s.date,
   *   price: s.price,
   *   prevPrice: expr.lag(s.price, {
   *     partitionBy: [s.symbol],
   *     orderBy: [[s.date, "ASC"]],
   *   }),
   * }))
   * ```
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
   * LEAD() - 다음 행의 value 참조
   *
   * @param column - 참조할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @param options - offset (기본 1), default (다음 행이 없을 때 Default value)
   * @returns 다음 행의 value (또는 Default value/NULL)
   *
   * @example
   * ```typescript
   * db.stock().select((s) => ({
   *   date: s.date,
   *   price: s.price,
   *   nextPrice: expr.lead(s.price, {
   *     partitionBy: [s.symbol],
   *     orderBy: [[s.date, "ASC"]],
   *   }),
   * }))
   * ```
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
   * FIRST_VALUE() - 파티션/프레임의 첫 번째 value
   *
   * @param column - 참조할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 첫 번째 value
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   ...o,
   *   firstOrderAmount: expr.firstValue(o.amount, {
   *     partitionBy: [o.userId],
   *     orderBy: [[o.createdAt, "ASC"]],
   *   }),
   * }))
   * ```
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
   * LAST_VALUE() - 파티션/프레임의 마지막 value
   *
   * @param column - 참조할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 마지막 value
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   ...o,
   *   lastOrderAmount: expr.lastValue(o.amount, {
   *     partitionBy: [o.userId],
   *     orderBy: [[o.createdAt, "ASC"]],
   *   }),
   * }))
   * ```
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
   * SUM() OVER - 윈도우 합계
   *
   * @param column - 합계를 구할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 윈도우 내 합계
   *
   * @example
   * ```typescript
   * // 누적 합계
   * db.order().select((o) => ({
   *   ...o,
   *   runningTotal: expr.sumOver(o.amount, {
   *     partitionBy: [o.userId],
   *     orderBy: [[o.createdAt, "ASC"]],
   *   }),
   * }))
   * ```
   */
  sumOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "sum", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  /**
   * AVG() OVER - 윈도우 평균
   *
   * @param column - 평균을 구할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 윈도우 내 평균
   *
   * @example
   * ```typescript
   * // move 평균
   * db.stock().select((s) => ({
   *   ...s,
   *   movingAvg: expr.avgOver(s.price, {
   *     partitionBy: [s.symbol],
   *     orderBy: [[s.date, "ASC"]],
   *   }),
   * }))
   * ```
   */
  avgOver(column: ExprUnit<number | undefined>, spec: WinSpecInput): ExprUnit<number | undefined> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "avg", column: toExpr(column) },
      spec: toWinSpec(spec),
    });
  },

  /**
   * COUNT() OVER - 윈도우 카운트
   *
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @param column - 카운트할 컬럼 (생략 시 전체 row 수)
   * @returns 윈도우 내 row 수
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   ...o,
   *   totalOrdersPerUser: expr.countOver({
   *     partitionBy: [o.userId],
   *   }),
   * }))
   * ```
   */
  countOver(spec: WinSpecInput, column?: ExprUnit<ColumnPrimitive>): ExprUnit<number> {
    return new ExprUnit("number", {
      type: "window",
      fn: { type: "count", column: column != null ? toExpr(column) : undefined },
      spec: toWinSpec(spec),
    });
  },

  /**
   * MIN() OVER - 윈도우 최소값
   *
   * @param column - 최소값을 구할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 윈도우 내 최소값
   *
   * @example
   * ```typescript
   * db.stock().select((s) => ({
   *   ...s,
   *   minPriceInPeriod: expr.minOver(s.price, {
   *     partitionBy: [s.symbol],
   *   }),
   * }))
   * ```
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
   * MAX() OVER - 윈도우 최대값
   *
   * @param column - 최대값을 구할 컬럼
   * @param spec - 윈도우 스펙 (partitionBy, orderBy)
   * @returns 윈도우 내 최대값
   *
   * @example
   * ```typescript
   * db.stock().select((s) => ({
   *   ...s,
   *   maxPriceInPeriod: expr.maxOver(s.price, {
   *     partitionBy: [s.symbol],
   *   }),
   * }))
   * ```
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
   * ExprInput을 Expr로 Transform (내부용)
   *
   * @param value - Transform할 value
   * @returns Expr JSON AST
   */
  toExpr(value: ExprInput<ColumnPrimitive>): Expr {
    return toExpr(value);
  },

  //#endregion
};

//#region ========== Internal Helpers ==========

// 여러 value 중 첫 번째 non-null return (COALESCE)
function ifNull<TPrimitive extends ColumnPrimitive>(
  ...args: [
    ExprInput<TPrimitive | undefined>,
    ...ExprInput<TPrimitive | undefined>[],
    ExprInput<NonNullable<TPrimitive>>,
  ]
): ExprUnit<NonNullable<TPrimitive>>;
function ifNull<TPrimitive extends ColumnPrimitive>(
  ...args: ExprInput<TPrimitive>[]
): ExprUnit<TPrimitive>;
function ifNull<TPrimitive extends ColumnPrimitive>(
  ...args: ExprInput<TPrimitive>[]
): ExprUnit<TPrimitive> {
  return new ExprUnit(findDataType(args), {
    type: "ifNull",
    args: args.map((a) => toExpr(a)),
  });
}

function createSwitchBuilder<TPrimitive extends ColumnPrimitive>(): SwitchExprBuilder<TPrimitive> {
  const cases: { when: WhereExpr; then: Expr }[] = [];
  const thenValues: ExprInput<TPrimitive>[] = []; // then 값들 저장

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
        throw new Error("switch의 case/default 중 적어도 하나는 non-null이어야 합니다.");
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
    throw new Error("args중 적어도 하나는 ExprUnit이어야 합니다.");
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
