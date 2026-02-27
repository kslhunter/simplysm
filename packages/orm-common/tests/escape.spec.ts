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

  it("should defend against backslash + quote combination", () => {
    const malicious = "\\'";
    const result = renderer.escapeString(malicious);
    expect(result).toBe("\\\\''");
  });

  it("should defend against NULL byte + SQL comment combination", () => {
    const malicious = "admin\0-- ";
    const result = renderer.escapeString(malicious);
    expect(result).toBe("admin\\0-- ");
  });

  //#endregion
});

describe("MysqlExprRenderer.escapeValue", () => {
  const renderer = new MysqlExprRenderer(() => "");

  it("escapes string with escapeString() and wraps in quotes", () => {
    const result = renderer.escapeValue("O'Reilly");
    expect(result).toBe("'O''Reilly'");
  });

  it("correctly escapes string containing backslashes", () => {
    const result = renderer.escapeValue("C:\\path");
    expect(result).toBe("'C:\\\\path'");
  });

  it("defends against SQL injection attempts", () => {
    const result = renderer.escapeValue("'; DROP TABLE users; --");
    expect(result).toBe("'''; DROP TABLE users; --'");
  });

  it("returns 'NULL' string for null", () => {
    const result = renderer.escapeValue(null);
    expect(result).toBe("NULL");
  });

  it("converts number to string", () => {
    const result = renderer.escapeValue(123);
    expect(result).toBe("123");
  });

  it("converts boolean to TRUE/FALSE", () => {
    expect(renderer.escapeValue(true)).toBe("TRUE");
    expect(renderer.escapeValue(false)).toBe("FALSE");
  });
});
