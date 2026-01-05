import { DateOnly, DateTime, Time, Uuid } from "@simplysm/sd-core-common";
import { ColumnPrimitive, ColumnPrimitiveStr, InferColumnPrimitive } from "../../types";
import { QueryUnit, WhereUnit } from "../queryable";

// QueryUnit 또는 직접 값
export type QueryValue<T> = QueryUnit<T> | T;

// 날짜 연산 단위
export type TDateSeparator = "year" | "month" | "day" | "hour" | "minute" | "second";

// SWITCH CASE 빌더
export interface SwitchBuilder<T extends ColumnPrimitive> {
  case(condition: WhereUnit, then: QueryValue<T>): SwitchBuilder<T>;
  default(then: QueryValue<T>): QueryUnit<T>;
}

export abstract class BaseQueryHelper {
  // ============================================
  // 값 생성
  // ============================================

  col<T extends ColumnPrimitiveStr>(
    type: T,
    ...chain: (string | undefined)[]
  ): QueryUnit<InferColumnPrimitive<T>> {
    return new QueryUnit<InferColumnPrimitive<T>>(type, this.wrapNames(...chain));
  }

  val<T extends ColumnPrimitive>(val: T): QueryUnit<T> {
    return new QueryUnit<T>(this._getTypeStr(val), this._convertValueToQuery(val));
  }

  raw<T extends ColumnPrimitiveStr>(type: T, query: string): QueryUnit<InferColumnPrimitive<T>> {
    return new QueryUnit<InferColumnPrimitive<T>>(type, query);
  }

  sql<T extends ColumnPrimitiveStr>(type: T) {
    return (
      strings: TemplateStringsArray,
      ...values: QueryValue<ColumnPrimitive>[]
    ): QueryUnit<InferColumnPrimitive<T>> => {
      let query = strings[0];
      for (let i = 0; i < values.length; i++) {
        query += this._toQuery(values[i]);
        query += strings[i + 1];
      }
      return new QueryUnit<InferColumnPrimitive<T>>(type, query);
    };
  }

  // ============================================
  // WHERE - 비교 연산
  // ============================================

  eq<T extends ColumnPrimitive>(a: QueryValue<T>, b: QueryValue<T | undefined>): WhereUnit {
    // null 체크
    if (b == null) {
      return this.isNull(a);
    }
    return new WhereUnit(`${this._toQuery(a)} = ${this._toQuery(b)}`);
  }

  notEq<T extends ColumnPrimitive>(a: QueryValue<T>, b: QueryValue<T | undefined>): WhereUnit {
    // null 체크
    if (b == null) {
      return this.isNotNull(a);
    }
    return new WhereUnit(`${this._toQuery(a)} <> ${this._toQuery(b)}`);
  }

  gt<T extends ColumnPrimitive>(a: QueryValue<T>, b: QueryValue<T>): WhereUnit {
    return new WhereUnit(`${this._toQuery(a)} > ${this._toQuery(b)}`);
  }

  lt<T extends ColumnPrimitive>(a: QueryValue<T>, b: QueryValue<T>): WhereUnit {
    return new WhereUnit(`${this._toQuery(a)} < ${this._toQuery(b)}`);
  }

  gte<T extends ColumnPrimitive>(a: QueryValue<T>, b: QueryValue<T>): WhereUnit {
    return new WhereUnit(`${this._toQuery(a)} >= ${this._toQuery(b)}`);
  }

  lte<T extends ColumnPrimitive>(a: QueryValue<T>, b: QueryValue<T>): WhereUnit {
    return new WhereUnit(`${this._toQuery(a)} <= ${this._toQuery(b)}`);
  }

  between<T extends ColumnPrimitive>(
    src: QueryValue<T>,
    from: QueryValue<T> | undefined,
    to: QueryValue<T> | undefined,
  ): WhereUnit {
    // from, to 둘 다 있으면 BETWEEN 사용
    if (from != null && to != null) {
      return new WhereUnit(
        `${this._toQuery(src)} BETWEEN ${this._toQuery(from)} AND ${this._toQuery(to)}`,
      );
    }
    // 한쪽만 있으면 기존 방식
    const conditions: WhereUnit[] = [];
    if (from != null) {
      conditions.push(this.gte(src, from));
    }
    if (to != null) {
      conditions.push(this.lte(src, to));
    }
    if (conditions.length === 0) {
      return new WhereUnit("1 = 1");
    }
    return this.and(...conditions);
  }

