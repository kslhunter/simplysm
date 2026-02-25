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
  ExprRandom,
  ExprCast,
  ExprWindow,
  ExprSubquery,
} from "../../types/expr";
import type { SelectQueryDef } from "../../types/query-def";

/**
 * Expr → SQL Render 추상 기본 class
 *
 * Base 원칙:
 * - 100% 모든 dialect가 동일한 로직만 구현 (dispatch)
 * - 조금이라도 다르면 전부 abstract
 * - Method명은 expr.type과 동일 (동적 dispatch 가능)
 */
export abstract class ExprRendererBase {
  constructor(protected buildSelect: (def: SelectQueryDef) => string) {}

  //#region ========== Public Utilities ==========

  /**
   * 식별자 감싸기 (테이블명, 컬럼명 등)
   * MySQL: `name`, MSSQL: [name], PostgreSQL: "name"
   */
  abstract wrap(name: string): string;

  /**
   * SQL 문자열 리터럴용 escape
   * 동적 SQL이나 시스템 query에서 문자열 값으로 사용될 때 호출
   * 예: WHERE schema_name = 'escaped_value'
   */
  abstract escapeString(value: string): string;

  /**
   * value escape (타입에 따라 적절한 SQL 리터럴로 Transform)
   */
  abstract escapeValue(value: unknown): string;

  //#endregion

  //#region ========== Dispatch (100% 동일) ==========

  render(expr: Expr | WhereExpr): string {
    const method = this[expr.type as keyof this];
    if (typeof method !== "function") {
      throw new Error(`알 수 없는 Expr type: ${expr.type}`);
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

  //#region ========== Abstract - 문자열 (null 처리 required) ==========

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

  //#region ========== Abstract - 숫자 ==========

  protected abstract abs(expr: ExprAbs): string;
  protected abstract round(expr: ExprRound): string;
  protected abstract ceil(expr: ExprCeil): string;
  protected abstract floor(expr: ExprFloor): string;

  //#endregion

  //#region ========== Abstract - 날짜 ==========

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

  protected abstract ifNull(expr: ExprIfNull): string;
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

  //#region ========== Abstract - 기타 ==========

  protected abstract greatest(expr: ExprGreatest): string;
  protected abstract least(expr: ExprLeast): string;
  protected abstract rowNum(expr: ExprRowNum): string;
  protected abstract random(expr: ExprRandom): string;
  protected abstract cast(expr: ExprCast): string;

  //#endregion

  //#region ========== Abstract - 윈도우 ==========

  protected abstract window(expr: ExprWindow): string;

  //#endregion

  //#region ========== Abstract - 시스템 ==========

  protected abstract subquery(expr: ExprSubquery): string;

  //#endregion
}
