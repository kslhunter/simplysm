import { describe, it, expect } from "vitest";
import { MysqlExprRenderer } from "../src/query-builder/mysql/mysql-expr-renderer";
import type { DataType } from "../src/types/column";
import { expr } from "../src/expr/expr";
import { createTestDb } from "./setup/TestDbContext";
import type { Bytes, DateOnly, DateTime, Time, Uuid } from "@simplysm/core-common";

// 타입 일치 단언 (plain typecheck에서 검증 — vitest typecheck 미설정이므로 expectTypeOf 대신 사용)
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
function assertType<_T extends true>(): void {}

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

// expr.cast 의 결과 타입(소비자가 select 결과로 받는 타입)을 고정한다.
// 시그니처를 누가 lighten/단순화하면 아래 단언이 typecheck 에서 깨져 회귀를 잡는다.
describe("expr.cast 결과 타입 추론", () => {
  it("targetType → ColumnPrimitive 매핑 (non-null source)", () => {
    const db = createTestDb();
    // User.id: bigint NOT NULL → ExprUnit<number>
    const q = db.user().select((c) => ({
      toInt: expr.cast(c.id, { type: "int" }),
      toBigint: expr.cast(c.id, { type: "bigint" }),
      toFloat: expr.cast(c.id, { type: "float" }),
      toDouble: expr.cast(c.id, { type: "double" }),
      toDecimal: expr.cast(c.id, { type: "decimal", precision: 10 }),
      toVarchar: expr.cast(c.id, { type: "varchar", length: 10 }),
      toChar: expr.cast(c.id, { type: "char", length: 5 }),
      toText: expr.cast(c.id, { type: "text" }),
      toBinary: expr.cast(c.id, { type: "binary" }),
      toBoolean: expr.cast(c.id, { type: "boolean" }),
      toDatetime: expr.cast(c.id, { type: "datetime" }),
      toDate: expr.cast(c.id, { type: "date" }),
      toTime: expr.cast(c.id, { type: "time" }),
      toUuid: expr.cast(c.id, { type: "uuid" }),
    }));

    type Row = Awaited<ReturnType<typeof q.execute>>[number];

    assertType<Equal<Row["toInt"], number>>();
    assertType<Equal<Row["toBigint"], number>>();
    assertType<Equal<Row["toFloat"], number>>();
    assertType<Equal<Row["toDouble"], number>>();
    assertType<Equal<Row["toDecimal"], number>>();
    assertType<Equal<Row["toVarchar"], string>>();
    assertType<Equal<Row["toChar"], string>>();
    assertType<Equal<Row["toText"], string>>();
    assertType<Equal<Row["toBinary"], Bytes>>();
    assertType<Equal<Row["toBoolean"], boolean>>();
    assertType<Equal<Row["toDatetime"], DateTime>>();
    assertType<Equal<Row["toDate"], DateOnly>>();
    assertType<Equal<Row["toTime"], Time>>();
    assertType<Equal<Row["toUuid"], Uuid>>();

    expect(q).toBeDefined();
  });

  it("nullability 전파 — non-null source는 non-null, nullable source는 undefined 전파", () => {
    const db = createTestDb();
    // User.id: bigint NOT NULL → number / User.age: int nullable → number | undefined
    const q = db.user().select((c) => ({
      fromNonNull: expr.cast(c.id, { type: "bigint" }),
      fromNullable: expr.cast(c.age, { type: "bigint" }),
      fromNullableToStr: expr.cast(c.age, { type: "varchar", length: 10 }),
    }));

    type Row = Awaited<ReturnType<typeof q.execute>>[number];

    assertType<Equal<Row["fromNonNull"], number>>();
    assertType<Equal<Row["fromNullable"], number | undefined>>();
    assertType<Equal<Row["fromNullableToStr"], string | undefined>>();

    expect(q).toBeDefined();
  });
});
