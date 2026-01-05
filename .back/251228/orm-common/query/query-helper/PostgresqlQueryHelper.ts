import { DateOnly, DateTime, Time, Uuid } from "@simplysm/sd-core-common";
import { ColumnPrimitive, ColumnPrimitiveStr, InferColumnPrimitive } from "../../types";
import { QueryUnit, WhereUnit } from "../queryable";
import { BaseQueryHelper, QueryValue, TDateSeparator } from "./BaseQueryHelper";

export class PostgresqlQueryHelper extends BaseQueryHelper {
  // ============================================
  // WHERE - PostgreSQL NULL-safe 비교
  // ============================================

  override eq<T extends ColumnPrimitive>(
    a: QueryValue<T>,
    b: QueryValue<T | undefined>,
  ): WhereUnit {
    if (b == null) {
      return this.isNull(a);
    }
    // 양쪽 다 컬럼(QueryUnit)이면 NULL-safe 처리
    if (a instanceof QueryUnit && b instanceof QueryUnit) {
      return this.or(
        this.and(this.isNull(a), this.isNull(b)),
        new WhereUnit(`${this._toQuery(a)} = ${this._toQuery(b)}`),
      );
    }
    return new WhereUnit(`${this._toQuery(a)} = ${this._toQuery(b)}`);
  }

  override notEq<T extends ColumnPrimitive>(
    a: QueryValue<T>,
    b: QueryValue<T | undefined>,
  ): WhereUnit {
    if (b == null) {
      return this.isNotNull(a);
    }
    if (a instanceof QueryUnit && b instanceof QueryUnit) {
      return this.or(
        this.and(this.isNull(a), this.isNotNull(b)),
        this.and(this.isNotNull(a), this.isNull(b)),
        new WhereUnit(`${this._toQuery(a)} <> ${this._toQuery(b)}`),
      );
    }
    return this.or(this.isNull(a), new WhereUnit(`${this._toQuery(a)} <> ${this._toQuery(b)}`));
  }

  // ============================================
  // WHERE - 정규식
  // ============================================

  regexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    return new WhereUnit(`${this._toQuery(src)} ~ ${this._toQuery(pattern)}`);
  }

  notRegexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    return this.or(
      this.isNull(src),
      new WhereUnit(`${this._toQuery(src)} !~ ${this._toQuery(pattern)}`),
    );
  }

  // ============================================
  // SELECT - 문자열
  // ============================================

  concat(...args: QueryValue<string | number | undefined>[]): QueryUnit<string> {
    const parts = args.map((arg) => this.ifNull(arg, "").query);
    return new QueryUnit<string>("string", parts.join(" || "));
  }

  length(src: QueryValue<string | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `LENGTH(${this._toQuery(src)})`);
  }

  byteLength(src: QueryValue<ColumnPrimitive>): QueryUnit<number> {
    return new QueryUnit<number>("number", `OCTET_LENGTH(${this._toQuery(src)})`);
  }

  // ============================================
  // SELECT - 날짜
  // ============================================

  override hour(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `EXTRACT(HOUR FROM ${this._toQuery(src)})`);
  }

  override minute(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `EXTRACT(MINUTE FROM ${this._toQuery(src)})`);
  }

  override second(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `EXTRACT(SECOND FROM ${this._toQuery(src)})`);
  }

  isoWeek(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<number> {
    // 요일 인덱스 반환 (0=월요일, 6=일요일) - MySQL WEEKDAY와 동일
    // ISODOW: 1=월요일, 7=일요일 → -1 하면 0=월요일, 6=일요일
    return new QueryUnit<number>("number", `(EXTRACT(ISODOW FROM ${this._toQuery(src)}) - 1)`);
  }

  isoWeekStartDate(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly> {
    // 해당 주의 월요일
    return new QueryUnit<DateOnly>(
      "dateonly",
      `(${this._toQuery(src)}::DATE - (EXTRACT(ISODOW FROM ${this._toQuery(src)}) - 1) * INTERVAL '1 day')::DATE`,
    );
  }

  isoYearMonth(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly> {
    // ISO 주 기준 해당 월의 첫째 날
    const weekStartDate = `(${this._toQuery(src)}::DATE - (EXTRACT(ISODOW FROM ${this._toQuery(src)}) - 1) * INTERVAL '1 day')::DATE`;
    const baseDate = `(${weekStartDate} + INTERVAL '3 day')::DATE`;
    return new QueryUnit<DateOnly>("dateonly", `DATE_TRUNC('month', ${baseDate})::DATE`);
  }

  dateDiff<T extends DateTime | DateOnly | Time>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    to: QueryValue<T>,
  ): QueryUnit<number> {
    // PostgreSQL은 EXTRACT + EPOCH 사용
    return new QueryUnit<number>(
      "number",
      `EXTRACT(${separator.toUpperCase()} FROM (${this._toQuery(to)} - ${this._toQuery(from)}))`,
    );
  }

  dateAdd<T extends DateTime | DateOnly | Time | undefined>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    value: QueryValue<number>,
  ): QueryUnit<T> {
    return new QueryUnit<T>(
      "datetime",
      `(${this._toQuery(from)} + INTERVAL '1 ${separator}' * ${this._toQuery(value)})`,
    );
  }

  formatDate(
    src: QueryValue<DateTime | DateOnly | Time | undefined>,
    format: string,
  ): QueryUnit<string> {
    // JS format → PostgreSQL TO_CHAR format
    const pgFormat = format
      .replace(/yyyy/g, "YYYY")
      .replace(/MM/g, "MM")
      .replace(/dd/g, "DD")
      .replace(/HH/g, "HH24")
      .replace(/mm/g, "MI")
      .replace(/ss/g, "SS");
    return new QueryUnit<string>("string", `TO_CHAR(${this._toQuery(src)}, '${pgFormat}')`);
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
      `COALESCE(${this._toQuery(src)}, ${this._toQuery(replacement)})`,
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
      `CAST(${this._toQuery(src)} AS ${this._getPostgresType(targetType)})`,
    );
  }

  // ============================================
  // 유틸리티
  // ============================================

  override wrapNames(...names: (string | undefined)[]): string {
    // database.schema.table 형태 (3개 인자)에서 schema가 없으면 public 사용
    if (names.length === 3 && names[0] != null && names[1] == null) {
      names[1] = "public";
    }
    return names
      .filter((n): n is string => n != null)
      .map((n) => `"${n}"`)
      .join(".");
  }

  // ============================================
  // Protected
  // ============================================

  protected override _convertValueToQuery(value: ColumnPrimitive): string {
    if (typeof value === "string") {
      return `'${this._replaceString(value)}'`;
    } else if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    } else if (value instanceof DateTime) {
      return `'${value.toFormatString("yyyy-MM-dd HH:mm:ss.fff")}'`;
    } else if (value instanceof DateOnly) {
      return `'${value.toFormatString("yyyy-MM-dd")}'`;
    } else if (value instanceof Time) {
      return `'${value.toFormatString("HH:mm:ss")}'`;
    } else if (value instanceof Uuid) {
      return `'${value.toString()}'`;
    } else if (Buffer.isBuffer(value)) {
      return `'\\x${value.toString("hex")}'`;
    } else if (value == null) {
      return "NULL";
    } else {
      return value.toString();
    }
  }

  private _replaceString(str: string): string {
    return str.replace(/'/g, "''");
  }

  private _getPostgresType(type: ColumnPrimitiveStr): string {
    switch (type) {
      case "string":
        return "VARCHAR";
      case "number":
        return "BIGINT";
      case "boolean":
        return "BOOLEAN";
      case "datetime":
        return "TIMESTAMP";
      case "dateonly":
        return "DATE";
      case "time":
        return "TIME";
      default:
        return "VARCHAR";
    }
  }

  // ============================================
  // PIVOT/UNPIVOT 컬럼 참조 생성
  // ============================================

  getUnpivotValueColumn<T extends ColumnPrimitive>(
    columnName: string,
    type: ColumnPrimitiveStr,
  ): QueryUnit<T> {
    // PostgreSQL LATERAL VALUES 서브쿼리 UPVT에서 참조
    return new QueryUnit<T>(type, `${this.wrapNames("UPVT")}.${this.wrapNames(columnName)}`);
  }

  getUnpivotKeyColumn<T extends string>(columnName: string): QueryUnit<T> {
    // PostgreSQL LATERAL VALUES 서브쿼리 UPVT에서 참조
    return new QueryUnit<T>("string", `${this.wrapNames("UPVT")}.${this.wrapNames(columnName)}`);
  }

  getPivotInColumn<T extends ColumnPrimitive>(
    key: string,
    valueColumn: QueryUnit<T>,
    forColumn: QueryUnit<ColumnPrimitive>,
    agg: (v: QueryUnit<T>) => QueryUnit<T>,
    defaultValue?: T,
  ): QueryUnit<T> {
    // PostgreSQL CASE WHEN + agg 직접 생성 (MySQL과 동일)
    const defaultVal = defaultValue != null ? this._convertValueToQuery(defaultValue) : "NULL";
    const caseWhen = new QueryUnit<T>(
      valueColumn.type,
      `CASE WHEN ${forColumn.query} = ${this.val(key).query} THEN ${valueColumn.query} ELSE ${defaultVal} END`,
    );
    return agg(caseWhen);
  }

  /**
   * PostgreSQL PIVOT: 변환 없음 (CASE WHEN 에뮬레이션이므로 원본 테이블 alias 유지)
   */
  convertColumnsForPivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>> {
    return columns;
  }

  /**
   * PostgreSQL UNPIVOT: 변환 없음 (LATERAL VALUES이므로 원본 테이블 alias 유지)
   */
  convertColumnsForUnpivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>> {
    return columns;
  }
}
