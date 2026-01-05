import { DateOnly, DateTime, Time, Uuid } from "@simplysm/sd-core-common";
import type { TDialect } from "@simplysm/orm-common";

/**
 * JS 값을 SQL 쿼리 문자열로 변환하는 유틸리티
 */
export class QueryValueConverter {
  constructor(private readonly _dialect: TDialect) {}

  convert(value: unknown): string {
    if (value == null) {
      return "NULL";
    }

    if (typeof value === "string") {
      return this._escapeString(value);
    }

    if (typeof value === "number" || typeof value === "bigint") {
      return value.toString();
    }

    if (typeof value === "boolean") {
      return this._convertBoolean(value);
    }

    if (value instanceof DateTime) {
      return this._escapeString(value.toFormatString("yyyy-MM-dd HH:mm:ss"));
    }

    if (value instanceof DateOnly) {
      return this._escapeString(value.toFormatString("yyyy-MM-dd"));
    }

    if (value instanceof Time) {
      return this._escapeString(value.toFormatString("HH:mm:ss"));
    }

    if (value instanceof Uuid) {
      return this._escapeString(value.toString());
    }

    if (Buffer.isBuffer(value)) {
      return this._convertBuffer(value);
    }

    throw new Error(`지원하지 않는 값 타입: ${typeof value}`);
  }

  private _escapeString(str: string): string {
    // 싱글쿼트 이스케이프 (모든 DB 공통)
    return `'${str.replace(/'/g, "''")}'`;
  }

  private _convertBoolean(value: boolean): string {
    switch (this._dialect) {
      case "mysql":
      case "postgresql":
        return value ? "TRUE" : "FALSE";
      case "mssql":
        return value ? "1" : "0";
    }
  }

  private _convertBuffer(buffer: Buffer): string {
    const hex = buffer.toString("hex");
    switch (this._dialect) {
      case "mysql":
        return `X'${hex}'`;
      case "mssql":
        return `0x${hex}`;
      case "postgresql":
        return `'\\x${hex}'::bytea`;
    }
  }
}