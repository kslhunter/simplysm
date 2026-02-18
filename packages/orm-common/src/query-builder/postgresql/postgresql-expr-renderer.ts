import { DateOnly, DateTime, Time, Uuid, bytesToHex } from "@simplysm/core-common";
import type {
  ExprColumn,
  ExprValue,
  ExprRaw,
  ExprEq,
  ExprGt,
  ExprLt,
  ExprGte,
  ExprLte,
  ExprBetween,
  ExprIsNull,
  ExprLike,
  ExprRegexp,
  ExprIn,
  ExprInQuery,
  ExprExists,
  ExprNot,
  ExprAnd,
  ExprOr,
  ExprConcat,
  ExprLeft,
  ExprRight,
  ExprTrim,
  ExprPadStart,
  ExprReplace,
  ExprUpper,
  ExprLower,
  ExprLength,
  ExprByteLength,
  ExprSubstring,
  ExprIndexOf,
  ExprAbs,
  ExprRound,
  ExprCeil,
  ExprFloor,
  ExprYear,
  ExprMonth,
  ExprDay,
  ExprHour,
  ExprMinute,
  ExprSecond,
  ExprIsoWeek,
  ExprIsoWeekStartDate,
  ExprIsoYearMonth,
  ExprDateDiff,
  ExprDateAdd,
  ExprFormatDate,
  ExprIfNull,
  ExprNullIf,
  ExprIs,
  ExprSwitch,
  ExprIf,
  ExprCount,
  ExprSum,
  ExprAvg,
  ExprMax,
  ExprMin,
  ExprGreatest,
  ExprLeast,
  ExprRowNum,
  ExprCast,
  ExprWindow,
  ExprSubquery,
  DateSeparator,
} from "../../types/expr";
import type { DataType } from "../../types/column";
import { ExprRendererBase } from "../base/expr-renderer-base";

/**
 * PostgreSQL Expr 렌더러
 */
export class PostgresqlExprRenderer extends ExprRendererBase {
  //#region ========== 유틸리티 (public - QueryBuilder에서도 사용) ==========

  /** 식별자 감싸기 */
  wrap(name: string): string {
    return `"${name}"`;
  }

