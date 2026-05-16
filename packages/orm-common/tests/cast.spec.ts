import { describe, it, expect } from "vitest";
import { MysqlExprRenderer } from "../src/query-builder/mysql/mysql-expr-renderer";
import type { DataType } from "../src/types/column";

describe("MysqlExprRenderer.cast", () => {
  const renderer = new MysqlExprRenderer(() => "");

  function castSql(targetType: DataType): string {
    return renderer.render({
      type: "cast",
      source: { type: "value", value: 1 },
      targetType,
    });
  }

  it("int → SIGNED", () => {
    expect(castSql({ type: "int" })).toBe("CAST(1 AS SIGNED)");
  });

  it("bigint → SIGNED", () => {
    expect(castSql({ type: "bigint" })).toBe("CAST(1 AS SIGNED)");
  });

  it("float → FLOAT", () => {
    expect(castSql({ type: "float" })).toBe("CAST(1 AS FLOAT)");
  });

  it("double → DOUBLE", () => {
    expect(castSql({ type: "double" })).toBe("CAST(1 AS DOUBLE)");
  });

  it("decimal(precision) → DECIMAL(p)", () => {
    expect(castSql({ type: "decimal", precision: 10 })).toBe("CAST(1 AS DECIMAL(10))");
  });

  it("decimal(precision, scale) → DECIMAL(p, s)", () => {
    expect(castSql({ type: "decimal", precision: 10, scale: 2 })).toBe(
      "CAST(1 AS DECIMAL(10, 2))",
    );
  });

  it("varchar(N) → CHAR(N) COLLATE utf8mb4_bin", () => {
    expect(castSql({ type: "varchar", length: 100 })).toBe(
      "CAST(1 AS CHAR(100)) COLLATE utf8mb4_bin",
    );
  });

  it("char(N) → CHAR(N) COLLATE utf8mb4_bin", () => {
    expect(castSql({ type: "char", length: 5 })).toBe("CAST(1 AS CHAR(5)) COLLATE utf8mb4_bin");
  });

  it("text → CHAR", () => {
    expect(castSql({ type: "text" })).toBe("CAST(1 AS CHAR)");
  });

  it("binary → BINARY", () => {
    expect(castSql({ type: "binary" })).toBe("CAST(1 AS BINARY)");
  });

  it("boolean → SIGNED", () => {
    expect(castSql({ type: "boolean" })).toBe("CAST(1 AS SIGNED)");
  });

  it("datetime → DATETIME", () => {
    expect(castSql({ type: "datetime" })).toBe("CAST(1 AS DATETIME)");
  });

  it("date → DATE", () => {
    expect(castSql({ type: "date" })).toBe("CAST(1 AS DATE)");
  });

  it("time → TIME", () => {
    expect(castSql({ type: "time" })).toBe("CAST(1 AS TIME)");
  });

  it("uuid → BINARY(16)", () => {
    expect(castSql({ type: "uuid" })).toBe("CAST(1 AS BINARY(16))");
  });
});
