import * as mssql from "mssql";
import {DateOnly, Time, Type, Uuid} from "../../../sd-core/src";
import {DataType} from "./Enums";

export class QueryHelper {
    public static convertToDataType(type: Type<any>): DataType {
        switch (type) {
            case String:
                return DataType.NVARCHAR;
            case Number:
                return DataType.INT;
            case Boolean:
                return DataType.BIT;
            case Date:
                return DataType.DATETIME;
            case DateOnly:
                return DataType.DATE;
            case Time:
                return DataType.TIME;
            case Uuid:
                return DataType.UNIQUEIDENTIFIER;
            case Buffer:
                return DataType.VARBINARY;
            default:
                throw new TypeError(type ? type.name : "undefined");
        }
    }

    public static convertFromDataType(type: DataType | string): Type<any> {
        if (type === DataType.NVARCHAR || type.includes("CHAR") || type === "TEXT") {
            return String;
        }
        else if (type === DataType.INT || type.startsWith("INT") || type.startsWith("DECIMAL") || type.startsWith("NUMERIC")) {
            return Number;
        }
        else if (type === DataType.BIT || type.startsWith("BIT")) {
            return Boolean;
        }
        else if (type === DataType.DATETIME || type.startsWith("DATETIME")) {
            return Date;
        }
        else if (type === DataType.DATE || type.startsWith("DATE")) {
            return DateOnly;
        }
        else if (type === DataType.TIME || type.startsWith("TIME")) {
            return Time;
        }
        else if (type === DataType.UNIQUEIDENTIFIER || type.startsWith("UNIQUEIDENTIFIER")) {
            return Uuid;
        }
        else if (type === DataType.VARBINARY || type.startsWith("VARBINARY")) {
            return Buffer;
        }
        else {
            throw new TypeError(type);
        }
    }

    public static convertToSqlType(type: DataType): mssql.ISqlTypeFactory {
        switch (type) {
            case DataType.NVARCHAR:
                return mssql.NVarChar;
            case DataType.INT:
                return mssql.Int;
            case DataType.BIT:
                return mssql.Bit;
            case DataType.DATETIME:
                return mssql.DateTime;
            case DataType.DATE:
                return mssql.Date;
            case DataType.TIME:
                return mssql.Time;
            case DataType.UNIQUEIDENTIFIER:
                return mssql.UniqueIdentifier;
            case DataType.VARBINARY:
                return mssql.VarBinary;
            default:
                throw new TypeError(type);
        }
    }

    public static escapeKey(...keys: string[]): string {
        return `[${keys.filter((item) => item).join("].[")}]`;
    }

    public static escape(value: any): string {
        if (value === undefined) {
            return "NULL";
        }
        else if (value instanceof Uuid) {
            return `'${value.toString()}'`;
        }
        else if (value instanceof Time) {
            return `'${value.toFormatString("HH:mm:ss.fff")}'`;
        }
        else if (value instanceof Date) {
            return `'${value.toFormatString("yyyy-MM-dd HH:mm:ss.fff")}'`;
        }
        else if (value instanceof DateOnly) {
            return `'${value.toFormatString("yyyy-MM-dd")}'`;
        }
        else if (value instanceof Buffer) {
            return `0x${value.toString("hex")}`;
        }
        else if (value instanceof Array) {
            return value.map((item) => this.escape(item)).join(", ");
        }
        else if (typeof value === "string") {
            return `'${value.replace(/'/g, "''")}'`;
        }
        else if (typeof value === "boolean") {
            return value ? "1" : "0";
        }
        return value;
    }
}