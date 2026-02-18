import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./delete.expected";

describe("TRUNCATE", () => {
  describe("테이블 전체 삭제 (TRUNCATE)", () => {
    const db = createTestDb();

    const def = db.getTruncateQueryDef({
      database: "TestDb",
      schema: "TestSchema",
      name: "Employee",
    });

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "truncate",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.truncate[dialect]);
    });
  });
});

describe("DELETE - 기본", () => {
  describe("단순 DELETE", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getDeleteQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteSimple[dialect]);
    });
  });

  describe("여러 조건으로 DELETE", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1), expr.null(e.managerId)])
      .getDeleteQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteMultiCond[dialect]);
    });
  });

  describe("output 컬럼 지정", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getDeleteQueryDef(["id", "name"]);

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteWithOutput[dialect]);
    });
  });

  describe("TOP으로 삭제 개수 제한", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1)])
      .top(100)
      .getDeleteQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.deleteWithTop[dialect]);
    });
  });
});