  // ============================================
  // WHERE - NULL 체크
  // ============================================

  isNull<T extends ColumnPrimitive>(a: QueryValue<T>): WhereUnit {
    return new WhereUnit(`${this._toQuery(a)} IS NULL`);
  }

  isNotNull<T extends ColumnPrimitive>(a: QueryValue<T>): WhereUnit {
    return new WhereUnit(`${this._toQuery(a)} IS NOT NULL`);
  }

  // ============================================
  // WHERE - Boolean 체크
  // ============================================

  isTrue(a: QueryValue<boolean | undefined>): WhereUnit {
    return this.and(this.isNotNull(a), this.eq(a, true));
  }

  isNotTrue(a: QueryValue<boolean | undefined>): WhereUnit {
    return this.or(this.isNull(a), this.eq(a, false));
  }

  // ============================================
  // WHERE - 문자열 검색
  // ============================================

  like(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    return new WhereUnit(`${this._toQuery(src)} LIKE ${this._toQuery(pattern)}`);
  }

  notLike(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit {
    return this.or(
      this.isNull(src),
      new WhereUnit(`${this._toQuery(src)} NOT LIKE ${this._toQuery(pattern)}`),
    );
  }

  includes(src: QueryValue<string | undefined>, search: QueryValue<string>): WhereUnit {
    // search가 상수 문자열이면 직접 패턴 생성
    if (typeof search === "string") {
      return this.like(src, `%${search}%`);
    }
    const pattern = this.concat("%", search, "%");
    return new WhereUnit(`${this._toQuery(src)} LIKE ${pattern.query}`);
  }

  notIncludes(src: QueryValue<string | undefined>, search: QueryValue<string>): WhereUnit {
    // search가 상수 문자열이면 직접 패턴 생성
    if (typeof search === "string") {
      return this.notLike(src, `%${search}%`);
    }
    const pattern = this.concat("%", search, "%");
    return this.or(
      this.isNull(src),
      new WhereUnit(`${this._toQuery(src)} NOT LIKE ${pattern.query}`),
    );
  }

  startsWith(src: QueryValue<string | undefined>, search: QueryValue<string>): WhereUnit {
    // search가 상수 문자열이면 직접 패턴 생성
    if (typeof search === "string") {
      return this.like(src, `${search}%`);
    }
    const pattern = this.concat(search, "%");
    return new WhereUnit(`${this._toQuery(src)} LIKE ${pattern.query}`);
  }

  notStartsWith(src: QueryValue<string | undefined>, search: QueryValue<string>): WhereUnit {
    // search가 상수 문자열이면 직접 패턴 생성
    if (typeof search === "string") {
      return this.notLike(src, `${search}%`);
    }
    const pattern = this.concat(search, "%");
    return this.or(
      this.isNull(src),
      new WhereUnit(`${this._toQuery(src)} NOT LIKE ${pattern.query}`),
    );
  }

  endsWith(src: QueryValue<string | undefined>, search: QueryValue<string>): WhereUnit {
    // search가 상수 문자열이면 직접 패턴 생성
    if (typeof search === "string") {
      return this.like(src, `%${search}`);
    }
    const pattern = this.concat("%", search);
    return new WhereUnit(`${this._toQuery(src)} LIKE ${pattern.query}`);
  }

  notEndsWith(src: QueryValue<string | undefined>, search: QueryValue<string>): WhereUnit {
    // search가 상수 문자열이면 직접 패턴 생성
    if (typeof search === "string") {
      return this.notLike(src, `%${search}`);
    }
    const pattern = this.concat("%", search);
    return this.or(
      this.isNull(src),
      new WhereUnit(`${this._toQuery(src)} NOT LIKE ${pattern.query}`),
    );
  }

  abstract regexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit;

  abstract notRegexp(src: QueryValue<string | undefined>, pattern: QueryValue<string>): WhereUnit;

  // ============================================
  // WHERE - IN
  // ============================================

  in<T extends ColumnPrimitive>(
    src: QueryValue<T>,
    values: QueryValue<T | undefined>[],
  ): WhereUnit {
    if (values.length === 0) {
      return new WhereUnit("1 = 0"); // 항상 false
    }

    const hasNull = values.some((v) => v == null);
    const nonNullValues = values.filter((v) => v != null);

    if (nonNullValues.length === 0) {
      return this.isNull(src);
    }

    const inClause = new WhereUnit(
      `${this._toQuery(src)} IN (${nonNullValues.map((v) => this._toQuery(v)).join(", ")})`,
    );

    if (hasNull) {
      return this.or(inClause, this.isNull(src));
    }
    return inClause;
  }

  notIn<T extends ColumnPrimitive>(
    src: QueryValue<T>,
    values: QueryValue<T | undefined>[],
  ): WhereUnit {
    if (values.length === 0) {
      return new WhereUnit("1 = 1"); // 항상 true
    }

    const hasNull = values.some((v) => v == null);
    const nonNullValues = values.filter((v) => v != null);

    if (nonNullValues.length === 0) {
      return this.isNotNull(src);
    }

    const notInClause = new WhereUnit(
      `${this._toQuery(src)} NOT IN (${nonNullValues.map((v) => this._toQuery(v)).join(", ")})`,
    );

    // NOT IN에서 null 처리: null이 없어야 하고, 값도 리스트에 없어야 함
    if (!hasNull) {
      return this.or(notInClause, this.isNull(src));
    }
    return notInClause;
  }

  // ============================================
  // WHERE - 논리 연산
  // ============================================

  and(...conditions: WhereUnit[]): WhereUnit {
    if (conditions.length === 0) return new WhereUnit("1 = 1");
    if (conditions.length === 1) return conditions[0];
    return new WhereUnit(`(${conditions.map((c) => c.query).join(" AND ")})`);
  }

  or(...conditions: WhereUnit[]): WhereUnit {
    if (conditions.length === 0) return new WhereUnit("1 = 0");
    if (conditions.length === 1) return conditions[0];
    return new WhereUnit(`(${conditions.map((c) => c.query).join(" OR ")})`);
  }

  // ============================================
  // WHERE - 존재 여부 체크
  // ============================================

  exists<T extends ColumnPrimitive>(src: QueryValue<T>): QueryUnit<boolean> {
    // CASE WHEN IFNULL(COUNT(src), 0) > 0 THEN 1 ELSE 0 END
    return this.switch("boolean")
      .case(this.gt(this.ifNull(this.count(src), 0), 0), true)
      .default(false);
  }

  notExists<T extends ColumnPrimitive>(src: QueryValue<T>): QueryUnit<boolean> {
    // CASE WHEN IFNULL(COUNT(src), 0) <= 0 THEN 1 ELSE 0 END
    return this.switch("boolean")
      .case(this.lte(this.ifNull(this.count(src), 0), 0), true)
      .default(false);
  }

  // ============================================
  // SELECT - 문자열
  // ============================================

  abstract concat(...args: QueryValue<string | number | undefined>[]): QueryUnit<string>;

  left(src: QueryValue<string | undefined>, len: QueryValue<number>): QueryUnit<string> {
    return new QueryUnit<string>("string", `LEFT(${this._toQuery(src)}, ${this._toQuery(len)})`);
  }

  right(src: QueryValue<string | undefined>, len: QueryValue<number>): QueryUnit<string> {
    return new QueryUnit<string>("string", `RIGHT(${this._toQuery(src)}, ${this._toQuery(len)})`);
  }

  trim(src: QueryValue<string | undefined>): QueryUnit<string> {
    return new QueryUnit<string>("string", `RTRIM(LTRIM(${this._toQuery(src)}))`);
  }

  padStart(
    src: QueryValue<string | undefined>,
    length: number,
    fillString: string,
  ): QueryUnit<string> {
    const pad = new Array(length).fill(fillString).join("");
    return new QueryUnit<string>("string", `RIGHT(${this.concat(pad, src).query}, ${length})`);
  }

  replace(
    src: QueryValue<string | undefined>,
    from: QueryValue<string>,
    to: QueryValue<string>,
  ): QueryUnit<string> {
    return new QueryUnit<string>(
      "string",
      `REPLACE(${this._toQuery(src)}, ${this._toQuery(from)}, ${this._toQuery(to)})`,
    );
  }

  upper(src: QueryValue<string | undefined>): QueryUnit<string> {
    return new QueryUnit<string>("string", `UPPER(${this._toQuery(src)})`);
  }

  lower(src: QueryValue<string | undefined>): QueryUnit<string> {
    return new QueryUnit<string>("string", `LOWER(${this._toQuery(src)})`);
  }

  abstract length(src: QueryValue<string | undefined>): QueryUnit<number>;
  abstract byteLength(src: QueryValue<ColumnPrimitive>): QueryUnit<number>;

  // ============================================
  // SELECT - 숫자
  // ============================================

  abs(src: QueryValue<number | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `ABS(${this._toQuery(src)})`);
  }

