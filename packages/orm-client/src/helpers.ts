import {DateOnly, Time, Type, Uuid} from "@simplism/core";
import {ITableDef} from "./decorators";
import {QueryUnit} from "./QueryUnit";
import * as tedious from "tedious";

export const helpers = {
  query(val: any): string {
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
    else if (val instanceof QueryUnit) {
      return val.query;
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
      case DateOnly:
        return "DATE";
      case Time:
        return "TIME";
      case Uuid:
        return "UNIQUEIDENTIFIER";
      case Buffer:
        return "VARBINARY";
      default:
        throw new TypeError(type ? type.name : "undefined");
    }
  },

  getTediousTypeFromDataType(dataType: string): { type: tedious.TediousType; length?: number } {
    if (dataType.startsWith("NVARCHAR")) {
      const lengthMatch = dataType.match(/\(([0-9]*)\)/) || undefined;
      return {type: tedious.TYPES.NVarChar, length: lengthMatch && Number(lengthMatch[1])};
    }
    else if (dataType === "INT") {
      return {type: tedious.TYPES.Int};
    }
    else if (dataType === "BIT") {
      return {type: tedious.TYPES.Bit};
    }
    else if (dataType === "UNIQUEIDENTIFIER") {
      return {type: tedious.TYPES.UniqueIdentifier};
    }

    throw new TypeError(dataType);
  }
};