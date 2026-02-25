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
 * MSSQL expression renderer
 */
export class MssqlExprRenderer extends ExprRendererBase {
  //#region ========== 유틸리티 (public - QueryBuilder에서도 사용) ==========

  /** 식별자 감싸기 */
  wrap(name: string): string {
    return `[${name.replace(/]/g, "]]")}]`;
  }

  /** SQL 문자열 리터럴용 escape (따옴표 없이 return) */
  escapeString(value: string): string {
    return value.replace(/'/g, "''");
  }

  /** value escape */
  escapeValue(value: unknown): string {
    if (value == null) {
      return "NULL";
    }
    if (typeof value === "string") {
      return `N'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (typeof value === "boolean") {
      return value ? "1" : "0";
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
      return `'${value.toString()}'`;
    }
    if (value instanceof Uint8Array) {
      return `0x${bytesToHex(value)}`;
    }
    throw new Error(`알 수 없는 value type: ${typeof value}`);
  }

  /** DataType → SQL type */
  renderDataType(dataType: DataType): string {
    switch (dataType.type) {
      case "int":
        return "INT";
      case "bigint":
        return "BIGINT";
      case "float":
        return "REAL";
      case "double":
        return "FLOAT";
      case "decimal":
        return dataType.scale != null
          ? `DECIMAL(${dataType.precision}, ${dataType.scale})`
          : `DECIMAL(${dataType.precision})`;
      case "varchar":
        return `NVARCHAR(${dataType.length})`;
      case "char":
        return `NCHAR(${dataType.length})`;
      case "text":
        return "NVARCHAR(MAX)";
      case "binary":
        return "VARBINARY(MAX)";
      case "boolean":
        return "BIT";
      case "datetime":
        return "DATETIME2";
      case "date":
        return "DATE";
      case "time":
        return "TIME";
      case "uuid":
        return "UNIQUEIDENTIFIER";
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
    // MSSQL: null-safe equal (OR Pattern)
    const left = this.render(expr.source);
    const right = this.render(expr.target);
    return `((${left} IS NULL AND ${right} IS NULL) OR ${left} = ${right})`;
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
    return `${this.render(expr.source)} LIKE ${this.render(expr.pattern)} ESCAPE '\\'`;
  }

  protected regexp(_expr: ExprRegexp): string {
    // MSSQL은 REGEXP 미지원 - LIKE pattern이나 CLR 사용 필요
    throw new Error("MSSQL은 REGEXP를 네이티브로 지원하지 않습니다.");
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
    // MSSQL 2012+: CONCAT 함수는 NULL을 automatic으로 빈 문자열로 처리
    const args = expr.args.map((a) => this.render(a)).join(", ");
    return `CONCAT(${args})`;
  }

  protected left(expr: ExprLeft): string {
    return `LEFT(${this.render(expr.source)}, ${this.render(expr.length)})`;
  }

  protected right(expr: ExprRight): string {
    return `RIGHT(${this.render(expr.source)}, ${this.render(expr.length)})`;
  }

  protected trim(expr: ExprTrim): string {
    return `RTRIM(LTRIM(${this.render(expr.arg)}))`;
  }

  protected padStart(expr: ExprPadStart): string {
    // MSSQL: RIGHT(REPLICATE(fill, len) + source, len)
    const source = this.render(expr.source);
    const len = this.render(expr.length);
    const fill = this.render(expr.fillString);
    return `RIGHT(REPLICATE(${fill}, ${len}) + ${source}, ${len})`;
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
    // MSSQL: LEN() (null Process)
    return `LEN(ISNULL(${this.render(expr.arg)}, N''))`;
  }

  protected byteLength(expr: ExprByteLength): string {
    // MSSQL: DATALENGTH() (null Process)
    return `DATALENGTH(ISNULL(${this.render(expr.arg)}, N''))`;
  }

  protected substring(expr: ExprSubstring): string {
    if (expr.length != null) {
      return `SUBSTRING(${this.render(expr.source)}, ${this.render(expr.start)}, ${this.render(expr.length)})`;
    }
    // MSSQL: length 없으면 끝까지
    return `SUBSTRING(${this.render(expr.source)}, ${this.render(expr.start)}, LEN(${this.render(expr.source)}))`;
  }

  protected indexOf(expr: ExprIndexOf): string {
    return `CHARINDEX(${this.render(expr.search)}, ${this.render(expr.source)})`;
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
    return `CEILING(${this.render(expr.arg)})`;
  }

  protected floor(expr: ExprFloor): string {
    return `FLOOR(${this.render(expr.arg)})`;
  }

  //#endregion

  //#region ========== 날짜 ==========

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
    return `DATEPART(HOUR, ${this.render(expr.arg)})`;
  }

  protected minute(expr: ExprMinute): string {
    return `DATEPART(MINUTE, ${this.render(expr.arg)})`;
  }

  protected second(expr: ExprSecond): string {
    return `DATEPART(SECOND, ${this.render(expr.arg)})`;
  }

  protected isoWeek(expr: ExprIsoWeek): string {
    const src = this.render(expr.arg);
    return `DATEPART(ISO_WEEK, ${src})`;
  }

  protected isoWeekStartDate(expr: ExprIsoWeekStartDate): string {
    const src = this.render(expr.arg);
    // ISO 주의 시작일 (월요일) - @@DATEFIRST 무관하게 항상 월요일 return
    // 원리: DATEDIFF(DAY, 0, date)는 1900-01-01(월요일)부터의 일수
    // (일수 + 6) % 7 + 1 = 1(월), 2(화), ..., 7(일)
    const weekDay = `((DATEDIFF(DAY, 0, ${src}) + 6) % 7 + 1)`;
    return `DATEADD(DAY, 1 - ${weekDay}, CAST(${src} AS DATE))`;
  }

  protected isoYearMonth(expr: ExprIsoYearMonth): string {
    const src = this.render(expr.arg);
    return `FORMAT(${src}, 'yyyyMM')`;
  }

  protected dateDiff(expr: ExprDateDiff): string {
    const from = this.render(expr.from);
    const to = this.render(expr.to);
    const unit = this.dateSeparatorToUnit(expr.separator);
    return `DATEDIFF(${unit}, ${from}, ${to})`;
  }

  protected dateAdd(expr: ExprDateAdd): string {
    const source = this.render(expr.source);
    const value = this.render(expr.value);
    const unit = this.dateSeparatorToUnit(expr.separator);
    return `DATEADD(${unit}, ${value}, ${source})`;
  }

  protected formatDate(expr: ExprFormatDate): string {
    // JS format → MSSQL FORMAT style
    const mssqlFormat = this.convertDateFormat(expr.format);
    return `FORMAT(${this.render(expr.source)}, '${mssqlFormat}')`;
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
    // MSSQL FORMAT 함수용 (동일한 포맷 사용)
    return format;
  }

  //#endregion

  //#region ========== condition ==========

  protected ifNull(expr: ExprIfNull): string {
    if (expr.args.length === 0) return "NULL";
    if (expr.args.length === 1) return this.render(expr.args[0]);
    // MSSQL: COALESCE
    return `COALESCE(${expr.args.map((a) => this.render(a)).join(", ")})`;
  }

  protected nullIf(expr: ExprNullIf): string {
    return `NULLIF(${this.render(expr.source)}, ${this.render(expr.value)})`;
  }

  protected is(expr: ExprIs): string {
    return `CASE WHEN ${this.render(expr.condition)} THEN 1 ELSE 0 END`;
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

  //#region ========== 기타 ==========

  protected greatest(expr: ExprGreatest): string {
    if (expr.args.length === 0) throw new Error("greatest는 최소 하나의 인자가 필요합니다.");
    if (expr.args.length === 1) return this.render(expr.args[0]);
    // MSSQL 2012+: VALUES + MAX 방식
    const values = expr.args.map((a) => `(${this.render(a)})`).join(", ");
    return `(SELECT MAX(v) FROM (VALUES ${values}) AS t(v))`;
  }

  protected least(expr: ExprLeast): string {
    if (expr.args.length === 0) throw new Error("least는 최소 하나의 인자가 필요합니다.");
    if (expr.args.length === 1) return this.render(expr.args[0]);
    // MSSQL 2012+: VALUES + MIN 방식
    const values = expr.args.map((a) => `(${this.render(a)})`).join(", ");
    return `(SELECT MIN(v) FROM (VALUES ${values}) AS t(v))`;
  }

  protected rowNum(_expr: ExprRowNum): string {
    return "ROW_NUMBER() OVER (ORDER BY (SELECT NULL))";
  }

  protected random(): string {
    return "NEWID()";
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
