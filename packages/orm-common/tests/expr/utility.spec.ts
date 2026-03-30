import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./utility.expected";

describe("Expr - 유틸리티 함수", () => {
  //#region ========== ROW_NUM ==========

  describe("rowNum - row number (without window)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        rowNum: expr.rowNum(),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rowNum[dialect]);
    });
  });

  //#endregion

  //#region ========== RANDOM ==========

  describe("random - random value", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        randomVal: expr.random(),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.random[dialect]);
    });
  });

  //#endregion

  //#region ========== CAST ==========

  describe("cast - type conversion to INT", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        ageInt: expr.cast(item.age, { type: "int" }),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.castToInt[dialect]);
    });
  });

  //#endregion

  //#region ========== RAW ==========

  describe("raw - Basic raw SQL", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        serverTime: expr.raw("DateTime")`NOW()`,
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rawBasic[dialect]);
    });
  });

  describe("raw - raw SQL with parameters", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        combined: expr.raw("string")`CONCAT(${item.name}, ' - ', ${item.email})`,
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rawWithParam[dialect]);
    });
  });

  //#endregion
});
