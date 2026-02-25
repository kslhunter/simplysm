import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import * as expected from "./group.expected";

describe("SELECT - GROUP BY", () => {
  //#region ========== 기본 GROUP BY ==========

  describe("단일 컬럼", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          name: { type: "column", path: ["T1", "name"] },
          cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
        },
        groupBy: [{ type: "column", path: ["T1", "name"] }],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupSingle[dialect]);
    });
  });

  describe("다중 컬럼", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        isActive: item.isActive,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name, item.isActive])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          name: { type: "column", path: ["T1", "name"] },
          isActive: { type: "column", path: ["T1", "isActive"] },
          cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
        },
        groupBy: [
          { type: "column", path: ["T1", "name"] },
          { type: "column", path: ["T1", "isActive"] },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupMultiple[dialect]);
    });
  });

  describe("집계 함수들", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
        sumAge: expr.sum(item.age),
        avgAge: expr.avg(item.age),
        minAge: expr.min(item.age),
        maxAge: expr.max(item.age),
      }))
      .groupBy((item) => [item.name])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          name: { type: "column", path: ["T1", "name"] },
          cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
          sumAge: { type: "sum", arg: { type: "column", path: ["T1", "age"] } },
          avgAge: { type: "avg", arg: { type: "column", path: ["T1", "age"] } },
          minAge: { type: "min", arg: { type: "column", path: ["T1", "age"] } },
          maxAge: { type: "max", arg: { type: "column", path: ["T1", "age"] } },
        },
        groupBy: [{ type: "column", path: ["T1", "name"] }],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupAggregate[dialect]);
    });
  });

  //#endregion
});

describe("SELECT - HAVING", () => {
  //#region ========== HAVING ==========

  describe("단일 조건", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name])
      .having((item) => [expr.gt(item.cnt, 5)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          name: { type: "column", path: ["T1", "name"] },
          cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
        },
        groupBy: [{ type: "column", path: ["T1", "name"] }],
        having: [
          {
            type: "gt",
            source: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
            target: { type: "value", value: 5 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.havingSingle[dialect]);
    });
  });

  describe("다중 조건", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
        avgAge: expr.avg(item.age),
      }))
      .groupBy((item) => [item.name])
      .having((item) => [expr.gt(item.cnt, 5), expr.gte(item.avgAge, 25)])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          name: { type: "column", path: ["T1", "name"] },
          cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
          avgAge: { type: "avg", arg: { type: "column", path: ["T1", "age"] } },
        },
        groupBy: [{ type: "column", path: ["T1", "name"] }],
        having: [
          {
            type: "gt",
            source: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
            target: { type: "value", value: 5 },
          },
          {
            type: "gte",
            source: { type: "avg", arg: { type: "column", path: ["T1", "age"] } },
            target: { type: "value", value: 25 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.havingMultiple[dialect]);
    });
  });

  describe("GROUP BY + HAVING + ORDER BY 조합", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name])
      .having((item) => [expr.gt(item.cnt, 1)])
      .orderBy((item) => item.cnt, "DESC")
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          name: { type: "column", path: ["T1", "name"] },
          cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
        },
        groupBy: [{ type: "column", path: ["T1", "name"] }],
        having: [
          {
            type: "gt",
            source: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
            target: { type: "value", value: 1 },
          },
        ],
        orderBy: [[{ type: "count", arg: { type: "column", path: ["T1", "id"] } }, "DESC"]],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.havingOrderCombo[dialect]);
    });
  });

  //#endregion
});
