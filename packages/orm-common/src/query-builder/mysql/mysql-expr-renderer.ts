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
 * MySQL expression renderer
 */
export class MysqlExprRenderer extends ExprRendererBase {
  //#region ========== 유틸리티 (public - QueryBuilder에서도 사용) ==========

  /** 식별자 감싸기 */
  wrap(name: string): string {
    return `\`${name.replace(/`/g, "``")}\``;
  }

  /** SQL 문자열 리터럴용 escape (따옴표 없이 return) */
  escapeString(value: string): string {
    return value
      .replace(/\\/g, "\\\\") // 백슬래시 (최우선)
      .replace(/'/g, "''") // 따옴표
      .replace(/\0/g, "\\0") // NULL 바이트
      .replace(/\n/g, "\\n") // 줄바꿈
      .replace(/\r/g, "\\r") // 캐리지 리턴
      .replace(/\t/g, "\\t"); // 탭
  }

  /** value escape */
  escapeValue(value: unknown): string {
    if (value == null) {
      return "NULL";
    }
    if (typeof value === "string") {
      return `'${this.escapeString(value)}'`;
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }
    if (value instanceof DateTime) {
      return `'${value.toFormatString("yyyy-MM-dd HH:mm:ss")}'`;
    }
    if (value instanceof DateOnly) {
      return `'${value.toFormatString("yyyy-MM-dd")}'`;
    }
    if (value instanceof Time) {
      return `'${value.toFormatString("HH:mm:ss")}'`;
    }
    if (value instanceof Uuid) {
      return `0x${bytesToHex(value.toBytes())}`;
    }
    if (value instanceof Uint8Array) {
      return `0x${bytesToHex(value)}`;
    }
    throw new Error(`Unknown value type: ${typeof value}`);
  }

  /** DataType → SQL type */
  renderDataType(dataType: DataType): string {
    switch (dataType.type) {
      case "int":
        return "INT";
      case "bigint":
        return "BIGINT";
      case "float":
        return "FLOAT";
      case "double":
        return "DOUBLE";
      case "decimal":
        return dataType.scale != null
          ? `DECIMAL(${dataType.precision}, ${dataType.scale})`
          : `DECIMAL(${dataType.precision})`;
      case "varchar":
        return `VARCHAR(${dataType.length})`;
      case "char":
        return `CHAR(${dataType.length})`;
      case "text":
        return "LONGTEXT";
      case "binary":
        return "LONGBLOB";
      case "boolean":
        return "BOOLEAN";
      case "datetime":
        return "DATETIME";
      case "date":
        return "DATE";
      case "time":
        return "TIME";
      case "uuid":
        return "BINARY(16)";
    }
  }

  //#endregion

  //#region ========== value ==========

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

  //#region ========== comparison (null-safe) ==========

  protected eq(expr: ExprEq): string {
    // MySQL: <=> operator (null-safe equal)
    return `${this.render(expr.source)} <=> ${this.render(expr.target)}`;
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
    return "1=1";
  }

  protected null(expr: ExprIsNull): string {
    return `${this.render(expr.arg)} IS NULL`;
  }

  protected like(expr: ExprLike): string {
    // ESCAPE '\' 항상 Add
    return `${this.render(expr.source)} LIKE ${this.render(expr.pattern)} ESCAPE '\\\\'`;
  }

  protected regexp(expr: ExprRegexp): string {
    return `${this.render(expr.source)} REGEXP ${this.render(expr.pattern)}`;
  }

  protected in(expr: ExprIn): string {
    if (expr.values.length === 0) {
      return "1=0"; // 빈 IN은 항상 false
    }
    const values = expr.values.map((v) => this.render(v)).join(", ");
    return `${this.render(expr.source)} IN (${values})`;
  }

  protected inQuery(expr: ExprInQuery): string {
    return `${this.render(expr.source)} IN (${this.buildSelect(expr.query)})`;
  }

  protected exists(expr: ExprExists): string {
    // SELECT 1로 Render
    const subquery = this.buildSelect({
      ...expr.query,
      select: { _: { type: "value", value: 1 } },
    });
    return `EXISTS (${subquery})`;
  }

  //#endregion

  //#region ========== logic ==========

  protected not(expr: ExprNot): string {
    return `NOT (${this.render(expr.arg)})`;
  }

  protected and(expr: ExprAnd): string {
    if (expr.conditions.length === 0) return "1=1";
    return `(${expr.conditions.map((c) => this.render(c)).join(" AND ")})`;
  }

  protected or(expr: ExprOr): string {
    if (expr.conditions.length === 0) return "1=0";
    return `(${expr.conditions.map((c) => this.render(c)).join(" OR ")})`;
  }

  //#endregion

  //#region ========== 문자열 (null Process) ==========

  protected concat(expr: ExprConcat): string {
    // null processing: IFNULL(arg, '')
    const args = expr.args.map((a) => `IFNULL(${this.render(a)}, '')`);
    return `CONCAT(${args.join(", ")})`;
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
    // null processing: IFNULL(arg, '')
    return `CHAR_LENGTH(IFNULL(${this.render(expr.arg)}, ''))`;
  }

  protected byteLength(expr: ExprByteLength): string {
    // null processing: IFNULL(arg, '')
    return `LENGTH(IFNULL(${this.render(expr.arg)}, ''))`;
  }

  protected substring(expr: ExprSubstring): string {
    if (expr.length != null) {
      return `SUBSTRING(${this.render(expr.source)}, ${this.render(expr.start)}, ${this.render(expr.length)})`;
    }
    return `SUBSTRING(${this.render(expr.source)}, ${this.render(expr.start)})`;
  }

  protected indexOf(expr: ExprIndexOf): string {
    return `LOCATE(${this.render(expr.search)}, ${this.render(expr.source)})`;
  }

  //#endregion

  //#region ========== Number ==========

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

  //#region ========== Date ==========

  protected year(expr: ExprYear): string {
    return `YEAR(${this.render(expr.arg)})`;
  }

  protected month(expr: ExprMonth): string {
    return `MONTH(${this.render(expr.arg)})`;
  }

  protected day(expr: ExprDay): string {
    return `DAY(${this.render(expr.arg)})`;
  }

  protected hour(expr: ExprHour): string {
    return `HOUR(${this.render(expr.arg)})`;
  }

  protected minute(expr: ExprMinute): string {
    return `MINUTE(${this.render(expr.arg)})`;
  }

  protected second(expr: ExprSecond): string {
    return `SECOND(${this.render(expr.arg)})`;
  }

  protected isoWeek(expr: ExprIsoWeek): string {
    return `WEEK(${this.render(expr.arg)}, 1)`;
  }

  protected isoWeekStartDate(expr: ExprIsoWeekStartDate): string {
    // ISO 주의 시작일 (월요일)
    return `DATE_SUB(${this.render(expr.arg)}, INTERVAL (WEEKDAY(${this.render(expr.arg)})) DAY)`;
  }

  protected isoYearMonth(expr: ExprIsoYearMonth): string {
    return `DATE_FORMAT(${this.render(expr.arg)}, '%Y%m')`;
  }

  protected dateDiff(expr: ExprDateDiff): string {
    const from = this.render(expr.from);
    const to = this.render(expr.to);
    switch (expr.separator) {
      case "year":
        return `TIMESTAMPDIFF(YEAR, ${from}, ${to})`;
      case "month":
        return `TIMESTAMPDIFF(MONTH, ${from}, ${to})`;
      case "day":
        return `TIMESTAMPDIFF(DAY, ${from}, ${to})`;
      case "hour":
        return `TIMESTAMPDIFF(HOUR, ${from}, ${to})`;
      case "minute":
        return `TIMESTAMPDIFF(MINUTE, ${from}, ${to})`;
      case "second":
        return `TIMESTAMPDIFF(SECOND, ${from}, ${to})`;
    }
  }

  protected dateAdd(expr: ExprDateAdd): string {
    const source = this.render(expr.source);
    const value = this.render(expr.value);
    const unit = this.dateSeparatorToUnit(expr.separator);
    return `DATE_ADD(${source}, INTERVAL ${value} ${unit})`;
  }

  protected formatDate(expr: ExprFormatDate): string {
    // JS format → MySQL format
    const mysqlFormat = this.convertDateFormat(expr.format);
    return `DATE_FORMAT(${this.render(expr.source)}, '${mysqlFormat}')`;
  }

  private dateSeparatorToUnit(sep: DateSeparator): string {
    switch (sep) {
      case "year":
        return "YEAR";
      case "month":
        return "MONTH";
      case "day":
        return "DAY";
      case "hour":
        return "HOUR";
      case "minute":
        return "MINUTE";
      case "second":
        return "SECOND";
    }
  }

  private convertDateFormat(format: string): string {
    // 간단한 Transform (yyyy-MM-dd HH:mm:ss 형식)
    return format
      .replace(/yyyy/g, "%Y")
      .replace(/MM/g, "%m")
      .replace(/dd/g, "%d")
      .replace(/HH/g, "%H")
      .replace(/mm/g, "%i")
      .replace(/ss/g, "%s");
  }

  //#endregion

  //#region ========== condition ==========

  protected ifNull(expr: ExprIfNull): string {
    if (expr.args.length === 0) return "NULL";
    if (expr.args.length === 1) return this.render(expr.args[0]);
    // COALESCE로 Render (여러 value 중 첫 번째 non-null)
    return `COALESCE(${expr.args.map((a) => this.render(a)).join(", ")})`;
  }

  protected nullIf(expr: ExprNullIf): string {
    return `NULLIF(${this.render(expr.source)}, ${this.render(expr.value)})`;
  }

  protected is(expr: ExprIs): string {
    return `(${this.render(expr.condition)})`;
  }

  protected switch(expr: ExprSwitch): string {
    const cases = expr.cases
      .map((c) => `WHEN ${this.render(c.when)} THEN ${this.render(c.then)}`)
      .join(" ");
    return `CASE ${cases} ELSE ${this.render(expr.else)} END`;
  }

  protected if(expr: ExprIf): string {
    const elseVal = expr.else != null ? this.render(expr.else) : "NULL";
    return `IF(${this.render(expr.condition)}, ${this.render(expr.then)}, ${elseVal})`;
  }

  //#endregion

  //#region ========== aggregation ==========

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

  //#region ========== Other ==========

  protected greatest(expr: ExprGreatest): string {
    if (expr.args.length === 0) throw new Error("greatest requires at least one argument.");
    return `GREATEST(${expr.args.map((a) => this.render(a)).join(", ")})`;
  }

  protected least(expr: ExprLeast): string {
    if (expr.args.length === 0) throw new Error("least requires at least one argument.");
    return `LEAST(${expr.args.map((a) => this.render(a)).join(", ")})`;
  }

  protected rowNum(_expr: ExprRowNum): string {
    // MySQL에서는 변수 사용 또는 ROW_NUMBER() Window function 사용
    // 여기서는 ROW_NUMBER()로 구현 (MySQL 8.0+)
    return "ROW_NUMBER() OVER ()";
  }

  protected random(): string {
    return "RAND()";
  }

  protected cast(expr: ExprCast): string {
    return `CAST(${this.render(expr.source)} AS ${this.renderDataType(expr.targetType)})`;
  }

  //#endregion

  //#region ========== Window ==========

  protected window(expr: ExprWindow): string {
    const fn = this.renderWindowFn(expr.fn);
    let over = this.renderWindowSpec(expr.spec);

    // LAST_VALUE는 Basic 프레임이 CURRENT ROW까지만 보므로 전체 프레임 명시 필요
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

  //#region ========== System ==========

  protected subquery(expr: ExprSubquery): string {
    return `(${this.buildSelect(expr.queryDef)})`;
  }

  //#endregion
}
