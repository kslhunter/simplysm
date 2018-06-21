import {QueryUnit} from "./QueryUnit";
import {QueryType} from "./types";

export const queryHelpers = {
  getFieldQuery(arg: QueryType | QueryUnit<QueryType>): string {
    if (arg instanceof QueryUnit) {
      return arg.query;
    }
    else if (arg == undefined) {
      return "NULL";
    }
    else if (typeof arg === "string") {
      return "'" + arg + "'";
    }
    else if (typeof arg === "number") {
      return arg.toString();
    }
    else if (typeof arg === "boolean") {
      return arg ? "1" : "0";
    }
    else {
      throw new TypeError(arg.constructor ? arg.constructor.name : typeof arg);
    }
  },

  getWhereQuery(arg: QueryType | QueryUnit<QueryType>): string {
    if (arg instanceof QueryUnit) {
      return arg.queryForWhere;
    }

    return this.getFieldQuery(arg);
  }
};