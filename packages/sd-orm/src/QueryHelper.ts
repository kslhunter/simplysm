import {DateOnly, DateTime, JsonConvert, optional, Time, Type, Uuid} from "@simplysm/sd-core";
import {QueryType} from "./commons";
import {QueryUnit} from "./QueryUnit";

export class QueryHelper {
  public static getFieldQuery(arg: QueryType | QueryUnit<QueryType>): string {
    if (arg instanceof QueryUnit) {
      return arg.query;
    }
    else if (arg === undefined) {
      return "NULL";
    }
    else if (typeof arg === "string") {
      return "N'" + arg.replace(/'/g, "''") + "'";
    }
    else if (typeof arg === "number") {
      return arg.toString();
    }
    else if (typeof arg === "boolean") {
      return arg ? "1" : "0";
    }
    else if (arg instanceof DateTime) {
      return "'" + arg.toFormatString("yyyy-MM-dd HH:mm:ss") + "'";
      // "select"할때 어차피 "fff"를 못가져오는 관계로, 아래 코드 주석
      // (차후에 "tedious"가 업데이트 되면, 다시 "fff를 넣어야 할 수도 있음)
      // return "'" + arg.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + "'";
    }
    else if (arg instanceof DateOnly) {
      return "'" + arg.toFormatString("yyyy-MM-dd") + "'";
    }
    else if (arg instanceof Time) {
      return "'" + arg.toFormatString("HH:mm:ss") + "'";
    }
    else if (arg instanceof Buffer) {
      return `0x${arg.toString("hex")}`;
    }
    else if (arg instanceof Uuid) {
      return "'" + arg.toString() + "'";
    }
    else {
      throw new TypeError(`${optional(() => arg.constructor.name) || typeof arg}: ${arg}: ${JsonConvert.stringify(arg)}`);
    }
  }

  public static getWhereQuery(arg: QueryType | QueryUnit<QueryType>): string {
    if (arg instanceof QueryUnit) {
      return arg.queryForWhere;
    }

    return QueryHelper.getFieldQuery(arg);
  }

  public static getDataTypeFromType(type: Type<any>): string {
    switch (type) {
      case String:
        return "NVARCHAR(255)";
      case Number:
        return "INT";
      case Boolean:
        return "BIT";
      case Date:
        return "DATETIME2";
      case DateTime:
        return "DATETIME2";
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
}
