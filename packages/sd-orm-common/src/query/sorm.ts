import {
  TEntityValue,
  TEntityValueOrQueryable,
  TEntityValueOrQueryableArray,
  TQueryValue,
  TQueryValueOrSelectArray
} from "../common";
import {QueryUtil} from "../util/QueryUtil";
import {DateOnly, DateTime, Time, Type} from "@simplysm/sd-core-common";
import {QueryUnit} from "./QueryUnit";

export const sorm = {
  // WHERE query
  equal<T extends TQueryValue>(source: TEntityValue<T>, target: TEntityValue<T | undefined>): TQueryValueOrSelectArray {
    if (target === undefined) {
      return sorm.null(source);
    }
    else {
      return [QueryUtil.getQueryValue(source), " = ", QueryUtil.getQueryValue(target)];
    }
  },
  notEqual<T extends TQueryValue>(source: TEntityValue<T>, target: TEntityValue<T | undefined>): TQueryValueOrSelectArray {
    if (target === undefined) {
      return sorm.notNull(source);
    }
    else {
      return [QueryUtil.getQueryValue(source), " != ", QueryUtil.getQueryValue(target)];
    }
  },
  null<T extends TQueryValue>(source: TEntityValue<T>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " IS ", "NULL"];
  },
  notNull<T extends TQueryValue>(source: TEntityValue<T>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " IS NOT ", "NULL"];
  },
  lessThen<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " < ", QueryUtil.getQueryValue(target)];
  },
  lessThenOrEqual<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " <= ", QueryUtil.getQueryValue(target)];
  },
  greaterThen<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " > ", QueryUtil.getQueryValue(target)];
  },
  greaterThenOrEqual<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " >= ", QueryUtil.getQueryValue(target)];
  },
  between<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, from: TEntityValue<T | undefined>, to: TEntityValue<T | undefined>): TQueryValueOrSelectArray {
    return sorm.and([
      sorm.greaterThenOrEqual(source, from),
      sorm.lessThenOrEqual(source, to)
    ]);
  },
  includes(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " LIKE ", "'%'", " + ", QueryUtil.getQueryValue(target), " + ", "'%'"];
  },
  startsWith(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " LIKE ", QueryUtil.getQueryValue(target), " + ", "'%'"];
  },
  endsWith(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryValueOrSelectArray {
    return [QueryUtil.getQueryValue(source), " LIKE ", "'%'", " + ", QueryUtil.getQueryValue(target)];
  },
  in<P extends TQueryValue>(src: TEntityValue<P>, target: (TEntityValue<P | undefined>)[]): TQueryValueOrSelectArray {
    if (target.length < 1) {
      return [1, " = ", 0];
    }
    else {
      if (target.every((item) => item === undefined)) {
        return sorm.null(src);
      }

      const result = [QueryUtil.getQueryValue(src), " IN ", target.filterExists().mapMany((item) => [QueryUtil.getQueryValue(item), ", "]).slice(0, -1)];
      if (target.includes(undefined)) {
        return sorm.or([
          result,
          sorm.null(src)
        ]);
      }

      return result;
    }
  },
  notIn<P extends TQueryValue>(src: TEntityValue<P>, target: (TEntityValue<P | undefined>)[]): TQueryValueOrSelectArray {
    if (target.length < 1) {
      return [1, " = ", 1];
    }
    else {
      if (target.every((item) => item === undefined)) {
        return sorm.null(src);
      }

      const result = [QueryUtil.getQueryValue(src), " NOT IN ", target.filterExists().mapMany((item) => [QueryUtil.getQueryValue(item), ", "]).slice(0, -1)];
      if (target.includes(undefined)) {
        return sorm.and([
          result,
          sorm.notNull(src)
        ]);
      }

      return result;
    }
  },
  and(args: TQueryValueOrSelectArray[]): TQueryValueOrSelectArray {
    const result: TQueryValueOrSelectArray = [];
    for (const arg of args) {
      const queryValue = QueryUtil.getQueryValue(arg);
      if (queryValue) {
        result.push(...[queryValue, " AND "]);
      }
    }
    return result.slice(0, -1);
  },
  or(args: TQueryValueOrSelectArray[]): TQueryValueOrSelectArray {
    const result: TQueryValueOrSelectArray = [];
    for (const arg of args) {
      const queryValue = QueryUtil.getQueryValue(arg);
      result.push(...[queryValue, " OR "]);
    }
    return result.slice(0, -1);
  },

  //region Field query
  is(where: TQueryValueOrSelectArray): QueryUnit<Boolean, TEntityValueOrQueryableArray> {
    return sorm.case(where, true).else(false);
  },
  dateDiff<T extends DateTime | DateOnly | Time>(separator: TDbDateSeparator, from: TEntityValue<T>, to: TEntityValue<T>): QueryUnit<Number, TEntityValueOrQueryableArray> {
    return new QueryUnit(Number, ["DATEDIFF(", separator, ", ", QueryUtil.getQueryValue(from), ", ", QueryUtil.getQueryValue(to), ")"]);
  },
  dateAdd<T extends DateTime | DateOnly | Time>(separator: TDbDateSeparator, from: TEntityValue<T>, value: TEntityValue<number>): QueryUnit<DateOnly, TEntityValueOrQueryableArray> {
    return new QueryUnit(DateOnly, ["DATEADD(", separator, ", ", QueryUtil.getQueryValue(value), ", ", QueryUtil.getQueryValue(from), ")"]);
  },
  ifNull<S extends TQueryValue, T extends TQueryValue>(source: TEntityValue<S>, ...targets: TEntityValue<T>[]): QueryUnit<S | T, TEntityValueOrQueryableArray> {
    let cursorQuery = QueryUtil.getQueryValue(source) as TEntityValueOrQueryableArray;
    let type = QueryUtil.getQueryValueType(source);

    for (const target of targets) {
      cursorQuery = ["ISNULL(", cursorQuery, ", ", QueryUtil.getQueryValue(target), ")"];
      type = type ?? QueryUtil.getQueryValueType(target);
    }

    return new QueryUnit<S | T, TEntityValueOrQueryableArray>(type, cursorQuery);
  },
  case<T extends TEntityValueOrQueryable | TEntityValueOrQueryableArray>(predicate: TEntityValue<boolean | Boolean> | TQueryValueOrSelectArray, then: TEntityValue<T>): CaseQueryable<T> {
    const type = QueryUtil.getQueryValueType(then);
    const caseQueryable = new CaseQueryable<T>(type as Type<T>);
    return caseQueryable.case(predicate, then);
  },
  dataLength<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<Number, TEntityValueOrQueryableArray> {
    return new QueryUnit(Number, ["DATALENGTH(", QueryUtil.getQueryValue(arg), ")"]);
  },
  stringLength(arg: TEntityValue<String | string>): QueryUnit<Number, TEntityValueOrQueryableArray> {
    return new QueryUnit(Number, ["LEN(", QueryUtil.getQueryValue(arg), ")"]);
  },
  cast<T extends TQueryValue>(src: TEntityValue<TQueryValue>, targetType: Type<T>): QueryUnit<T, TEntityValueOrQueryableArray> {
    return new QueryUnit(targetType, ["CONVERT(", QueryUtil.getDataType(targetType), ", ", QueryUtil.getQueryValue(src), ")"]);
  },
  left(src: TEntityValue<string | String | undefined>, num: TEntityValue<number | Number>): QueryUnit<String, TEntityValueOrQueryableArray> {
    return new QueryUnit(String, ["LEFT(", QueryUtil.getQueryValue(src), ", ", QueryUtil.getQueryValue(num), ")"]);
  },
  right(src: TEntityValue<string | String | undefined>, num: TEntityValue<number | Number>): QueryUnit<String, TEntityValueOrQueryableArray> {
    return new QueryUnit(String, ["RIGHT(", QueryUtil.getQueryValue(src), ", ", QueryUtil.getQueryValue(num), ")"]);
  },
  replace(src: TEntityValue<string | String | undefined>, from: TEntityValue<String | string>, to: TEntityValue<String | string>): QueryUnit<String, TEntityValueOrQueryableArray> {
    return new QueryUnit(String, [
      "REPLACE(",
      QueryUtil.getQueryValue(src), ", ",
      QueryUtil.getQueryValue(from), ", ",
      QueryUtil.getQueryValue(to),
      ")"
    ]);
  },
  //endregion

  //region Grouping select
  count<T extends TQueryValue>(arg?: TEntityValue<T>): QueryUnit<Number, TEntityValueOrQueryable | TEntityValueOrQueryableArray> {
    if (arg) {
      return new QueryUnit(Number, ["COUNT(DISTINCT(", QueryUtil.getQueryValue(arg), "))"]);
    }
    else {
      return new QueryUnit(Number, "COUNT(*)");
    }
  },
  sum<T extends number | Number>(arg: TEntityValue<T | undefined>): QueryUnit<Number, TEntityValueOrQueryableArray> {
    return new QueryUnit(Number, ["SUM(", QueryUtil.getQueryValue(arg), ")"]);
  },
  max<T extends number | Number | string | String | DateOnly | DateTime | Time>(unit: TEntityValue<T | undefined>): QueryUnit<T, TEntityValueOrQueryableArray> | undefined {
    const type = QueryUtil.getQueryValueType(unit);
    if (!type) {
      throw new TypeError();
    }

    return new QueryUnit(type as Type<T>, ["MAX(", QueryUtil.getQueryValue(unit), ")"]);
  },
  min<T extends number | Number | string | String | DateOnly | DateTime | Time>(unit: TEntityValue<T | undefined>): QueryUnit<T, TEntityValueOrQueryableArray> | undefined {
    const type = QueryUtil.getQueryValueType(unit);
    if (!type) {
      throw new TypeError();
    }

    return new QueryUnit(type as Type<T>, ["MIN(", QueryUtil.getQueryValue(unit), ")"]);
  },
  exists<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<Boolean, TEntityValueOrQueryableArray> {
    return sorm.case(sorm.greaterThen(sorm.ifNull(sorm.count(arg), 0), 0), true as boolean).else(false);
  },
  notExists<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<Boolean, TEntityValueOrQueryableArray> {
    return sorm.case(sorm.lessThenOrEqual(sorm.ifNull(sorm.count(arg), 0), 0), true as boolean).else(false);
  }
  //endregion
};

export type TDbDateSeparator =
  "year"
  | "quarter"
  | "month"
  | "day"
  | "week"
  | "hour"
  | "minute"
  | "second"
  | "millisecond"
  | "microsecond"
  | "nanosecond";


export class CaseQueryable<T extends TEntityValueOrQueryable | TEntityValueOrQueryableArray> {
  private readonly _cases: TEntityValueOrQueryableArray = [];

  public constructor(private _type: Type<T> | undefined) {
  }

  public case(predicate: TEntityValue<boolean | Boolean> | TQueryValueOrSelectArray, then: TEntityValue<T>): CaseQueryable<T> {
    this._type = QueryUtil.getQueryValueType(then);

    this._cases.push(...[" WHEN ", QueryUtil.getQueryValue(predicate), " THEN ", QueryUtil.getQueryValue(then)]);
    return this;
  }

  public else(then: TEntityValue<T>): QueryUnit<T, TEntityValueOrQueryableArray> {
    this._type = QueryUtil.getQueryValueType(then);
    return new QueryUnit<T, TEntityValueOrQueryableArray>(this._type, ["CASE ", ...this._cases, " ELSE ", QueryUtil.getQueryValue(then), " END"]) as any;
  }
}
