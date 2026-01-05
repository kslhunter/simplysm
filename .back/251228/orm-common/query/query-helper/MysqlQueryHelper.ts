import { DateOnly, DateTime, Time, Uuid } from "@simplysm/sd-core-common";
import { ColumnPrimitive, InferColumnPrimitive, ColumnPrimitiveStr } from "../../types";
import { QueryUnit, WhereUnit } from "../queryable";
import { BaseQueryHelper, QueryValue, TDateSeparator } from "./BaseQueryHelper";

export class MysqlQueryHelper extends BaseQueryHelper {
  // ============================================
  // WHERE - MySQL은 양쪽 다 컬럼일 때만 NULL-safe equal 연산자 <=> 사용
  // ============================================

  override eq<T extends ColumnPrimitive>(
    a: QueryValue<T>,
    b: QueryValue<T | undefined>,
  ): WhereUnit {
    if (b == null) {
      return this.isNull(a);
    }
    // 양쪽 다 컬럼(QueryUnit)이면 NULL-safe <=> 사용
    if (a instanceof QueryUnit && b instanceof QueryUnit) {
      return new WhereUnit(`${this._toQuery(a)} <=> ${this._toQuery(b)}`);
    }
    // 상수와 비교할 때는 일반 = 사용
    return new WhereUnit(`${this._toQuery(a)} = ${this._toQuery(b)}`);
  }

  // ============================================
  // WHERE - 정규식
  // ============================================

  regexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    return new WhereUnit(`${this._toQuery(src)} REGEXP ${this._toQuery(pattern)}`);
  }

  notRegexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    return this.or(
      this.isNull(src),
      new WhereUnit(`${this._toQuery(src)} NOT REGEXP ${this._toQuery(pattern)}`),
    );
  }

  // ============================================
  // SELECT - 문자열
  // ============================================

  concat(...args: QueryValue<string | number | undefined>[]): QueryUnit<string> {
    const parts = args.map((arg) => this.ifNull(arg, "").query);
    return new QueryUnit<string>("string", `CONCAT(${parts.join(", ")})`);
  }

  length(src: QueryValue<string | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `CHAR_LENGTH(${this._toQuery(src)})`);
  }

  byteLength(src: QueryValue<ColumnPrimitive>): QueryUnit<number> {
    return new QueryUnit<number>("number", `LENGTH(${this._toQuery(src)})`);
  }

  // ============================================
  // SELECT - 날짜
  // ============================================

  isoWeek(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<number> {
    // 기존과 동일: 요일 인덱스 반환 (0=월요일, 6=일요일)
    return new QueryUnit<number>("number", `WEEKDAY(${this._toQuery(src)})`);
  }

  isoWeekStartDate(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly> {
    // 기존과 동일: 해당 주의 월요일
    return new QueryUnit<DateOnly>(
      "dateonly",
      `DATE_SUB(DATE(${this._toQuery(src)}), INTERVAL WEEKDAY(${this._toQuery(src)}) DAY)`,
    );
  }

  isoYearMonth(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly> {
    // 기존과 동일: ISO 주 기준 해당 월의 첫째 날
    // isoWeekStartDate + 3일 후, 해당 월의 1일을 구함
    const baseDate = `DATE_ADD(DATE_SUB(DATE(${this._toQuery(src)}), INTERVAL WEEKDAY(${this._toQuery(src)}) DAY), INTERVAL 3 DAY)`;
    return new QueryUnit<DateOnly>(
      "dateonly",
      `DATE_SUB(${baseDate}, INTERVAL (DAY(${baseDate}) - 1) DAY)`,
    );
  }

  dateDiff<T extends DateTime | DateOnly | Time>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    to: QueryValue<T>,
  ): QueryUnit<number> {
    return new QueryUnit<number>(
      "number",
      `TIMESTAMPDIFF(${separator.toUpperCase()}, ${this._toQuery(from)}, ${this._toQuery(to)})`,
    );
  }

  dateAdd<T extends DateTime | DateOnly | Time | undefined>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    value: QueryValue<number>,
  ): QueryUnit<T> {
    return new QueryUnit<T>(
      "datetime",
      `DATE_ADD(${this._toQuery(from)}, INTERVAL ${this._toQuery(value)} ${separator.toUpperCase()})`,
    );
  }

  formatDate(
    src: QueryValue<DateTime | DateOnly | Time | undefined>,
    format: string,
  ): QueryUnit<string> {
    // JS format → MySQL format
    const mysqlFormat = format
      .replace(/yyyy/g, "%Y")
      .replace(/MM/g, "%m")
      .replace(/dd/g, "%d")
      .replace(/HH/g, "%H")
      .replace(/mm/g, "%i")
      .replace(/ss/g, "%s");
    return new QueryUnit<string>("string", `DATE_FORMAT(${this._toQuery(src)}, '${mysqlFormat}')`);
  }

  // ============================================
  // SELECT - 조건
  // ============================================

  ifNull<T extends ColumnPrimitive>(
    src: QueryValue<T | undefined>,
    replacement: QueryValue<T>,
  ): QueryUnit<T> {
    return new QueryUnit<T>(
      this._getQueryValueTypeStr(replacement),
      `IFNULL(${this._toQuery(src)}, ${this._toQuery(replacement)})`,
    );
  }

  // ============================================
  // SELECT - 기타
  // ============================================

  greatest<T extends ColumnPrimitive>(...args: QueryValue<T>[]): QueryUnit<T> {
    if (args.length === 0) throw new Error("greatest requires at least one argument");
    if (args.length === 1) return args[0] instanceof QueryUnit ? args[0] : this.val(args[0]);

    const type = this._getQueryValueTypeStr(args[0]);
    const parts = args.map((arg) => this._toQuery(arg));
    return new QueryUnit<T>(type, `GREATEST(${parts.join(", ")})`);
  }

  cast<T extends ColumnPrimitiveStr>(
    src: QueryValue<ColumnPrimitive>,
    targetType: T,
  ): QueryUnit<InferColumnPrimitive<T>> {
    return new QueryUnit<InferColumnPrimitive<T>>(
      targetType,
      `CONVERT(${this._toQuery(src)}, ${this._getMysqlType(targetType)})`,
    );
  }

  // ============================================
  // 유틸리티
  // ============================================

  override wrapNames(...names: (string | undefined)[]): string {
    return names
      .filter((n): n is string => n != null)
      .map((n) => `\`${n}\``)
      .join(".");
  }

  // ============================================
  // Protected
  // ============================================

  protected override _convertValueToQuery(value: ColumnPrimitive): string {
    if (typeof value === "string") {
      return `'${this._replaceString(value)}'`;
    } else if (typeof value === "boolean") {
      return value ? "1" : "0";
    } else if (value instanceof DateTime) {
      return `STR_TO_DATE('${value.toFormatString("yyyy-MM-dd HH:mm:ss")}', '%Y-%m-%d %H:%i:%s')`;
    } else if (value instanceof DateOnly) {
      return `STR_TO_DATE('${value.toFormatString("yyyy-MM-dd")}', '%Y-%m-%d')`;
    } else if (value instanceof Time) {
      return `'${value.toFormatString("HH:mm:ss")}'`;
    } else if (value instanceof Uuid) {
      return `'${value.toString().replace(/-/g, "")}'`;
    } else if (Buffer.isBuffer(value)) {
      return `0x${value.toString("hex")}`;
    } else if (value == null) {
      return "NULL";
    } else {
      return value.toString();
    }
  }

  private _replaceString(str: string): string {
    return str.replace(/'/g, "''").replace(/\\/g, "\\\\");
  }

  private _getMysqlType(type: ColumnPrimitiveStr): string {
    switch (type) {
      case "string":
        return "CHAR";
      case "number":
        return "DECIMAL";
      case "boolean":
        return "DECIMAL";
      case "datetime":
        return "DATETIME";
      case "dateonly":
        return "DATE";
      case "time":
        return "TIME";
      default:
        return "CHAR";
    }
  }

  // ============================================
  // PIVOT/UNPIVOT 컬럼 참조 생성
  // ============================================

  getUnpivotValueColumn<T extends ColumnPrimitive>(
    columnName: string,
    type: ColumnPrimitiveStr,
  ): QueryUnit<T> {
    // MySQL LATERAL 서브쿼리 UPVT에서 참조
    return new QueryUnit<T>(type, `${this.wrapNames("UPVT")}.${this.wrapNames(columnName)}`);
  }

  getUnpivotKeyColumn<T extends string>(columnName: string): QueryUnit<T> {
    // MySQL LATERAL 서브쿼리 UPVT에서 참조
    return new QueryUnit<T>("string", `${this.wrapNames("UPVT")}.${this.wrapNames(columnName)}`);
  }

  getPivotInColumn<T extends ColumnPrimitive>(
    key: string,
    valueColumn: QueryUnit<T>,
    forColumn: QueryUnit<ColumnPrimitive>,
    agg: (v: QueryUnit<T>) => QueryUnit<T>,
    defaultValue?: T,
  ): QueryUnit<T> {
    // MySQL CASE WHEN + agg 직접 생성
    const defaultVal = defaultValue != null ? this._convertValueToQuery(defaultValue) : "NULL";
    const caseWhen = new QueryUnit<T>(
      valueColumn.type,
      `CASE WHEN ${forColumn.query} = ${this.val(key).query} THEN ${valueColumn.query} ELSE ${defaultVal} END`,
    );
    // agg 적용: SUM(CASE WHEN ...)
    return agg(caseWhen);
  }

  /**
   * MySQL PIVOT: 변환 없음 (CASE WHEN 에뮬레이션이므로 원본 테이블 alias 유지)
   */
  convertColumnsForPivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>> {
    return columns;
  }

  /**
   * MySQL UNPIVOT: 변환 없음 (LATERAL 서브쿼리이므로 원본 테이블 alias 유지)
   */
  convertColumnsForUnpivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>> {
    return columns;
  }
}
