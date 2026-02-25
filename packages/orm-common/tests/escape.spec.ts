import { describe, it, expect } from "vitest";
import { MysqlExprRenderer } from "../src/query-builder/mysql/mysql-expr-renderer";

describe("MysqlExprRenderer.escapeString", () => {
  const renderer = new MysqlExprRenderer(() => "");

  //#region ========== Basic Escaping ==========

  it("should escape quotes", () => {
    const result = renderer.escapeString("O'Reilly");
    expect(result).toBe("O''Reilly");
  });

  it("should escape backslashes", () => {
    const result = renderer.escapeString("C:\\path");
    expect(result).toBe("C:\\\\path");
  });

  it("should escape NULL bytes", () => {
    const result = renderer.escapeString("admin\0--");
    expect(result).toBe("admin\\0--");
  });

  //#endregion

  //#region ========== Control Character Escaping ==========

  it("should escape newlines", () => {
    const result = renderer.escapeString("line1\nline2");
    expect(result).toBe("line1\\nline2");
  });

  it("should escape carriage returns", () => {
    const result = renderer.escapeString("line1\rline2");
    expect(result).toBe("line1\\rline2");
  });

  it("should escape tabs", () => {
    const result = renderer.escapeString("col1\tcol2");
    expect(result).toBe("col1\\tcol2");
  });

  //#endregion

  //#region ========== Combined Attack Test ==========

  it("should defend against SQL injection attempts", () => {
    const malicious = "'; DROP TABLE users; --";
    const result = renderer.escapeString(malicious);
    expect(result).toBe("''; DROP TABLE users; --");
  });

  it("백슬래시와 따옴표 조합을 방어해야 함", () => {
    const malicious = "\\'";
    const result = renderer.escapeString(malicious);
    expect(result).toBe("\\\\''");
  });

  it("NULL 바이트와 SQL 주석 조합을 방어해야 함", () => {
    const malicious = "admin\0-- ";
    const result = renderer.escapeString(malicious);
    expect(result).toBe("admin\\0-- ");
  });

  //#endregion
});

describe("MysqlExprRenderer.escapeValue", () => {
  const renderer = new MysqlExprRenderer(() => "");

  it("문자열을 escapeString()으로 이스케이프하고 따옴표로 감싸야 함", () => {
    const result = renderer.escapeValue("O'Reilly");
    expect(result).toBe("'O''Reilly'");
  });

  it("백슬래시가 포함된 문자열을 올바르게 이스케이프해야 함", () => {
    const result = renderer.escapeValue("C:\\path");
    expect(result).toBe("'C:\\\\path'");
  });

  it("SQL 인젝션 시도를 방어해야 함", () => {
    const result = renderer.escapeValue("'; DROP TABLE users; --");
    expect(result).toBe("'''; DROP TABLE users; --'");
  });

  it("NULL을 'NULL' 문자열로 반환해야 함", () => {
    const result = renderer.escapeValue(null);
    expect(result).toBe("NULL");
  });

  it("Number를 문자열로 conversion해야 함", () => {
    const result = renderer.escapeValue(123);
    expect(result).toBe("123");
  });

  it("불리언을 TRUE/FALSE로 conversion해야 함", () => {
    expect(renderer.escapeValue(true)).toBe("TRUE");
    expect(renderer.escapeValue(false)).toBe("FALSE");
  });
});
