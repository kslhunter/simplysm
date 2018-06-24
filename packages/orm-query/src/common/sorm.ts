import {QueryUnit} from "../query-builder/QueryUnit";
import {QueriedBoolean, QueryType} from "./types";
import {queryHelpers} from "./queryHelpers";

export const sorm = {
  equal<T extends QueryType>(source: T, target: T): boolean {
    return new QueryUnit(QueriedBoolean, queryHelpers.getFieldQuery(source) + " = " + queryHelpers.getFieldQuery(target)) as any;
  },
  or<T extends QueryType>(arg: boolean[]): boolean {
    return new QueryUnit(QueriedBoolean, "(" + arg.map(item => queryHelpers.getWhereQuery(item)).join(") OR (") + ")") as any;
  },
  count<T extends QueryType>(arg?: T): number | undefined {
    if (arg) {
      return new QueryUnit(Number as any, "COUNT(DISTINCT(" + queryHelpers.getFieldQuery(arg) + "))") as any;
    }
    else {
      return new QueryUnit(Number as any, "COUNT(*)") as any;
    }
  }
};