import type { TQueryValue, TSdOrmDataType } from "../../types";
import { QueryUnit } from "../queryable/QueryUnit";
import type { Type, WrappedType } from "@simplysm/sd-core-common";
import { DateOnly, DateTime, NotImplementError, Time, Uuid } from "@simplysm/sd-core-common";
import { Queryable } from "../queryable/Queryable";
import { SdOrmUtils } from "../../utils/SdOrmUtils";
import { CaseWhenQueryHelper } from "../case/CaseWhenQueryHelper";
import { CaseQueryHelper } from "../case/CaseQueryHelper";
import type { TDbContextOption } from "../../DbContext";
import type { TEntityValue, TEntityValueOrQueryableOrArray } from "../queryable/types";
import type { ISelectQueryDef, TDbDateSeparator, TQueryBuilderValue } from "./types";

export class QueryHelper {
  constructor(private readonly _dialect: TDbContextOption["dialect"]) {}

  // ============================================
  // 값 생성
  // ============================================

  val<T extends TQueryValue>(
    value: TEntityValue<T>,
    type?: Type<WrappedType<NonNullable<T>>>,
  ): QueryUnit<T> {
    const currType: Type<any> | undefined = type ?? SdOrmUtils.getQueryValueType(value);
    return new QueryUnit(currType, this.getQueryValue(value));
  }

  query<T extends TQueryValue>(
    type: Type<WrappedType<T>>,
    texts: (string | QueryUnit<any>)[],
  ): QueryUnit<T> {
    const arr: string[] = [];
    for (const text of texts) {
      if (text instanceof QueryUnit) {
        arr.push(this.getQueryValue(text));
      } else {
        arr.push(text);
      }
    }
    return new QueryUnit(type, arr);
  }

  // ============================================
  // WHERE - 비교 연산
  // ============================================
  equal<T extends TQueryValue>(
    source: TEntityValue<T>,
    target: TEntityValue<T | undefined>,
  ): TQueryBuilderValue {
    if (target == null) {
      return this.isNull(source);
    }

    if (this._dialect === "mysql") {
      return [this.getQueryValue(source), " <=> ", this.getQueryValue(target)];
    } else {
      if (source instanceof QueryUnit && target instanceof QueryUnit) {
        return this.or([
          this.and([this.isNull(source), this.isNull(target)]),
          [this.getQueryValue(source), " = ", this.getQueryValue(target)],
        ]);
      } else {
        return [this.getQueryValue(source), " = ", this.getQueryValue(target)];
      }
    }
  }

  notEqual<T extends TQueryValue>(
    source: TEntityValue<T>,
    target: TEntityValue<T | undefined>,
  ): TQueryBuilderValue[] {
    if (target == null) {
      return this.isNotNull(source);
    } else if (source instanceof QueryUnit && target instanceof QueryUnit) {
      return this.or([
        this.and([this.isNull(source), this.isNotNull(target)]),
        this.and([this.isNotNull(source), this.isNull(target)]),
        [this.getQueryValue(source), " != ", this.getQueryValue(target)],
      ]);
    } else {
      return this.or([
        this.isNull(source),
        [this.getQueryValue(source), " != ", this.getQueryValue(target)],
      ]);
    }
  }