  round(src: QueryValue<number | undefined>, digits: number): QueryUnit<number> {
    return new QueryUnit<number>("number", `ROUND(${this._toQuery(src)}, ${digits})`);
  }

  ceil(src: QueryValue<number | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `CEILING(${this._toQuery(src)})`);
  }

  floor(src: QueryValue<number | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `FLOOR(${this._toQuery(src)})`);
  }

  // ============================================
  // SELECT - 날짜
  // ============================================

  year(src: QueryValue<DateTime | DateOnly>): QueryUnit<number> {
    return new QueryUnit<number>("number", `YEAR(${this._toQuery(src)})`);
  }

  month(src: QueryValue<DateTime | DateOnly>): QueryUnit<number> {
    return new QueryUnit<number>("number", `MONTH(${this._toQuery(src)})`);
  }

  day(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `DAY(${this._toQuery(src)})`);
  }

  hour(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `HOUR(${this._toQuery(src)})`);
  }

  minute(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `MINUTE(${this._toQuery(src)})`);
  }

  second(src: QueryValue<DateTime | Time | undefined>): QueryUnit<number> {
    return new QueryUnit<number>("number", `SECOND(${this._toQuery(src)})`);
  }

  abstract isoWeek(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<number>;
  abstract isoWeekStartDate(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly>;
  abstract isoYearMonth(src: QueryValue<DateTime | DateOnly | undefined>): QueryUnit<DateOnly>;

  abstract dateDiff<T extends DateTime | DateOnly | Time>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    to: QueryValue<T>,
  ): QueryUnit<number>;

  abstract dateAdd<T extends DateTime | DateOnly | Time | undefined>(
    separator: TDateSeparator,
    from: QueryValue<T>,
    value: QueryValue<number>,
  ): QueryUnit<T>;

  abstract formatDate(
    src: QueryValue<DateTime | DateOnly | Time | undefined>,
    format: string,
  ): QueryUnit<string>;

  // ============================================
  // SELECT - 조건
  // ============================================

  abstract ifNull<T extends ColumnPrimitive>(
    src: QueryValue<T | undefined>,
    replacement: QueryValue<T>,
  ): QueryUnit<T>;

  is(condition: WhereUnit): QueryUnit<boolean> {
    return new QueryUnit<boolean>("boolean", `CASE WHEN ${condition.query} THEN 1 ELSE 0 END`);
  }

  switch<T extends ColumnPrimitiveStr>(type: T): SwitchBuilder<InferColumnPrimitive<T>> {
    return this._createSwitchBuilder<InferColumnPrimitive<T>>(type);
  }

  private _createSwitchBuilder<T extends ColumnPrimitive>(
    type: ColumnPrimitiveStr,
  ): SwitchBuilder<T> {
    const cases: Array<{ condition: WhereUnit; then: QueryValue<T> }> = [];
    const self = this;

    return {
      case(condition: WhereUnit, then: QueryValue<T>): SwitchBuilder<T> {
        cases.push({ condition, then });
        return this;
      },
      default(defaultVal: QueryValue<T>): QueryUnit<T> {
        if (cases.length === 0) {
          throw new Error("switch requires at least one case");
        }
        let query = "CASE";
        for (const c of cases) {
          query += ` WHEN ${c.condition.query} THEN ${self._toQuery(c.then)}`;
        }
        query += ` ELSE ${self._toQuery(defaultVal)} END`;
        return new QueryUnit<T>(type, query);
      },
    };
  }

  // ============================================
  // SELECT - 집계
  // ============================================

  count(src?: QueryValue<ColumnPrimitive>): QueryUnit<number> {
    if (src != null) {
      return new QueryUnit<number>("number", `COUNT(DISTINCT(${this._toQuery(src)}))`);
    }
    return new QueryUnit<number>("number", "COUNT(*)");
  }

  sum(src: QueryValue<number | undefined>): QueryUnit<number | undefined> {
    return new QueryUnit<number | undefined>("number", `SUM(${this._toQuery(src)})`);
  }

  avg(src: QueryValue<number | undefined>): QueryUnit<number | undefined> {
    return new QueryUnit<number | undefined>("number", `AVG(${this._toQuery(src)})`);
  }

  max<T extends ColumnPrimitive>(src: QueryValue<T>): QueryUnit<T> {
    return new QueryUnit<T>(this._getQueryValueTypeStr(src), `MAX(${this._toQuery(src)})`);
  }

  min<T extends ColumnPrimitive>(src: QueryValue<T>): QueryUnit<T> {
    return new QueryUnit<T>(this._getQueryValueTypeStr(src), `MIN(${this._toQuery(src)})`);
  }

  // ============================================
  // SELECT - 기타
  // ============================================

  abstract greatest<T extends ColumnPrimitive>(...args: QueryValue<T>[]): QueryUnit<T>;

  rowNum(): QueryUnit<number> {
    return new QueryUnit<number>("number", "ROW_NUMBER() OVER (ORDER BY (SELECT NULL))");
  }

  abstract cast<T extends ColumnPrimitiveStr>(
    src: QueryValue<ColumnPrimitive>,
    targetType: T,
  ): QueryUnit<InferColumnPrimitive<T>>;

  // ============================================
  // PIVOT/UNPIVOT 컬럼 참조 생성
  // ============================================

  abstract getUnpivotValueColumn<T extends ColumnPrimitive>(
    columnName: string,
    type: ColumnPrimitiveStr,
  ): QueryUnit<T>;

  abstract getUnpivotKeyColumn<T extends string>(columnName: string): QueryUnit<T>;

  abstract getPivotInColumn<T extends ColumnPrimitive>(
    key: string,
    valueColumn: QueryUnit<T>,
    forColumn: QueryUnit<ColumnPrimitive>,
    agg: (v: QueryUnit<T>) => QueryUnit<T>,
    defaultValue?: T,
  ): QueryUnit<T>;

  /**
   * PIVOT 시 원본 컬럼들의 alias 변환 (dialect별 구현)
   * MySQL/PostgreSQL: 변환 없음 (CASE WHEN 에뮬레이션)
   * MSSQL: [TBL] → [PVT] 변환 (네이티브 PIVOT 특성)
   */
  abstract convertColumnsForPivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>>;

  /**
   * UNPIVOT 시 원본 컬럼들의 alias 변환 (dialect별 구현)
   * MySQL/PostgreSQL: 변환 없음 (원본 테이블 alias 그대로 사용)
   * MSSQL: [TBL] → [UPVT] 변환 (네이티브 UNPIVOT 특성)
   */
  abstract convertColumnsForUnpivot(
    columns: Record<string, QueryUnit<ColumnPrimitive>>,
  ): Record<string, QueryUnit<ColumnPrimitive>>;

  // ============================================
  // Protected 헬퍼
  // ============================================

  protected _toQuery<T extends ColumnPrimitive>(val: QueryValue<T>): string {
    return val instanceof QueryUnit ? val.query : this._convertValueToQuery(val);
  }

  protected _getTypeStr<T extends ColumnPrimitive>(val: T): ColumnPrimitiveStr {
    if (typeof val === "string") return "string";
    if (typeof val === "number") return "number";
    if (typeof val === "bigint") return "bigint";
    if (typeof val === "boolean") return "boolean";
    if (val instanceof DateTime) return "datetime";
    if (val instanceof DateOnly) return "dateonly";
    if (val instanceof Time) return "time";
    if (val instanceof Uuid) return "uuid";
    if (Buffer.isBuffer(val)) return "buffer";
    return "string"; // fallback
  }

  protected _getQueryValueTypeStr<T extends ColumnPrimitive>(
    val: QueryValue<T>,
  ): ColumnPrimitiveStr {
    if (val instanceof QueryUnit) {
      return val.type;
    }
    return this._getTypeStr(val);
  }

  // ============================================
  // 유틸리티
  // ============================================

  abstract wrapNames(...names: (string | undefined)[]): string;

  // ============================================
  // Abstract (dialect별 구현 필요)
  // ============================================

  protected abstract _convertValueToQuery(value: ColumnPrimitive): string;
}