  /** SQL 문자열 리터럴용 이스케이프 (따옴표 없이 반환) */
  escapeString(value: string): string {
    return value.replace(/'/g, "''");
  }

  /** 값 이스케이프 */
  escapeValue(value: unknown): string {
    if (value == null) {
      return "NULL";
    }
    if (typeof value === "string") {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }
    if (value instanceof DateTime) {
      return `'${value.toFormatString("yyyy-MM-dd HH:mm:ss")}'::timestamp`;
    }
    if (value instanceof DateOnly) {
      return `'${value.toFormatString("yyyy-MM-dd")}'::date`;
    }
    if (value instanceof Time) {
      return `'${value.toFormatString("HH:mm:ss")}'::time`;
    }
    if (value instanceof Uuid) {
      return `'${value.toString()}'::uuid`;
    }
    if (value instanceof Uint8Array) {
      return `'\\x${bytesToHex(value)}'::bytea`;
    }
    throw new Error(`알 수 없는 값 타입: ${typeof value}`);
  }

  /** DataType → SQL 타입 */
  renderDataType(dataType: DataType): string {
    switch (dataType.type) {
      case "int":
        return "INTEGER";
      case "bigint":
        return "BIGINT";
      case "float":
        return "REAL";
      case "double":
        return "DOUBLE PRECISION";
      case "decimal":
        return dataType.scale != null
          ? `NUMERIC(${dataType.precision}, ${dataType.scale})`
          : `NUMERIC(${dataType.precision})`;
      case "varchar":
        return `VARCHAR(${dataType.length})`;
      case "char":
        return `CHAR(${dataType.length})`;
      case "text":
        return "TEXT";
      case "binary":
        return "BYTEA";
      case "boolean":
        return "BOOLEAN";
      case "datetime":
        return "TIMESTAMP";
      case "date":
        return "DATE";
      case "time":
        return "TIME";
      case "uuid":
        return "UUID";
    }
  }

  //#endregion

  //#region ========== 값 ==========

  protected column(expr: ExprColumn): string {
    return expr.path.map((p) => this.wrap(p)).join(".");
  }

  protected value(expr: ExprValue): string {
    return this.escapeValue(expr.value);
  }

  protected raw(expr: ExprRaw): string {
    return expr.sql.replace(/\$(\d+)/g, (_, num) => {
      const idx = parseInt(num) - 1;
      return idx < expr.params.length ? this.render(expr.params[idx]) : `$${num}`;
    });
  }

  //#endregion

  //#region ========== 비교 (null-safe) ==========

  protected eq(expr: ExprEq): string {
    // PostgreSQL: null-safe equal (IS NOT DISTINCT FROM 연산자 사용)
    const left = this.render(expr.source);
    const right = this.render(expr.target);
    return `${left} IS NOT DISTINCT FROM ${right}`;
  }

  protected gt(expr: ExprGt): string {
    return `${this.render(expr.source)} > ${this.render(expr.target)}`;
  }

  protected lt(expr: ExprLt): string {
    return `${this.render(expr.source)} < ${this.render(expr.target)}`;
  }

  protected gte(expr: ExprGte): string {
    return `${this.render(expr.source)} >= ${this.render(expr.target)}`;
  }

  protected lte(expr: ExprLte): string {
    return `${this.render(expr.source)} <= ${this.render(expr.target)}`;
  }

  protected between(expr: ExprBetween): string {
    const source = this.render(expr.source);
    if (expr.from != null && expr.to != null) {
      return `${source} BETWEEN ${this.render(expr.from)} AND ${this.render(expr.to)}`;
    }
    if (expr.from != null) {
      return `${source} >= ${this.render(expr.from)}`;
    }
    if (expr.to != null) {
      return `${source} <= ${this.render(expr.to)}`;
    }
    return "TRUE";
  }

  protected null(expr: ExprIsNull): string {
    return `${this.render(expr.arg)} IS NULL`;
  }

  protected like(expr: ExprLike): string {
    // ESCAPE '\' 항상 추가
    return `${this.render(expr.source)} LIKE ${this.render(expr.pattern)} ESCAPE '\\'`;
  }

  protected regexp(expr: ExprRegexp): string {
    // PostgreSQL: ~ 연산자
    return `${this.render(expr.source)} ~ ${this.render(expr.pattern)}`;
  }

  protected in(expr: ExprIn): string {
    if (expr.values.length === 0) {
      return "FALSE"; // 빈 IN은 항상 false
    }
    const values = expr.values.map((v) => this.render(v)).join(", ");
    return `${this.render(expr.source)} IN (${values})`;
  }

  protected inQuery(expr: ExprInQuery): string {
    return `${this.render(expr.source)} IN (${this.buildSelect(expr.query)})`;
  }

  protected exists(expr: ExprExists): string {
    // SELECT 1로 렌더링
    const subquery = this.buildSelect({
      ...expr.query,
      select: { _: { type: "value", value: 1 } },
    });
    return `EXISTS (${subquery})`;
  }

  //#endregion

  //#region ========== 논리 ==========

  protected not(expr: ExprNot): string {
    return `NOT (${this.render(expr.arg)})`;
  }

  protected and(expr: ExprAnd): string {
    if (expr.conditions.length === 0) return "TRUE";
    return `(${expr.conditions.map((c) => this.render(c)).join(" AND ")})`;
  }

  protected or(expr: ExprOr): string {
    if (expr.conditions.length === 0) return "FALSE";
    return `(${expr.conditions.map((c) => this.render(c)).join(" OR ")})`;
  }

  //#endregion

  //#region ========== 문자열 (null 처리) ==========

  protected concat(expr: ExprConcat): string {
    // PostgreSQL: || 연산자와 COALESCE 사용
    const args = expr.args.map((a) => `COALESCE(${this.render(a)}, '')`);
    return args.join(" || ");
  }

  protected left(expr: ExprLeft): string {
    return `LEFT(${this.render(expr.source)}, ${this.render(expr.length)})`;
  }

  protected right(expr: ExprRight): string {
    return `RIGHT(${this.render(expr.source)}, ${this.render(expr.length)})`;
  }

  protected trim(expr: ExprTrim): string {
    return `TRIM(${this.render(expr.arg)})`;
  }

  protected padStart(expr: ExprPadStart): string {
    return `LPAD(${this.render(expr.source)}, ${this.render(expr.length)}, ${this.render(expr.fillString)})`;
  }

  protected replace(expr: ExprReplace): string {
    return `REPLACE(${this.render(expr.source)}, ${this.render(expr.from)}, ${this.render(expr.to)})`;
  }

  protected upper(expr: ExprUpper): string {
    return `UPPER(${this.render(expr.arg)})`;
  }

  protected lower(expr: ExprLower): string {
    return `LOWER(${this.render(expr.arg)})`;
  }

  protected length(expr: ExprLength): string {
    // PostgreSQL: LENGTH() (null 처리)
    return `LENGTH(COALESCE(${this.render(expr.arg)}, ''))`;
  }

  protected byteLength(expr: ExprByteLength): string {
    // PostgreSQL: OCTET_LENGTH() (null 처리)
    return `OCTET_LENGTH(COALESCE(${this.render(expr.arg)}, ''))`;
  }

  protected substring(expr: ExprSubstring): string {
    if (expr.length != null) {
      return `SUBSTRING(${this.render(expr.source)}, ${this.render(expr.start)}, ${this.render(expr.length)})`;
    }
    return `SUBSTRING(${this.render(expr.source)} FROM ${this.render(expr.start)})`;
  }

  protected indexOf(expr: ExprIndexOf): string {
    return `POSITION(${this.render(expr.search)} IN ${this.render(expr.source)})`;
  }

  //#endregion

  //#region ========== 숫자 ==========

  protected abs(expr: ExprAbs): string {
    return `ABS(${this.render(expr.arg)})`;
  }

  protected round(expr: ExprRound): string {
    return `ROUND(${this.render(expr.arg)}, ${expr.digits})`;
  }

  protected ceil(expr: ExprCeil): string {
    return `CEIL(${this.render(expr.arg)})`;
  }

  protected floor(expr: ExprFloor): string {
    return `FLOOR(${this.render(expr.arg)})`;
  }

  //#endregion

  //#region ========== 날짜 ==========

  protected year(expr: ExprYear): string {
    return `EXTRACT(YEAR FROM ${this.render(expr.arg)})::INTEGER`;
  }

  protected month(expr: ExprMonth): string {
    return `EXTRACT(MONTH FROM ${this.render(expr.arg)})::INTEGER`;
  }

  protected day(expr: ExprDay): string {
    return `EXTRACT(DAY FROM ${this.render(expr.arg)})::INTEGER`;
  }

  protected hour(expr: ExprHour): string {
    return `EXTRACT(HOUR FROM ${this.render(expr.arg)})::INTEGER`;
  }

  protected minute(expr: ExprMinute): string {
    return `EXTRACT(MINUTE FROM ${this.render(expr.arg)})::INTEGER`;
  }

  protected second(expr: ExprSecond): string {
    return `EXTRACT(SECOND FROM ${this.render(expr.arg)})::INTEGER`;
  }

  protected isoWeek(expr: ExprIsoWeek): string {
    return `EXTRACT(WEEK FROM ${this.render(expr.arg)})::INTEGER`;
  }

  protected isoWeekStartDate(expr: ExprIsoWeekStartDate): string {
    const src = this.render(expr.arg);
    // ISO 주의 시작일 (월요일)
    return `DATE_TRUNC('week', ${src})::DATE`;
  }

  protected isoYearMonth(expr: ExprIsoYearMonth): string {
    return `TO_CHAR(${this.render(expr.arg)}, 'YYYYMM')`;
  }

  protected dateDiff(expr: ExprDateDiff): string {
    const from = this.render(expr.from);
    const to = this.render(expr.to);
    switch (expr.separator) {
      case "year":
        return `EXTRACT(YEAR FROM AGE(${to}, ${from}))::INTEGER`;
      case "month":
        return `(EXTRACT(YEAR FROM AGE(${to}, ${from})) * 12 + EXTRACT(MONTH FROM AGE(${to}, ${from})))::INTEGER`;
      case "day":
        return `(${to}::DATE - ${from}::DATE)`;
      case "hour":
        return `EXTRACT(EPOCH FROM (${to} - ${from}))::INTEGER / 3600`;
      case "minute":
        return `EXTRACT(EPOCH FROM (${to} - ${from}))::INTEGER / 60`;
      case "second":
        return `EXTRACT(EPOCH FROM (${to} - ${from}))::INTEGER`;
    }
  }

  protected dateAdd(expr: ExprDateAdd): string {
    const source = this.render(expr.source);
    const value = this.render(expr.value);
    const unit = this.dateSeparatorToUnit(expr.separator);
    return `${source} + INTERVAL '1 ${unit}' * ${value}`;
  }

  protected formatDate(expr: ExprFormatDate): string {
    // JS format → PostgreSQL TO_CHAR format
    const pgFormat = this.convertDateFormat(expr.format);
    return `TO_CHAR(${this.render(expr.source)}, '${pgFormat}')`;
  }

  private dateSeparatorToUnit(sep: DateSeparator): string {
    switch (sep) {
      case "year":
        return "year";
      case "month":
        return "month";
      case "day":
        return "day";
      case "hour":
        return "hour";
      case "minute":
        return "minute";
      case "second":
        return "second";
    }
  }

  private convertDateFormat(format: string): string {
    // JS format → PostgreSQL TO_CHAR format
    return format
      .replace(/yyyy/g, "YYYY")
      .replace(/MM/g, "MM")
      .replace(/dd/g, "DD")
      .replace(/HH/g, "HH24")
      .replace(/mm/g, "MI")
      .replace(/ss/g, "SS");
  }

  //#endregion

  //#region ========== 조건 ==========

  protected ifNull(expr: ExprIfNull): string {
    if (expr.args.length === 0) return "NULL";
    if (expr.args.length === 1) return this.render(expr.args[0]);
    // PostgreSQL: COALESCE
    return `COALESCE(${expr.args.map((a) => this.render(a)).join(", ")})`;
  }

  protected nullIf(expr: ExprNullIf): string {
    return `NULLIF(${this.render(expr.source)}, ${this.render(expr.value)})`;
  }

  protected is(expr: ExprIs): string {
    return `(${this.render(expr.condition)})::INTEGER`;
  }

  protected switch(expr: ExprSwitch): string {
    const cases = expr.cases
      .map((c) => `WHEN ${this.render(c.when)} THEN ${this.render(c.then)}`)
      .join(" ");
    return `CASE ${cases} ELSE ${this.render(expr.else)} END`;
  }

  protected if(expr: ExprIf): string {
    const elseVal = expr.else != null ? this.render(expr.else) : "NULL";
    return `CASE WHEN ${this.render(expr.condition)} THEN ${this.render(expr.then)} ELSE ${elseVal} END`;
  }

  //#endregion

  //#region ========== 집계 ==========

  protected count(expr: ExprCount): string {
    if (expr.arg != null) {
      const distinct = expr.distinct ? "DISTINCT " : "";
      return `COUNT(${distinct}${this.render(expr.arg)})`;
    }
    return "COUNT(*)";
  }

  protected sum(expr: ExprSum): string {
    return `SUM(${this.render(expr.arg)})`;
  }

  protected avg(expr: ExprAvg): string {
    return `AVG(${this.render(expr.arg)})`;
  }

  protected max(expr: ExprMax): string {
    return `MAX(${this.render(expr.arg)})`;
  }

  protected min(expr: ExprMin): string {
    return `MIN(${this.render(expr.arg)})`;
  }

  //#endregion

  //#region ========== 기타 ==========

  protected greatest(expr: ExprGreatest): string {
    if (expr.args.length === 0) throw new Error("greatest는 최소 하나의 인자가 필요합니다.");
    // PostgreSQL: GREATEST 네이티브 지원
    return `GREATEST(${expr.args.map((a) => this.render(a)).join(", ")})`;
  }

  protected least(expr: ExprLeast): string {
    if (expr.args.length === 0) throw new Error("least는 최소 하나의 인자가 필요합니다.");
    // PostgreSQL: LEAST 네이티브 지원
    return `LEAST(${expr.args.map((a) => this.render(a)).join(", ")})`;
  }

  protected rowNum(_expr: ExprRowNum): string {
    return "ROW_NUMBER() OVER ()";
  }

  protected random(): string {
    return "RANDOM()";
  }

  protected cast(expr: ExprCast): string {
    return `CAST(${this.render(expr.source)} AS ${this.renderDataType(expr.targetType)})`;
  }

  //#endregion

  //#region ========== 윈도우 ==========

  protected window(expr: ExprWindow): string {
    const fn = this.renderWindowFn(expr.fn);
    let over = this.renderWindowSpec(expr.spec);

    // LAST_VALUE는 기본 프레임이 CURRENT ROW까지만 보므로 전체 프레임 명시 필요
    if (expr.fn.type === "lastValue" && over.length > 0) {
      over += " ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING";
    }

    return `${fn} OVER (${over})`;
  }

  private renderWindowFn(fn: ExprWindow["fn"]): string {
    switch (fn.type) {
      case "rowNumber":
        return "ROW_NUMBER()";
      case "rank":
        return "RANK()";
      case "denseRank":
        return "DENSE_RANK()";
      case "ntile":
        return `NTILE(${fn.n})`;
      case "lag": {
        const offset = fn.offset ?? 1;
        const def = fn.default != null ? `, ${this.render(fn.default)}` : "";
        return `LAG(${this.render(fn.column)}, ${offset}${def})`;
      }
      case "lead": {
        const offset = fn.offset ?? 1;
        const def = fn.default != null ? `, ${this.render(fn.default)}` : "";
        return `LEAD(${this.render(fn.column)}, ${offset}${def})`;
      }
      case "firstValue":
        return `FIRST_VALUE(${this.render(fn.column)})`;
      case "lastValue":
        return `LAST_VALUE(${this.render(fn.column)})`;
      case "sum":
        return `SUM(${this.render(fn.column)})`;
      case "avg":
        return `AVG(${this.render(fn.column)})`;
      case "count":
        return fn.column != null ? `COUNT(${this.render(fn.column)})` : "COUNT(*)";
      case "min":
        return `MIN(${this.render(fn.column)})`;
      case "max":
        return `MAX(${this.render(fn.column)})`;
    }
  }

  private renderWindowSpec(spec: ExprWindow["spec"]): string {
    const parts: string[] = [];
    if (spec.partitionBy != null && spec.partitionBy.length > 0) {
      parts.push(`PARTITION BY ${spec.partitionBy.map((p) => this.render(p)).join(", ")}`);
    }
    if (spec.orderBy != null && spec.orderBy.length > 0) {
      const orderParts = spec.orderBy.map(
        ([expr, dir]) => `${this.render(expr)}${dir != null ? ` ${dir}` : ""}`,
      );
      parts.push(`ORDER BY ${orderParts.join(", ")}`);
    }
    return parts.join(" ");
  }

  //#endregion

  //#region ========== 시스템 ==========

  protected subquery(expr: ExprSubquery): string {
    return `(${this.buildSelect(expr.queryDef)})`;
  }

  //#endregion
}