  greaterThen<T extends string | String | number | Number | DateOnly | DateTime | Time>(
    source: TEntityValue<T | undefined>,
    target: TEntityValue<T | undefined>,
  ): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " > ", this.getQueryValue(target)];
  }

  greaterThenOrEqual<T extends string | String | number | Number | DateOnly | DateTime | Time>(
    source: TEntityValue<T | undefined>,
    target: TEntityValue<T | undefined>,
  ): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " >= ", this.getQueryValue(target)];
  }

  lessThen<T extends string | String | number | Number | DateOnly | DateTime | Time>(
    source: TEntityValue<T | undefined>,
    target: TEntityValue<T | undefined>,
  ): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " < ", this.getQueryValue(target)];
  }

  lessThenOrEqual<T extends string | String | number | Number | DateOnly | DateTime | Time>(
    source: TEntityValue<T | undefined>,
    target: TEntityValue<T | undefined>,
  ): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " <= ", this.getQueryValue(target)];
  }

  between<T extends string | String | number | Number | DateOnly | DateTime | Time>(
    source: TEntityValue<T | undefined>,
    from: TEntityValue<T | undefined>,
    to: TEntityValue<T | undefined>,
  ): TQueryBuilderValue[] {
    if (from != null || to != null) {
      return this.and(
        [
          from != null ? this.greaterThenOrEqual(source, from) : undefined,
          to != null ? this.lessThenOrEqual(source, to) : undefined,
        ].filterExists(),
      );
    } else {
      return [];
    }
  }

  // ============================================
  // WHERE - NULL 체크
  // ============================================
  isNull<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " IS ", "NULL"];
  }

  isNotNull<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " IS NOT ", "NULL"];
  }

  // ============================================
  // WHERE - Boolean 체크
  // ============================================
  isTrue<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return this.and([this.isNotNull(source), this.equal(source, true as any)]);
  }

  isFalse<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return this.or([this.isNull(source), this.equal(source, false as any)]);
  }

  // ============================================
  // WHERE - 문자열 검색
  // ============================================
  like(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " LIKE ", this.getQueryValue(target)];
  }

  notLike(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return this.or([
      this.isNull(source),
      [this.getQueryValue(source), " NOT LIKE ", this.getQueryValue(target)],
    ]);
  }

  includes(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " LIKE ", this.concat("%", target, "%").query];
  }

  notIncludes(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return this.or([
      this.isNull(source),
      [this.getQueryValue(source), " NOT LIKE ", this.concat("%", target, "%").query],
    ]);
  }

  startsWith(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return [
      this.getQueryValue(source),
      " LIKE ",
      ...(this._dialect === "mysql"
        ? [this.getQueryValue(this.concat(target, "%"))]
        : [this.getQueryValue(target), this._dialect === "sqlite" ? " || " : " + ", "'%'"]),
    ];
  }

  notStartsWith(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return [
      this.getQueryValue(source),
      " NOT LIKE ",
      this.getQueryValue(target),
      this._dialect === "sqlite" ? " || " : " + ",
      "'%'",
    ];
  }

  endsWith(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return [
      this.getQueryValue(source),
      " LIKE ",
      this.getQueryValue(
        this.concat("%", target),
      ) /*, "'%'", this._dialect === "sqlite" ? " || " : " + ", this.getQueryValue(target)*/,
    ];
  }

  notEndsWith(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return [
      this.getQueryValue(source),
      " NOT LIKE ",
      "'%'",
      this._dialect === "sqlite" ? " || " : " + ",
      this.getQueryValue(target),
    ];
  }

  regexp(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " REGEXP ", this.getQueryValue(target)];
  }

  notRegexp(
    source: TEntityValue<string | undefined>,
    target: TEntityValue<string | undefined>,
  ): TQueryBuilderValue[] {
    return this.or([
      this.isNull(source),
      [this.getQueryValue(source), " NOT REGEXP ", this.getQueryValue(target)],
    ]);
  }

  // ============================================
  // WHERE - IN
  // ============================================
  in<P extends TQueryValue>(
    src: TEntityValue<P>,
    target: TEntityValue<P | undefined>[],
  ): TQueryBuilderValue[] {
    if (target.length < 1) {
      return ["1", " = ", "0"];
    } else {
      if (target.every((item) => item == null)) {
        return this.isNull(src);
      }

      const result = [
        this.getQueryValue(src),
        " IN ",
        target
          .filterExists()
          .mapMany((item) => [this.getQueryValue(item), ", "])
          .slice(0, -1),
      ];
      if (target.some((item) => item == null)) {
        return this.or([result, this.isNull(src)]);
      }

      return result;
    }
  }

  notIn<P extends TQueryValue>(
    src: TEntityValue<P>,
    target: TEntityValue<P | undefined>[],
  ): TQueryBuilderValue[] {
    if (target.length < 1) {
      return ["1", " = ", "1"];
    } else {
      if (target.every((item) => item == null)) {
        return this.isNotNull(src);
      }

      const result = [
        this.getQueryValue(src),
        " NOT IN ",
        target
          .filterExists()
          .mapMany((item) => [this.getQueryValue(item), ", "])
          .slice(0, -1),
      ];
      if (!target.some((item) => item == null)) {
        return this.or([result, this.isNull(src)]);
      }

      return result;
    }
  }

  // ============================================
  // WHERE - 논리 연산
  // ============================================
  and(args: TEntityValueOrQueryableOrArray<any, any>[]): TQueryBuilderValue[] {
    const result: TQueryBuilderValue[] = [];
    for (const arg of args) {
      const queryValue = this.getQueryValue(arg);
      if (typeof queryValue !== "undefined") {
        result.push(...[queryValue, " AND "]);
      }
    }
    return result.slice(0, -1);
  }

  or(args: TEntityValueOrQueryableOrArray<any, any>[]): TQueryBuilderValue[] {
    const result: TQueryBuilderValue[] = [];
    for (const arg of args) {
      const queryValue = this.getQueryValue(arg);
      result.push(...[queryValue, " OR "]);
    }
    return result.slice(0, -1);
  }

  // ============================================
  // WHERE - 서브쿼리 존재 여부
  // ============================================

  exists<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<boolean> {
    return this.case(this.greaterThen(this.ifNull(this.count(arg), 0), 0), true as boolean).else(
      false,
    );
  }

  notExists<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<boolean> {
    return this.case(
      this.lessThenOrEqual(this.ifNull(this.count(arg), 0), 0),
      true as boolean,
    ).else(false);
  }

  // ============================================
  // SELECT - 문자열
  // ============================================
  concat(
    ...args: TEntityValue<string | String | number | Number | undefined>[]
  ): QueryUnit<string> {
    if (this._dialect === "mysql") {
      return new QueryUnit<string>(String, [
        "CONCAT(",
        ...args
          .mapMany((arg) => [arg != null ? this.ifNull(arg, "").query : "", ", "])
          .slice(0, -1),
        ")",
      ]);
    } else {
      return new QueryUnit<string>(String, [
        ...args
          .mapMany((arg) => [
            arg instanceof QueryUnit
              ? this.ifNull(arg, "").query
              : arg != null
                ? this.getQueryValue(arg)
                : "",
            this._dialect === "sqlite" ? " || " : " + ",
          ])
          .slice(0, -1),
      ]);
    }
  }

  left(
    src: TEntityValue<string | String | undefined>,
    num: TEntityValue<number | Number>,
  ): QueryUnit<string> {
    return new QueryUnit<string>(String, [
      "LEFT(",
      this.getQueryValue(src),
      ", ",
      this.getQueryValue(num),
      ")",
    ]);
  }

  right(
    src: TEntityValue<string | String | undefined>,
    num: TEntityValue<number | Number>,
  ): QueryUnit<string> {
    return new QueryUnit<string>(String, [
      "RIGHT(",
      this.getQueryValue(src),
      ", ",
      this.getQueryValue(num),
      ")",
    ]);
  }

  trim(src: TEntityValue<string | String | undefined>): QueryUnit<string> {
    return new QueryUnit<string>(String, ["RTRIM(LTRIM(", this.getQueryValue(src), "))"]);
  }

  padStart(
    src: TEntityValue<string | String | undefined>,
    length: number,
    fillString: string,
  ): QueryUnit<string> {
    const str = new Array<string>(length).fill(fillString).join("");

    return new QueryUnit<string>(String, [`RIGHT(`, this.concat(str, src), `, ${length})`]);
  }

  replace(
    src: TEntityValue<string | String | undefined>,
    from: TEntityValue<String | string>,
    to: TEntityValue<String | string>,
  ): QueryUnit<string> {
    return new QueryUnit<string>(String, [
      "REPLACE(",
      this.getQueryValue(src),
      ", ",
      this.getQueryValue(from),
      ", ",
      this.getQueryValue(to),
      ")",
    ]);
  }

  toUpperCase(src: TEntityValue<string | String | undefined>): QueryUnit<string> {
    return new QueryUnit<string>(String, ["UPPER(", this.getQueryValue(src), ")"]);
  }

  toLowerCase(src: TEntityValue<string | String | undefined>): QueryUnit<string> {
    return new QueryUnit<string>(String, ["LOWER(", this.getQueryValue(src), ")"]);
  }

  stringLength(arg: TEntityValue<String | string>): QueryUnit<number> {
    if (this._dialect === "mysql") {
      return new QueryUnit<number>(Number, ["CHAR_LENGTH(", this.getQueryValue(arg), ")"]);
    } else {
      return new QueryUnit<number>(Number, ["LEN(", this.getQueryValue(arg), ")"]);
    }
  }

  dataLength<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<number> {
    if (this._dialect === "mysql") {
      return new QueryUnit<number>(Number, ["LENGTH(", this.getQueryValue(arg), ")"]);
    } else {
      return new QueryUnit<number>(Number, ["DATALENGTH(", this.getQueryValue(arg), ")"]);
    }
  }

  // ============================================
  // SELECT - 숫자
  // ============================================
  abs(src: TEntityValue<number | Number | undefined>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["ABS(", this.getQueryValue(src), ")"]);
  }

  round<T extends number | Number>(arg: TEntityValue<T>, len: number): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["ROUND(", this.getQueryValue(arg), ", ", len, ")"]);
  }

  ceil<T extends number | Number>(arg: TEntityValue<T>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["CEILING(", this.getQueryValue(arg), ")"]);
  }

  floor<T extends number | Number>(arg: TEntityValue<T>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["FLOOR(", this.getQueryValue(arg), ")"]);
  }

  // ============================================
  // SELECT - 날짜
  // ============================================
  year<T extends DateTime | DateOnly>(value: TEntityValue<T>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["YEAR(", this.getQueryValue(value), ")"]);
  }

  month<T extends DateTime | DateOnly>(value: TEntityValue<T>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["MONTH(", this.getQueryValue(value), ")"]);
  }

  day<T extends DateTime | DateOnly | undefined>(value: TEntityValue<T>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["DAY(", this.getQueryValue(value), ")"]);
  }

  isoWeek<T extends DateOnly | undefined>(value: TEntityValue<T>): QueryUnit<number> {
    if (this._dialect === "mysql") {
      return new QueryUnit<number>(Number, ["WEEKDAY(", this.getQueryValue(value), ")"]);
    } else {
      return new QueryUnit<number>(Number, [
        "(DATEPART(WEEKDAY, ",
        this.getQueryValue(value),
        ") + @@DATEFIRST - 2) % 7 + 1",
      ]);
    }
  }

  isoWeekStartDate<T extends DateOnly | undefined>(value: TEntityValue<T>): QueryUnit<T> {
    return this.dateAdd(
      "day",
      value,
      new QueryUnit<number>(Number, ["-(", this.isoWeek(value), " - 1)"]),
    );
  }

  isoYearMonth<T extends DateOnly | undefined>(value: TEntityValue<T>): QueryUnit<T> {
    const isoWeekYearMonthBaseDate = this.dateAdd("day", this.isoWeekStartDate(value), 3);

    return this.dateAdd(
      "day",
      isoWeekYearMonthBaseDate,
      this.query<number>(Number, ["1-", this.day(isoWeekYearMonthBaseDate)]),
    );
  }

  dateDiff<T extends DateTime | DateOnly | Time>(
    separator: TDbDateSeparator,
    from: TEntityValue<T | 0>,
    to: TEntityValue<T | 0>,
  ): QueryUnit<number> {
    if (this._dialect === "mysql") {
      return new QueryUnit<number>(Number, [
        "TIMESTAMPDIFF(",
        separator,
        ", ",
        this.getQueryValue(from),
        ", ",
        this.getQueryValue(to),
        ")",
      ]);
    } else {
      return new QueryUnit<number>(Number, [
        "DATEDIFF(",
        separator,
        ", ",
        this.getQueryValue(from),
        ", ",
        this.getQueryValue(to),
        ")",
      ]);
    }
  }

  dateAdd<T extends DateTime | DateOnly | Time | undefined>(
    separator: TDbDateSeparator,
    from: TEntityValue<T>,
    value: TEntityValue<number>,
  ): QueryUnit<T> {
    const type = SdOrmUtils.getQueryValueType(from);

    if (this._dialect === "mysql") {
      return new QueryUnit(type, [
        "DATE_ADD(",
        this.getQueryValue(from),
        ", INTERVAL ",
        this.getQueryValue(value),
        " ",
        separator.toUpperCase(),
        ")",
      ]) as any;
    } else {
      return new QueryUnit(type, [
        "DATEADD(",
        separator,
        ", ",
        this.getQueryValue(value),
        ", ",
        this.getQueryValue(from),
        ")",
      ]) as any;
    }
  }

  /**
   *
   * @param value
   * @param code https://learn.microsoft.com/en-us/sql/t-sql/functions/cast-and-convert-transact-sql?view=sql-server-ver16
   */
  dateToString<T extends DateTime | DateOnly | Time>(
    value: TEntityValue<T | 0>,
    code: number,
  ): QueryUnit<string> {
    if (this._dialect === "mysql") {
      if (code === 112) {
        return new QueryUnit(String, [
          "DATE_FORMAT(",
          this.getQueryValue(value),
          ", '%Y%m%d')",
        ]) as any;
      } else if (code === 120) {
        return new QueryUnit(String, [
          "DATE_FORMAT(",
          this.getQueryValue(value),
          ", '%Y-%m-%d %H:%i:%s')",
        ]) as any;
      } else if (code === 114) {
        return new QueryUnit(String, [
          "DATE_FORMAT(",
          this.getQueryValue(value),
          ", '%H:%i:%s')",
        ]) as any;
      } else {
        throw new NotImplementError();
      }
    } else {
      return new QueryUnit(String, [
        "CONVERT(NVARCHAR(25), ",
        this.getQueryValue(value),
        ", ",
        this.getQueryValue(code),
        ")",
      ]) as any;
    }
  }

  // ============================================
  // SELECT - 조건
  // ============================================

  ifNull<S extends TQueryValue, T extends TQueryValue>(
    source: TEntityValue<S>,
    ...targets: TEntityValue<T>[]
  ): QueryUnit<S extends undefined ? T : S> {
    let cursorQuery: TQueryBuilderValue = this.getQueryValue(source);
    let type: Type<any> | undefined = SdOrmUtils.getQueryValueType(source);

    for (const target of targets) {
      if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
        cursorQuery = ["ISNULL(", cursorQuery, ", ", this.getQueryValue(target), ")"];
      } else {
        cursorQuery = ["IFNULL(", cursorQuery, ", ", this.getQueryValue(target), ")"];
      }
      type = type ?? SdOrmUtils.getQueryValueType(target);
    }

    return new QueryUnit(type, cursorQuery);
  }

  is(where: TQueryBuilderValue): QueryUnit<boolean> {
    return this.case<boolean>(where, true).else(false);
  }

  case<T extends TQueryValue>(
    predicate: TEntityValue<boolean | Boolean> | TQueryBuilderValue,
    then: TEntityValue<T>,
  ): CaseQueryHelper<T> {
    const type = SdOrmUtils.getQueryValueType(then);
    const caseQueryable = new CaseQueryHelper(this, type);
    return caseQueryable.case(predicate, then);
  }

  caseWhen<T extends TQueryValue>(arg: TEntityValue<TQueryValue>): CaseWhenQueryHelper<T> {
    return new CaseWhenQueryHelper(this, arg);
  }

  // ============================================
  // SELECT - 집계
  // ============================================
  count<T extends TQueryValue>(arg?: TEntityValue<T>): QueryUnit<number> {
    if (arg != null) {
      return new QueryUnit<number>(Number, ["COUNT(DISTINCT(", this.getQueryValue(arg), "))"]);
    } else {
      return new QueryUnit<number>(Number, "COUNT(*)");
    }
  }

  sum<T extends number | Number | undefined>(
    arg: TEntityValue<T>,
  ): QueryUnit<T extends undefined ? undefined | number : number> {
    return new QueryUnit<number | undefined>(Number, ["SUM(", this.getQueryValue(arg), ")"]) as any;
  }

  avg<T extends number | Number>(arg: TEntityValue<T | undefined>): QueryUnit<number | undefined> {
    return new QueryUnit<number | undefined>(Number, ["AVG(", this.getQueryValue(arg), ")"]);
  }

  max<
    T extends undefined | number | Number | string | String | DateOnly | DateTime | Time | boolean,
  >(unit: TEntityValue<T>): QueryUnit<T> {
    const type = SdOrmUtils.getQueryValueType(unit);
    if (!type) throw new TypeError();

    if (type.name === "Boolean") {
      return this.cast<any>(
        new QueryUnit(type, ["MAX(", this.getQueryValue(this.cast(unit, Number)), ")"]),
        Boolean,
      );
    } else {
      return new QueryUnit(type, ["MAX(", this.getQueryValue(unit), ")"]);
    }
  }

  min<
    T extends undefined | number | Number | string | String | DateOnly | DateTime | Time | boolean,
  >(unit: TEntityValue<T>): QueryUnit<T> {
    const type = SdOrmUtils.getQueryValueType(unit);
    if (!type) throw new TypeError();

    if (type.name === "Boolean") {
      return this.cast<any>(
        new QueryUnit(type, ["MIN(", this.getQueryValue(this.cast(unit, Number)), ")"]),
        Boolean,
      );
    } else {
      return new QueryUnit(type, ["MIN(", this.getQueryValue(unit), ")"]);
    }
  }

  // ============================================
  // SELECT - 기타
  // ============================================

  greatest<T extends undefined | number | Number | DateOnly | DateTime | Time | string | String>(
    ...args: TEntityValue<T>[]
  ): QueryUnit<T> {
    let type: Type<T> | undefined;
    for (const arg of args) {
      type = SdOrmUtils.getQueryValueType(arg);
      if (type) break;
    }
    if (!type) throw new TypeError();

    return new QueryUnit<T>(type, [
      "GREATEST(",
      ...args.mapMany((arg) => [this.getQueryValue(arg), ", "]).slice(0, -1),
      ")",
    ]);
  }

  /**
   * @deprecated
   * MSSQL 2022이하는 GREATEST 사용이 불가하여 만든 함수
   */
  greater<T extends number | Number | DateOnly | DateTime | Time>(
    source: TEntityValue<T>,
    target: TEntityValue<T>,
  ): QueryUnit<T> {
    const type = SdOrmUtils.getQueryValueType(source);
    if (!type) throw new TypeError();

    return this.case(this.greaterThen(source, target), source).else(target);
  }

  rowIndex(
    orderBy: [TEntityValue<TQueryValue>, "asc" | "desc"][],
    groupBy?: TEntityValue<TQueryValue>[],
  ): QueryUnit<number> {
    return new QueryUnit<number>(Number, [
      "ROW_NUMBER() OVER(",
      ...(groupBy
        ? [
            "PARTITION BY ",
            ...groupBy.mapMany((item) => [", ", this.getQueryValue(item)]).slice(1),
            " ",
          ]
        : []),
      "ORDER BY ",
      orderBy.map((item) => this.getQueryValue(item[0]) + " " + item[1].toUpperCase()).join(" "),
      ")",
    ]);
  }

  cast<T extends TQueryValue>(
    src: TEntityValue<TQueryValue>,
    targetType: Type<WrappedType<T>>,
  ): QueryUnit<T> {
    if (this._dialect === "mysql") {
      return new QueryUnit(targetType, [
        "CONVERT(",
        this.getQueryValue(src),
        ", ",
        this.mysqlConvertType(targetType),
        ")",
      ]);
    } else {
      return new QueryUnit(targetType, [
        "CONVERT(",
        this.type(targetType),
        ", ",
        this.getQueryValue(src),
        ")",
      ]);
    }
  }

  // ----------------------------------------------------
  // HELPER
  // ----------------------------------------------------

  getQueryValue(value: TEntityValue<any>): string;
  getQueryValue(value: Queryable<any, any>): ISelectQueryDef;
  getQueryValue(value: TEntityValue<any> | Queryable<any, any>): string | ISelectQueryDef {
    if (value instanceof QueryUnit) {
      if (value.query instanceof Array) {
        return this._getQueryValueArray(value.query);
      } else if (value.query instanceof QueryUnit) {
        return this.getQueryValue(value.query);
      } else if (value.query instanceof Queryable) {
        return this.getQueryValue(value.query);
      } else {
        return value.query;
      }
    } else if (typeof value === "string") {
      if (this._dialect === "mysql" || this._dialect === "sqlite") {
        return `'${SdOrmUtils.replaceString(value)}'`;
      } else {
        return `N'${SdOrmUtils.replaceString(value)}'`;
      }
    } else if (typeof value === "boolean") {
      return value ? "1" : "0";
    } else if (value instanceof DateTime) {
      if (this._dialect === "mysql") {
        return (
          "STR_TO_DATE('" + value.toFormatString("yyyy-MM-dd HH:mm:ss") + "', '%Y-%m-%d %H:%i:%s')"
        );
      } else {
        return "'" + value.toFormatString("yyyy-MM-dd HH:mm:ss") + "'";
      }
      // "select"할때 어차피 "fff"를 못가져오는 관계로, 아래 코드 주석
      // (차후에 "tedious"가 업데이트 되면, 다시 "fff를 넣어야 할 수도 있음)
      // return "'" + arg.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + "'";
    } else if (value instanceof DateOnly) {
      if (this._dialect === "mysql") {
        return "STR_TO_DATE('" + value.toFormatString("yyyy-MM-dd") + "', '%Y-%m-%d')";
      } else {
        return "'" + value.toFormatString("yyyy-MM-dd") + "'";
      }
    } else if (value instanceof Time) {
      return "'" + value.toFormatString("HH:mm:ss") + "'";
    } else if (value instanceof Buffer) {
      return `0x${value.toString("hex")}`;
    } else if (value instanceof Uuid) {
      if (this._dialect === "mysql") {
        return "'" + value.toString().replace(/-/g, "") + "'";
      } else {
        return "'" + value.toString() + "'";
      }
    } else if (value instanceof Queryable) {
      const selectDef = value.getSelectQueryDef();
      if (selectDef.top !== 1) {
        throw new Error(
          "하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 TOP 1 이 지정 되야 합니다.",
        );
      }
      if (Object.keys(selectDef.select).length > 1) {
        throw new Error(
          "하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 하나의 컬럼만 SELECT 되야 합니다.",
        );
      }

      return selectDef;
    } else if (value == null) {
      return "NULL";
    } else {
      return value;
    }
  }

  getBulkInsertQueryValue(value: TEntityValue<any>): any {
    if (value instanceof QueryUnit) {
      if (value.query instanceof Array) {
        return this._getBulkInsertQueryValueArray(value.query);
      } else if (value.query instanceof QueryUnit) {
        return this.getBulkInsertQueryValue(value.query);
      } else if (value.query instanceof Queryable) {
        return this.getBulkInsertQueryValue(value.query);
      } else {
        return value.query;
      }
    } else if (typeof value === "string") {
      return value;
    } else if (typeof value === "boolean") {
      return value ? 1 : 0;
    } else if (value instanceof DateTime) {
      return value.toFormatString("yyyy-MM-dd HH:mm:ss");
      // return value.date;
    } else if (value instanceof DateOnly) {
      return value.toFormatString("yyyy-MM-dd");
      //return this._dialect === "mssql" || this._dialect === "mssql-azure" ? value.date : value;
    } else if (value instanceof Time) {
      return value.toFormatString("HH:mm:ss");
    } else if (value instanceof Buffer) {
      return `0x${value.toString("hex")}`;
    } else if (value instanceof Uuid) {
      return value.toString();
    } else if (value instanceof Queryable) {
      const selectDef = value.getSelectQueryDef();
      if (selectDef.top !== 1) {
        throw new Error(
          "하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 TOP 1 이 지정 되야 합니다.",
        );
      }
      if (typeof selectDef.select !== "undefined" || Object.keys(selectDef.select).length > 1) {
        throw new Error(
          "하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 하나의 컬럼만 SELECT 되야 합니다.",
        );
      }

      return selectDef;
    } else {
      return value;
    }
  }

  private _getBulkInsertQueryValueArray(arr: any[]): TEntityValueOrQueryableOrArray<any, any> {
    return arr.map((item) => {
      if (item instanceof Array) {
        return this._getBulkInsertQueryValueArray(item);
      } else if (item instanceof QueryUnit) {
        return this.getBulkInsertQueryValue(item);
      } else if (item instanceof Queryable) {
        return this.getBulkInsertQueryValue(item);
      } else {
        return item;
      }
    });
  }

  private _getQueryValueArray(arr: any[]): TEntityValueOrQueryableOrArray<any, any> {
    return arr.map((item) => {
      if (item instanceof Array) {
        return this._getQueryValueArray(item);
      } else if (item instanceof QueryUnit) {
        return this.getQueryValue(item);
      } else if (item instanceof Queryable) {
        return this.getQueryValue(item);
      } else {
        return item;
      }
    });
  }

  type(type: Type<TQueryValue> | TSdOrmDataType | string | undefined): string {
    if (typeof type === "string") {
      return type;
    } else if ((type as Record<string, any> | undefined)?.["type"] != null) {
      const currType = type as TSdOrmDataType;
      switch (currType.type) {
        case "TEXT":
          return this._dialect === "mysql" ? "LONGTEXT" : "NTEXT";
        case "DECIMAL":
          return (
            "DECIMAL(" +
            currType.precision +
            (currType.digits == null || currType.digits === 0 ? "" : ", " + currType.digits) +
            ")"
          );
        case "STRING":
          if (this._dialect === "mysql") {
            if (currType.length === "MAX") {
              return "LONGTEXT";
            } else {
              return "VARCHAR(" + (currType.length ?? "255") + ")";
            }
          } else {
            return "NVARCHAR(" + (currType.length ?? "255") + ")";
          }
        case "FIXSTRING":
          return "NCHAR(" + currType.length + ")";
        case "BINARY":
          if (this._dialect === "mysql") {
            const len = currType.length ?? "MAX";
            if (len === "MAX") {
              return "LONGBLOB";
            } else {
              return "VARBINARY(" + len + ")";
            }
          } else {
            return "VARBINARY(" + (currType.length ?? "MAX") + ")";
          }
        default:
          throw new TypeError();
      }
    } else {
      const currType = type as Type<TQueryValue> | undefined;
      switch (currType) {
        case String:
          if (this._dialect === "mysql") {
            return "VARCHAR(255)";
          } else {
            return "NVARCHAR(255)";
          }
        case Number:
          return this._dialect === "sqlite" ? "INTEGER" : "BIGINT";
        case Boolean:
          return this._dialect === "mysql" ? "BOOLEAN" : "BIT";
        case DateTime:
          return this._dialect === "mysql" ? "DATETIME" : "DATETIME2";
        case DateOnly:
          return "DATE";
        case Time:
          return "TIME";
        case Uuid:
          return this._dialect === "mysql" ? "CHAR(38)" : "UNIQUEIDENTIFIER";
        case Buffer:
          return this.type({ type: "BINARY", length: "MAX" });
        default:
          throw new TypeError(currType != null ? currType.name : "undefined");
      }
    }
  }

  mysqlConvertType(type: Type<TQueryValue>): string {
    switch (type) {
      case String:
        return "CHAR";
      case Number:
        return "DECIMAL";
      case Boolean:
        return "DECIMAL";
      case DateTime:
        return "DATETIME";
      case DateOnly:
        return "DATE";
      case Time:
        return "TIME";
      case Uuid:
        return "CHAR";
      case Buffer:
        return "BINARY";
      default:
        throw new TypeError(type.name);
    }
  }
}
