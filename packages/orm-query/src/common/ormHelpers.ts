import {QueryUnit} from "../query-builder/QueryUnit";
import {QueryType} from "./types";
import {DateOnly, DateTime, optional, Time, Type, Uuid} from "@simplism/core";

export const ormHelpers = {
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
  },

  getDataTypeFromType(type: Type<any>): string {
    switch (type) {
      case String:
        return "NVARCHAR(255)";
      case Number:
        return "INT";
      case Boolean:
        return "BIT";
      case Date:
        return "DATETIME";
      case DateTime:
        return "DATETIME";
      case DateOnly:
        return "DATE";
      case Time:
        return "TIME";
      case Uuid:
        return "UNIQUEIDENTIFIER";
      case Buffer:
        return "VARBINARY(MAX)";
      default:
        throw new TypeError(type ? type.name : "undefined");
    }
  }
};