import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./delete.expected";

describe("TRUNCATE", () => {
  describe("delete entire table (TRUNCATE)", () => {
    const db = createTestDb();

    const def = db.getTruncateQueryDef({
      database: "TestDb",
      schema: "TestSchema",
      name: "Employee",
    });

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "truncate",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.truncate[dialect]);
    });
  });
});

describe("DELETE - Basic", () => {
  describe("simple DELETE", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getDeleteQueryDef();

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "delete",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteSimple[dialect]);
    });
  });

  describe("DELETE with multiple conditions", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1), expr.null(e.managerId)])
      .getDeleteQueryDef();

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "delete",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "departmentId"] },
            target: { type: "value", value: 1 },
          },
          {
            type: "null",
            arg: { type: "column", path: ["T1", "managerId"] },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteMultiCond[dialect]);
    });
  });

  describe("output column specified", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getDeleteQueryDef(["id", "name"]);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "delete",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
        output: {
          columns: ["id", "name"],
          pkColNames: ["id"],
          aiColName: "id",
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteWithOutput[dialect]);
    });
  });

  describe("Limit delete count with TOP", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1)])
      .top(100)
      .getDeleteQueryDef();

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "delete",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        top: 100,
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "departmentId"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteWithTop[dialect]);
    });
  });
});
