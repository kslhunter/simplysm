import type {
  Expr,
  WhereExpr,
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
  ExprCoalesce,
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
  ExprRandom,
  ExprCast,
  ExprWindow,
  ExprSubquery,
} from "../../types/expr";
import type { SelectQueryDef } from "../../types/query-def";

/**
 * Expr → SQL Render abstract base class
 *
 * Base principles:
 * - Implement only 100% identical logic across all dialects (dispatch)
 * - If different at all, make it abstract
 * - Method names match expr.type (enables dynamic dispatch)
 */
export abstract class ExprRendererBase {
  constructor(protected buildSelect: (def: SelectQueryDef) => string) {}

  //#region ========== Public Utilities ==========

  /**
   * Wrap identifier (table name, column name, etc.)
   * MySQL: `name`, MSSQL: [name], PostgreSQL: "name"
   */
  abstract wrap(name: string): string;

  /**
   * Escape for SQL string literals
   * Called when used as a string value in dynamic SQL or system queries
   * e.g.: WHERE schema_name = 'escaped_value'
   */
  abstract escapeString(value: string): string;

  /**
   * Value escape (transform to appropriate SQL literal based on type)
   */
  abstract escapeValue(value: unknown): string;

  //#endregion

  //#region ========== Dispatch (100% identical) ==========

  render(expr: Expr | WhereExpr): string {
    const method = this[expr.type as keyof this];
    if (typeof method !== "function") {
      throw new Error(`Unknown Expr type: ${expr.type}`);
    }
    return (method as (e: Expr | WhereExpr) => string).call(this, expr);
  }

  renderWhere(exprs: WhereExpr[]): string {
    if (exprs.length === 0) return "";
    return exprs.map((e) => this.render(e)).join(" AND ");
  }

  //#endregion

  //#region ========== Abstract - Value ==========

  protected abstract column(expr: ExprColumn): string;
  protected abstract value(expr: ExprValue): string;
  protected abstract raw(expr: ExprRaw): string;

  //#endregion

  //#region ========== Abstract - comparison (null-safe required) ==========

  protected abstract eq(expr: ExprEq): string;
  protected abstract gt(expr: ExprGt): string;
  protected abstract lt(expr: ExprLt): string;
  protected abstract gte(expr: ExprGte): string;
  protected abstract lte(expr: ExprLte): string;
  protected abstract between(expr: ExprBetween): string;
  protected abstract null(expr: ExprIsNull): string;
  protected abstract like(expr: ExprLike): string;
  protected abstract regexp(expr: ExprRegexp): string;
  protected abstract in(expr: ExprIn): string;
  protected abstract inQuery(expr: ExprInQuery): string;
  protected abstract exists(expr: ExprExists): string;

  //#endregion

  //#region ========== Abstract - logic ==========

  protected abstract not(expr: ExprNot): string;
  protected abstract and(expr: ExprAnd): string;
  protected abstract or(expr: ExprOr): string;

  //#endregion

  //#region ========== Abstract - String (null processing required) ==========

  protected abstract concat(expr: ExprConcat): string;
  protected abstract left(expr: ExprLeft): string;
  protected abstract right(expr: ExprRight): string;
  protected abstract trim(expr: ExprTrim): string;
  protected abstract padStart(expr: ExprPadStart): string;
  protected abstract replace(expr: ExprReplace): string;
  protected abstract upper(expr: ExprUpper): string;
  protected abstract lower(expr: ExprLower): string;
  protected abstract length(expr: ExprLength): string;
  protected abstract byteLength(expr: ExprByteLength): string;
  protected abstract substring(expr: ExprSubstring): string;
  protected abstract indexOf(expr: ExprIndexOf): string;

  //#endregion

  //#region ========== Abstract - Number ==========

  protected abstract abs(expr: ExprAbs): string;
  protected abstract round(expr: ExprRound): string;
  protected abstract ceil(expr: ExprCeil): string;
  protected abstract floor(expr: ExprFloor): string;

  //#endregion

  //#region ========== Abstract - Date ==========

  protected abstract year(expr: ExprYear): string;
  protected abstract month(expr: ExprMonth): string;
  protected abstract day(expr: ExprDay): string;
  protected abstract hour(expr: ExprHour): string;
  protected abstract minute(expr: ExprMinute): string;
  protected abstract second(expr: ExprSecond): string;
  protected abstract isoWeek(expr: ExprIsoWeek): string;
  protected abstract isoWeekStartDate(expr: ExprIsoWeekStartDate): string;
  protected abstract isoYearMonth(expr: ExprIsoYearMonth): string;
  protected abstract dateDiff(expr: ExprDateDiff): string;
  protected abstract dateAdd(expr: ExprDateAdd): string;
  protected abstract formatDate(expr: ExprFormatDate): string;

  //#endregion

  //#region ========== Abstract - Condition ==========

  protected abstract coalesce(expr: ExprCoalesce): string;
  protected abstract nullIf(expr: ExprNullIf): string;
  protected abstract is(expr: ExprIs): string;
  protected abstract switch(expr: ExprSwitch): string;
  protected abstract if(expr: ExprIf): string;

  //#endregion

  //#region ========== Abstract - Aggregate ==========

  protected abstract count(expr: ExprCount): string;
  protected abstract sum(expr: ExprSum): string;
  protected abstract avg(expr: ExprAvg): string;
  protected abstract max(expr: ExprMax): string;
  protected abstract min(expr: ExprMin): string;

  //#endregion

  //#region ========== Abstract - Other ==========

  protected abstract greatest(expr: ExprGreatest): string;
  protected abstract least(expr: ExprLeast): string;
  protected abstract rowNum(expr: ExprRowNum): string;
  protected abstract random(expr: ExprRandom): string;
  protected abstract cast(expr: ExprCast): string;

  //#endregion

  //#region ========== Abstract - Window ==========

  protected abstract window(expr: ExprWindow): string;

  //#endregion

  //#region ========== Abstract - System ==========

  protected abstract subquery(expr: ExprSubquery): string;

  //#endregion
}
