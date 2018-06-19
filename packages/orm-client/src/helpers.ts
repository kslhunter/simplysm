import {DateOnly, DateTime, Time, Type, Uuid} from "@simplism/core";
import {ITableDef} from "./decorators";
import {QueryUnit} from "./QueryUnit";
import {QueriedBoolean} from "./Queryable";

export const helpers = {
  query(val: any, replaceQueriedBooleanToBoolean?: boolean): string {
    if (val == undefined) {
      return "NULL";
    }
    else if (typeof val === "string") {
      return "'" + val + "'";
    }
    else if (typeof val === "number") {
      return val.toString();
    }
    else if (typeof val === "boolean") {
      return val ? "1" : "0";
    }
    else if (val instanceof DateTime) {
      return val.toFormatString("'yyyy-MM-dd HH:mm:ss'");
    }
    else if (val instanceof DateOnly) {
      return val.toFormatString("'yyyy-MM-dd'");
    }
    else if (val instanceof Time) {
      return val.toFormatString("'HH:mm:ss'");
    }
    else if (val instanceof Uuid) {
      return val.toString();
    }
    else if (val instanceof Buffer) {
      return `0x${val.toString("hex")}`;
    }
    else if (val instanceof QueryUnit) {
      if (val.type === QueriedBoolean && replaceQueriedBooleanToBoolean) {
        return "CASE WHEN " + val.query + " THEN 1 ELSE 0 END";
      }
      else {
        return val.query;
      }
    }
    throw new TypeError(val);
  },

  key(chainsText: string): string {
    const strip = chainsText.replace(/[\[\]]/g, "");
    const split = strip.split(".");
    if (split.length > 1) {
      return "[" + split.slice(0, -1).join(".") + "].[" + split.last() + "]";
    }
    else {
      return "[" + split[0] + "]";
    }
  },

  tableKey(tableDef: ITableDef): string {
    return `[${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}]`;
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