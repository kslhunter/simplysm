import {QueryUnit} from "../query-builder/QueryUnit";
import {QueriedBoolean, QueryType} from "./types";
import {ormHelpers} from "./ormHelpers";

export const sorm = {
  equal<T extends QueryType>(source: T, target: T): boolean {
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " = " + ormHelpers.getFieldQuery(target)) as any;
  },
  or<T extends QueryType>(arg: boolean[]): boolean {
    return new QueryUnit(QueriedBoolean, "(" + arg.map(item => ormHelpers.getWhereQuery(item)).join(") OR (") + ")") as any;
  },
  count<T extends QueryType>(arg?: T): number | undefined {
    if (arg) {
      return new QueryUnit(Number as any, "COUNT(DISTINCT(" + ormHelpers.getFieldQuery(arg) + "))") as any;
    }
    else {
      return new QueryUnit(Number as any, "COUNT(*)") as any;
    }
  }
};