import {Type} from "@simplism/core";
import {helpers} from "./helpers";
import {QueryUnit} from "./QueryUnit";

export const sorm = {
  equal<T>(source: T | QueryUnit<T>, target: T | QueryUnit<T>): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, helpers.query(source) + " = " + helpers.query(target));
  },

  includes(source: string | QueryUnit<string>, target: string | QueryUnit<string>): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, helpers.query(source) + " LIKE '%' + " + helpers.query(target) + " + '%'");
  },

  and(arr: QueryUnit<Boolean>[]): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, arr.map(item => "(" + helpers.query(item) + ")").join(" AND "));
  },

  or(arr: QueryUnit<Boolean>[]): QueryUnit<Boolean> {
    return new QueryUnit(Boolean, arr.map(item => "(" + helpers.query(item) + ")").join(" OR "));
  },

  cast<P>(src: any, targetType: Type<P>): QueryUnit<P> {
    return new QueryUnit(targetType, `CONVERT(${helpers.getDataTypeFromType(targetType)}, ${helpers.query(src)})`);
  }
};