import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./utility.expected";

describe("Expr - Utility functions", () => {
  //#region ========== ROW_NUM ==========

  describe("rowNum - 행 번호 (윈도우 없이)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        rowNum: expr.rowNum(),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        id: { type: "column", path: ["T1", "id"] },
        rowNum: { type: "rowNum" },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rowNum[dialect]);
    });
  });

  //#endregion

  //#region ========== RANDOM ==========

  describe("random - 랜덤 값", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        randomVal: expr.random(),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        id: { type: "column", path: ["T1", "id"] },
        randomVal: { type: "random" },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.random[dialect]);
    });
  });

  //#endregion

  //#region ========== CAST ==========

  describe("cast - INT로 타입 변환", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        ageInt: expr.cast(item.age, { type: "int" }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        id: { type: "column", path: ["T1", "id"] },
        ageInt: {
          type: "cast",
          source: { type: "column", path: ["T1", "age"] },
          targetType: { type: "int" },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.castToInt[dialect]);
    });
  });

  describe("cast - VARCHAR로 타입 변환", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        ageStr: expr.cast(item.age, { type: "varchar", length: 50 }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        id: { type: "column", path: ["T1", "id"] },
        ageStr: {
          type: "cast",
          source: { type: "column", path: ["T1", "age"] },
          targetType: { type: "varchar", length: 50 },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.castToVarchar[dialect]);
    });
  });

  //#endregion

  //#region ========== RAW ==========

  describe("raw - 기본 raw SQL", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        serverTime: expr.raw("DateTime")`NOW()`,
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        id: { type: "column", path: ["T1", "id"] },
        serverTime: {
          type: "raw",
          sql: "NOW()",
          params: [],
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rawBasic[dialect]);
    });
  });

  describe("raw - 파라미터가 있는 raw SQL", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        combined: expr.raw("string")`CONCAT(${item.name}, ' - ', ${item.email})`,
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        id: { type: "column", path: ["T1", "id"] },
        combined: {
          type: "raw",
          sql: "CONCAT($1, ' - ', $2)",
          params: [
            { type: "column", path: ["T1", "name"] },
            { type: "column", path: ["T1", "email"] },
          ],
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rawWithParam[dialect]);
    });
  });

  //#endregion
});
