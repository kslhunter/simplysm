import { DateOnly, DateTime, Time, Uuid } from "@simplysm/sd-core-common";
import { ColumnPrimitive, InferColumnPrimitive, ColumnPrimitiveStr } from "../../types";
import { QueryUnit, WhereUnit } from "../queryable";
import { BaseQueryHelper, QueryValue, TDateSeparator } from "./BaseQueryHelper";

export class MssqlQueryHelper extends BaseQueryHelper {
  // ============================================
  // WHERE - MSSQL은 NULL-safe equal이 없어서 양쪽 다 QueryUnit이면 추가 처리
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
  // WHERE - 정규식 (MSSQL은 LIKE 기반으로 제한적 지원)
  // ============================================

  regexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    // MSSQL에서는 정규식을 직접 지원하지 않음. LIKE + PATINDEX로 일부 흉내만 가능
    // 정확한 정규식이 필요하면 CLR 함수 필요
    return new WhereUnit(`PATINDEX(${this._toQuery(pattern)}, ${this._toQuery(src)}) > 0`);
  }

  notRegexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    return this.or(
      this.isNull(src),
      new WhereUnit(`PATINDEX(${this._toQuery(pattern)}, ${this._toQuery(src)}) = 0`),
    );
  }

  // ============================================
  // SELECT - 문자열
  // ============================================

  concat(...args: QueryValue<string | number | undefined>[]): QueryUnit<string> {
    const parts = args.map((arg) => this.ifNull(arg, "").query);
    return new QueryUnit<string>("string", parts.join(" + "));
  }

  length(src: QueryValue<string | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `LEN(${this._toQuery(src)})`);
  }

  byteLength(src: QueryValue<ColumnPrimitive>): QueryUnit<number> {
    return new QueryUnit<number>("number", `DATALENGTH(${this._toQuery(src)})`);
  }

  // ============================================
  // SELECT - 날짜
  // ============================================

  override hour(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `DATEPART(HOUR, ${this._toQuery(src)})`);
  }

  override minute(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `DATEPART(MINUTE, ${this._toQuery(src)})`);
  }

  override second(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `DATEPART(SECOND, ${this._toQuery(src)})`);
  }

  isoWeek(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<number> {
    // 기존과 동일: 요일 인덱스 반환 (1=월요일, 7=일요일)
    return new QueryUnit<number>(
      "number",
      `((DATEPART(WEEKDAY, ${this._toQuery(src)}) + @@DATEFIRST - 2) % 7 + 1)`,
    );
  }

  isoWeekStartDate(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly> {
    // 기존과 동일: 해당 주의 월요일
    const weekDay = `((DATEPART(WEEKDAY, ${this._toQuery(src)}) + @@DATEFIRST - 2) % 7 + 1)`;
    return new QueryUnit<DateOnly>(
      "dateonly",
      `DATEADD(DAY, -(${weekDay} - 1), CAST(${this._toQuery(src)} AS DATE))`,
    );
  }

  isoYearMonth(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly> {
    // 기존과 동일: ISO 주 기준 해당 월의 첫째 날
    const weekDay = `((DATEPART(WEEKDAY, ${this._toQuery(src)}) + @@DATEFIRST - 2) % 7 + 1)`;
    const weekStartDate = `DATEADD(DAY, -(${weekDay} - 1), CAST(${this._toQuery(src)} AS DATE))`;
    const baseDate = `DATEADD(DAY, 3, ${weekStartDate})`;
    return new QueryUnit<DateOnly>(
      "dateonly",
      `DATEADD(DAY, 1 - DAY(${baseDate}), ${baseDate})`,
    );
  }

  dateDiff<T extends DateTime | DateOnly | Time>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    to: QueryValue<T>,
  ): QueryUnit<number> {
    return new QueryUnit<number>(
      "number",
      `DATEDIFF(${separator}, ${this._toQuery(from)}, ${this._toQuery(to)})`,
    );
  }

  dateAdd<T extends DateTime | DateOnly | Time | undefined>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    value: QueryValue<number>,
  ): QueryUnit<T> {
    return new QueryUnit<T>(
      "datetime",
      `DATEADD(${separator}, ${this._toQuery(value)}, ${this._toQuery(from)})`,
    );
  }

  formatDate(
    src: QueryValue<DateTime | DateOnly | Time | undefined>,
    format: string,
  ): QueryUnit<string> {
    // JS format → MSSQL FORMAT style
    // MSSQL 2012+에서 FORMAT 함수 사용
    const mssqlFormat = format
      .replace(/yyyy/g, "yyyy")
      .replace(/MM/g, "MM")
      .replace(/dd/g, "dd")
      .replace(/HH/g, "HH")
      .replace(/mm/g, "mm")
      .replace(/ss/g, "ss");
    return new QueryUnit<string>("string", `FORMAT(${this._toQuery(src)}, '${mssqlFormat}')`);
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
      `ISNULL(${this._toQuery(src)}, ${this._toQuery(replacement)})`,
    );
  }

  // ============================================
  // SELECT - 기타
  // ============================================

  greatest<T extends ColumnPrimitive>(...args: QueryValue<T>[]): QueryUnit<T> {
    if (args.length === 0) throw new Error("greatest requires at least one argument");
    if (args.length === 1) return args[0] instanceof QueryUnit ? args[0] : this.val(args[0]);

    // MSSQL 2012+: VALUES + MAX 방식
    const type = this._getQueryValueTypeStr(args[0]);
    const values = args.map((arg) => `(${this._toQuery(arg)})`).join(", ");
    return new QueryUnit<T>(type, `(SELECT MAX(v) FROM (VALUES ${values}) AS t(v))`);
  }

  cast<T extends ColumnPrimitiveStr>(
    src: QueryValue<ColumnPrimitive>,
    targetType: T,
  ): QueryUnit<InferColumnPrimitive<T>> {
    return new QueryUnit<InferColumnPrimitive<T>>(
      targetType,
      `CONVERT(${this._getMssqlType(targetType)}, ${this._toQuery(src)})`,
    );
  }

  // ============================================
  // 유틸리티
  // ============================================

  override wrapNames(...names: (string | undefined)[]): string {
    // database.schema.table 형태 (3개 인자)에서 schema가 없으면 dbo 사용
    if (names.length === 3 && names[0] != null && names[1] == null) {
      names[1] = "dbo";
    }
    return names
      .filter((n): n is string => n != null)
      .map((n) => `[${n}]`)
      .join(".");
  }

  // ============================================
  // Protected
  // ============================================

  protected override _convertValueToQuery(value: ColumnPrimitive): string {
    if (typeof value === "string") {
      return `N'${this._replaceString(value)}'`;
    } else if (typeof value === "boolean") {
      return value ? "1" : "0";
    } else if (value instanceof DateTime) {
      return `'${value.toFormatString("yyyy-MM-dd HH:mm:ss.fff")}'`;
    } else if (value instanceof DateOnly) {
      return `'${value.toFormatString("yyyy-MM-dd")}'`;
    } else if (value instanceof Time) {
      return `'${value.toFormatString("HH:mm:ss")}'`;
    } else if (value instanceof Uuid) {
      return `'${value.toString()}'`;
    } else if (Buffer.isBuffer(value)) {
      return `0x${value.toString("hex")}`;
    } else if (value == null) {
      return "NULL";
    } else {
      return value.toString();
    }
  }

  private _replaceString(str: string): string {
    return str.replace(/'/g, "''");
  }

  private _getMssqlType(type: ColumnPrimitiveStr): string {
    switch (type) {
      case "string":
        return "NVARCHAR(255)";
      case "number":
        return "BIGINT";
      case "boolean":
        return "BIT";
      case "datetime":
        return "DATETIME2";
      case "dateonly":
        return "DATE";
      case "time":
        return "TIME";
      default:
        return "NVARCHAR(255)";
    }
  }

  // ============================================
  // PIVOT/UNPIVOT 컬럼 참조 생성
  // ============================================

  getUnpivotValueColumn<T extends ColumnPrimitive>(
    columnName: string,
    type: ColumnPrimitiveStr,
  ): QueryUnit<T> {
    // MSSQL 네이티브 UNPIVOT: UPVT 별칭으로 참조
    return new QueryUnit<T>(type, `${this.wrapNames("UPVT")}.${this.wrapNames(columnName)}`);
  }

  getUnpivotKeyColumn<T extends string>(columnName: string): QueryUnit<T> {
    // MSSQL 네이티브 UNPIVOT: UPVT 별칭으로 참조
    return new QueryUnit<T>("string", `${this.wrapNames("UPVT")}.${this.wrapNames(columnName)}`);
  }

  getPivotInColumn<T extends ColumnPrimitive>(
    key: string,
    valueColumn: QueryUnit<T>,
    forColumn: QueryUnit<ColumnPrimitive>,
    agg: (v: QueryUnit<T>) => QueryUnit<T>,
    defaultValue?: T,
  ): QueryUnit<T> {
    // MSSQL 네이티브 PIVOT: SELECT에서 [PVT].[key] 형태로 참조
    // agg는 PIVOT 구문 내부에서 처리됨 (QueryBuilder에서)
    const pivotColumn = new QueryUnit<T>(valueColumn.type, `[PVT].${this.wrapNames(key)}`);

    // default 값이 지정된 경우 ifNull로 래핑
    if (defaultValue != null) {
      return this.ifNull(pivotColumn, defaultValue);
    }

    return pivotColumn;
  }

  /**
   * MSSQL PIVOT: 원본 컬럼들의 [TBL] → [PVT] 변환
   * MSSQL 네이티브 PIVOT 후에는 모든 컬럼이 PIVOT 별칭으로 접근됨
   */
  convertColumnsForPivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>> {
    const newColumns: Record<string, QueryUnit<ColumnPrimitive>> = {};
    for (const [key, unit] of Object.entries(columns)) {
      // [TBL]. → [PVT]. 변환
      const newQuery = unit.query.replace(/\[TBL\]\./g, "[PVT].");
      newColumns[key] = new QueryUnit(unit.type, newQuery);
    }
    return newColumns;
  }

  /**
   * MSSQL UNPIVOT: 원본 컬럼들의 [TBL] → [UPVT] 변환
   * MSSQL 네이티브 UNPIVOT 후에는 모든 컬럼이 UNPIVOT 별칭으로 접근됨
   */
  convertColumnsForUnpivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>> {
    const newColumns: Record<string, QueryUnit<ColumnPrimitive>> = {};
    for (const [key, unit] of Object.entries(columns)) {
      // [TBL]. → [UPVT]. 변환
      const newQuery = unit.query.replace(/\[TBL\]\./g, "[UPVT].");
      newColumns[key] = new QueryUnit(unit.type, newQuery);
    }
    return newColumns;
  }
}
