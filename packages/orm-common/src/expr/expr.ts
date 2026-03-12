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
   * Wrap literal value as ExprUnit
   *
   * Widen to base type matching dataType, remove literal type
   *
   * @param dataType - The data type of the value ("string", "number", "boolean", "DateTime", "DateOnly", "Time", "Uuid", "Buffer")
   * @param value - Value to wrap (undefined allowed)
   * @returns Wrapped ExprUnit instance
   *
   * @example
   * ```typescript
   * // String value
   * expr.val("string", "active")
   *
   * // Number value
   * expr.val("number", 100)
   *
   * // Date value
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
   * Generate column reference
   *
   * Typically proxy objects are used inside Queryable callbacks
   *
   * @param dataType - Column data type
   * @param path - Column path (table alias, column name, etc.)
   * @returns Column reference ExprUnit instance
   *
   * @example
   * ```typescript
   * // Direct column reference (internal use)
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
   * Use when you need to directly use DB-specific functions or syntax not supported by the ORM.
   * Used as tagged template literal, interpolated values are automatically parameterized
   *
   * @param dataType - Data type of the returned value
   * @returns Tagged template function
   *
   * @example
   * ```typescript
   * // Using MySQL JSON function
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
          return acc + str + `$${i + 1}`; // placeholder (transformed by ExprRenderer)
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
   * Equality comparison (NULL-safe)
   *
   * Safely compare even NULL values (MySQL: `<=>`, MSSQL/PostgreSQL: `IS NULL OR =`)
   *
   * @param source - Column or expression to compare
   * @param target - Target value or expression for comparison
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
   * Greater than comparison (>)
   *
   * @param source - Column or expression to compare
   * @param target - Target value or expression for comparison
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
   * Less than comparison (<)
   *
   * @param source - Column or expression to compare
   * @param target - Target value or expression for comparison
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
   * Greater than or equal comparison (>=)
   *
   * @param source - Column or expression to compare
   * @param target - Target value or expression for comparison
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
   * Less than or equal comparison (<=)
   *
   * @param source - Column or expression to compare
   * @param target - Target value or expression for comparison
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
   * If from/to is undefined, that direction is unbounded
   *
   * @param source - Column or expression to compare
   * @param from - Start value (no lower bound if undefined)
   * @param to - End value (no upper bound if undefined)
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * // Specify range
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
   * NULL check (IS NULL)
   *
   * @param source - Column or expression to check
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
   * LIKE pattern matching
   *
   * `%` matches zero or more characters, `_` matches a single character.
   * Special characters are escaped with `\`
   *
   * @param source - Column or expression to search
   * @param pattern - Search pattern (%, _ wildcards available)
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * // Prefix search
   * db.user().where((u) => [expr.like(u.name, "John%")])
   * // WHERE name LIKE 'John%' ESCAPE '\'
   *
   * // Contains search
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
   * Regular expression pattern matching
   *
   * Note: regex syntax may differ between DBMS implementations
   *
   * @param source - Column or expression to search
   * @param pattern - Regular expression pattern
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
   * IN operator - Compare against a list of values
   *
   * @param source - Column or expression to compare
   * @param values - List of values to compare against
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
   * IN (SELECT ...) - Compare against subquery results
   *
   * The subquery must SELECT only a single column
   *
   * @param source - Column or expression to compare
   * @param query - Queryable that returns a single column
   * @returns WHERE condition expression
   * @throws {Error} When the subquery does not return a single column
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
   * EXISTS (SELECT ...) - Check if subquery returns any rows
   *
   * Returns true if the subquery returns one or more rows
   *
   * @param query - Queryable to check for existence
   * @returns WHERE condition expression
   *
   * @example
   * ```typescript
   * // Query users who have orders
   * db.user().where((u) => [
   *   expr.exists(
   *     db.order().where((o) => [expr.eq(o.userId, u.id)])
   *   ),
   * ])
   * // WHERE EXISTS (SELECT 1 FROM Order WHERE userId = User.id)
   * ```
   */
  exists(query: Queryable<any, any>): WhereExprUnit {
    const { select: _, ...queryDefWithoutSelect } = query.getSelectQueryDef(); // EXISTS does not need SELECT clause, saves packet size
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
   * AND operator - All conditions must be satisfied
   *
   * Combines multiple conditions with AND. Passing an array to where() automatically applies AND
   *
   * @param conditions - List of conditions to combine with AND
   * @returns Combined WHERE condition expression
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
   * String concatenation (CONCAT)
   *
   * NULL values are treated as empty strings (auto-transformed per DBMS)
   *
   * @param args - Strings to concatenate
   * @returns Concatenated string expression
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
   * Extract specified length from the left of a string (LEFT)
   *
   * @param source - Original string
   * @param length - Number of characters to extract
   * @returns Extracted string expression
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
   * Extract specified length from the right of a string (RIGHT)
   *
   * @param source - Original string
   * @param length - Number of characters to extract
   * @returns Extracted string expression
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
   * Remove whitespace from both sides of a string (TRIM)
   *
   * @param source - Original string
   * @returns String expression with whitespace removed
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
   * Left padding (LPAD)
   *
   * Repeatedly adds fillString on the left until the target length is reached
   *
   * @param source - Original string
   * @param length - Target length
   * @param fillString - String to use for padding
   * @returns Padded string expression
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
   * String replacement (REPLACE)
   *
   * @param source - Original string
   * @param from - String to find
   * @param to - Replacement string
   * @returns Replaced string expression
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
   * Convert string to uppercase (UPPER)
   *
   * @param source - Original string
   * @returns Uppercase string expression
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
   * Convert string to lowercase (LOWER)
   *
   * @param source - Original string
   * @returns Lowercase string expression
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
   * String length (character count)
   *
   * @param source - Original string
   * @returns Character count
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
   * String byte length
   *
   * In UTF-8, CJK characters are 3 bytes each
   *
   * @param source - Original string
   * @returns Byte count
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
   * Extract part of a string (SUBSTRING)
   *
   * Uses 1-based index per SQL standard
   *
   * @param source - Original string
   * @param start - Start position (starting from 1)
   * @param length - Length to extract (to the end if omitted)
   * @returns Extracted string expression
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   // From "Hello World", 5 characters starting at index 1: "Hello"
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
   * Find position within a string (LOCATE/CHARINDEX)
   *
   * Returns 1-based index, or 0 if not found
   *
   * @param source - String to search in
   * @param search - String to find
   * @returns Position (starting from 1, 0 if not found)
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

  //#region ========== SELECT - Number ==========

  /**
   * Absolute value (ABS)
   *
   * @param source - Original number
   * @returns Absolute value expression
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
   * Round (ROUND)
   *
   * @param source - Original number
   * @param digits - Number of decimal places
   * @returns Rounded number expression
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
   * Ceiling (CEILING)
   *
   * @param source - Original number
   * @returns Ceiling number expression
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
   * Floor (FLOOR)
   *
   * @param source - Original number
   * @returns Floor number expression
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

  //#region ========== SELECT - Date ==========

  /**
   * Extract year (YEAR)
   *
   * @param source - DateTime or DateOnly expression
   * @returns Year (4-digit number)
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
   * Extract month (MONTH)
   *
   * @param source - DateTime or DateOnly expression
   * @returns Month (1~12)
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
   * Extract day (DAY)
   *
   * @param source - DateTime or DateOnly expression
   * @returns Day (1~31)
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
   * Extract hour (HOUR)
   *
   * @param source - DateTime or Time expression
   * @returns Hour (0~23)
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
   * Extract minute (MINUTE)
   *
   * @param source - DateTime or Time expression
   * @returns Minute (0~59)
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
   * Extract second (SECOND)
   *
   * @param source - DateTime or Time expression
   * @returns Second (0~59)
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
   * Extract ISO week number
   *
   * ISO 8601 week number (starts Monday, 1~53)
   *
   * @param source - DateOnly expression
   * @returns ISO week number
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
   * ISO week start date (Monday)
   *
   * Returns the Monday of the week the given date belongs to
   *
   * @param source - DateOnly expression
   * @returns Week start date (Monday)
   *
   * @example
   * ```typescript
   * db.order().select((o) => ({
   *   weekStart: expr.isoWeekStartDate(o.orderDate),
   * }))
   * // 2024-01-10 (Wed) → 2024-01-08 (Mon)
   * ```
   */
  isoWeekStartDate<T extends DateOnly | undefined>(source: ExprUnit<T>): ExprUnit<T> {
    return new ExprUnit("DateOnly", {
      type: "isoWeekStartDate",
      arg: toExpr(source),
    });
  },

  /**
   * ISO year-month (first day of the month)
   *
   * Returns the first day of the month for the given date
   *
   * @param source - DateOnly expression
   * @returns First day of the month
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
   * Calculate date difference (DATEDIFF)
   *
   * @param unit - Unit ("year", "month", "day", "hour", "minute", "second")
   * @param from - Start date
   * @param to - End date
   * @returns Difference value (to - from)
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
   * Add to date (DATEADD)
   *
   * @param unit - Unit ("year", "month", "day", "hour", "minute", "second")
   * @param source - Original date
   * @param value - Value to add (negative allowed)
   * @returns Calculated date
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
   * Date format (DATE_FORMAT)
   *
   * Format string rules may differ between DBMS implementations
   *
   * @param source - Date expression
   * @param format - Format string (e.g., "%Y-%m-%d")
   * @returns Formatted string expression
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
   * NULL replacement (COALESCE/IFNULL)
   *
   * Returns the first non-null value. If the last argument is non-nullable, the result is also non-nullable
   *
   * @param args - Values to inspect (last is default value)
   * @returns First non-null value
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   displayName: expr.coalesce(u.nickname, u.name, "Guest"),
   * }))
   * // SELECT COALESCE(nickname, name, 'Guest') AS displayName
   * ```
   */
  coalesce,

  /**
   * Return NULL if value matches (NULLIF)
   *
   * Returns NULL if source === value, otherwise returns source
   *
   * @param source - Original value
   * @param value - Value to compare
   * @returns NULL or original value
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   // Convert empty string to NULL
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
   * Transform WHERE expression to boolean
   *
   * Used when condition results should be used as a boolean column in SELECT clause
   *
   * @param condition - Condition to transform
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
   * Build conditional branches using method chaining
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
   * Simple IF condition (ternary operator)
   *
   * @param condition - Condition
   * @param then - Value when condition is true
   * @param else_ - Value when condition is false
   * @returns Conditional value expression
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
  // Aggregates like SUM, AVG, MAX return NULL only when all values are NULL or no rows exist (rows with NULL values are ignored)

  /**
   * Count rows (COUNT)
   *
   * @param arg - Column to count (all rows if omitted)
   * @param distinct - If true, remove duplicates
   * @returns Row count
   *
   * @example
   * ```typescript
   * // Total row count
   * db.user().select(() => ({ total: expr.count() }))
   *
   * // Distinct count
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
   * Sum (SUM)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Number column to sum
   * @returns Sum (or NULL)
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
   * Average (AVG)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Number column to average
   * @returns Average (or NULL)
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
   * Maximum value (MAX)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Column to find maximum of
   * @returns Maximum value (or NULL)
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
   * Minimum value (MIN)
   *
   * NULL values are ignored. Returns NULL if all values are NULL
   *
   * @param arg - Column to find minimum of
   * @returns Minimum value (or NULL)
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

  //#region ========== SELECT - Other ==========

  /**
   * Greatest value among multiple values (GREATEST)
   *
   * @param args - Values to compare
   * @returns Greatest value
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
   * Least value among multiple values (LEAST)
   *
   * @param args - Values to compare
   * @returns Least value
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
   * Row number (sequential number for all rows without ROW_NUMBER)
   *
   * @returns Row number (starting from 1)
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
   * Generate random number (RAND/RANDOM)
   *
   * Returns a random number between 0 and 1. Mainly used for random ordering in ORDER BY
   *
   * @returns Random number between 0 and 1
   *
   * @example
   * ```typescript
   * // Random sorting
   * db.user().orderBy(() => expr.random()).limit(10)
   * ```
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
   * Scalar Subquery - Subquery that returns a single value in SELECT clause
   *
   * The subquery must return exactly one row and one column
   *
   * @param dataType - Data type of the returned value
   * @param queryable - Queryable that returns a scalar value
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
   * ROW_NUMBER() - Row number within a partition
   *
   * Assigns sequential numbers starting from 1 within each partition
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Row number (starting from 1)
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
   * RANK() - Rank within a partition (ties get same rank, next rank is skipped)
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Rank (skips after ties: 1, 1, 3)
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
   * DENSE_RANK() - Dense rank within a partition (ties get same rank, next rank is consecutive)
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Dense rank (consecutive after ties: 1, 1, 2)
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
   * NTILE(n) - Split partition into n groups
   *
   * @param n - Number of groups to split into
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Group number (1 ~ n)
   *
   * @example
   * ```typescript
   * // Quartile split to find top 25%
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
   * LAG() - Reference value from a previous row
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @param options - offset (default 1), default (default value when no previous row)
   * @returns Previous row's value (or default value/NULL)
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
   * LEAD() - Reference value from a following row
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @param options - offset (default 1), default (default value when no following row)
   * @returns Following row's value (or default value/NULL)
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
   * FIRST_VALUE() - First value in the partition/frame
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns First value
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
   * LAST_VALUE() - Last value in the partition/frame
   *
   * @param column - Column to reference
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Last value
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
   * SUM() OVER - Window sum
   *
   * @param column - Column to sum
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Sum within window
   *
   * @example
   * ```typescript
   * // Running total
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
   * AVG() OVER - Window average
   *
   * @param column - Column to average
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Average within window
   *
   * @example
   * ```typescript
   * // Moving average
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
   * COUNT() OVER - Window count
   *
   * @param spec - Window spec (partitionBy, orderBy)
   * @param column - Column to count (all rows if omitted)
   * @returns Row count within window
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
   * MIN() OVER - Window minimum
   *
   * @param column - Column to find minimum of
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Minimum value within window
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
   * MAX() OVER - Window maximum
   *
   * @param column - Column to find maximum of
   * @param spec - Window spec (partitionBy, orderBy)
   * @returns Maximum value within window
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
   * Transform ExprInput to Expr (internal use)
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

// Return the first non-null value among multiple values (COALESCE)
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
  const thenValues: ExprInput<TPrimitive>[] = []; // Store then values

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
      // 1. Find dataType from ExprUnit
      const exprUnit = allValues.find((v): v is ExprUnit<TPrimitive> => v instanceof ExprUnit);
      if (exprUnit) {
        return new ExprUnit(exprUnit.dataType, {
          type: "switch",
          cases,
          else: toExpr(value),
        });
      }

      // 2. Infer from non-null literal
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
