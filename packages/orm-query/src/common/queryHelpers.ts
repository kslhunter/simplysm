import {QueryUnit} from "../query-builder/QueryUnit";
import {QueryType} from "./types";
import {optional} from "../../../core/src/util/optional";

export const queryHelpers = {
  getFieldQuery(arg: QueryType | QueryUnit<QueryType>): string {
    if (arg instanceof QueryUnit) {
      return arg.query;
    }
    else if (arg === undefined) {
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
      throw new TypeError(optional(arg.constructor, o => o.name) || typeof arg);
    }
  },

  getWhereQuery(arg: QueryType | QueryUnit<QueryType>): string {
    if (arg instanceof QueryUnit) {
      return arg.queryForWhere;
    }

    return this.getFieldQuery(arg);
  }
};