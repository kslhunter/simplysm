import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import * as expected from "./order.expected";

describe("SELECT - ORDER BY", () => {
  //#region ========== 기본 ORDER BY ==========

  describe("ASC (기본값)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id)
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "column", path: ["T1", "id"] }]],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderAscDefault[dialect]);
    });
  });

  describe("ASC (명시적)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id, "ASC")
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderAscExplicit[dialect]);
    });
  });

  describe("DESC", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id, "DESC")
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "column", path: ["T1", "id"] }, "DESC"]],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderDesc[dialect]);
    });
  });

  //#endregion

  //#region ========== 다중 정렬 ==========

  describe("다중 정렬", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.name, "ASC")
      .orderBy((item) => item.id, "DESC")
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [
          [{ type: "column", path: ["T1", "name"] }, "ASC"],
          [{ type: "column", path: ["T1", "id"] }, "DESC"],
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderMultiple[dialect]);
    });
  });

  //#endregion

  //#region ========== 표현식 정렬 ==========

  describe("표현식으로 정렬", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => expr.length(item.name), "DESC")
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "length", arg: { type: "column", path: ["T1", "name"] } }, "DESC"]],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderExpression[dialect]);
    });
  });

  //#endregion

  //#region ========== 조합 ==========

  describe("SELECT + ORDER BY 조합", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({ id: item.id, name: item.name }))
      .orderBy((item) => item.name, "ASC")
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
        },
        orderBy: [[{ type: "column", path: ["T1", "name"] }, "ASC"]],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderSelectCombo[dialect]);
    });
  });

  describe("ORDER BY + LIMIT 조합", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id, "DESC")
      .limit(0, 10)
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "column", path: ["T1", "id"] }, "DESC"]],
        limit: [0, 10],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderLimitCombo[dialect]);
    });
  });

  //#endregion
});
