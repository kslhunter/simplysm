import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./pivot.expected";

describe("SELECT - PIVOT (groupBy + switch)", () => {
  describe("Basic (SUM)", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .groupBy((item) => [item.id, item.category])
      .select((item) => ({
        id: item.id,
        category: item.category,
        y2020: expr.sum(expr.if(expr.eq(item.year, 2020), item.amount, undefined)),
        y2021: expr.sum(expr.if(expr.eq(item.year, 2021), item.amount, undefined)),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Sales" },
        groupBy: [
          { type: "column", path: ["T1", "id"] },
          { type: "column", path: ["T1", "category"] },
        ],
        select: {
          id: { type: "column", path: ["T1", "id"] },
          category: { type: "column", path: ["T1", "category"] },
          y2020: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "year"] },
                target: { type: "value", value: 2020 },
              },
              then: { type: "column", path: ["T1", "amount"] },
              else: { type: "value", value: undefined },
            },
          },
          y2021: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "year"] },
                target: { type: "value", value: 2021 },
              },
              then: { type: "column", path: ["T1", "amount"] },
              else: { type: "value", value: undefined },
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.pivotSum[dialect]);
    });
  });

  describe("String pivot column", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .groupBy((item) => [item.id, item.year])
      .select((item) => ({
        id: item.id,
        year: item.year,
        food: expr.sum(expr.if(expr.eq(item.category, "Food"), item.amount, undefined)),
        electronics: expr.sum(expr.if(expr.eq(item.category, "Electronics"), item.amount, undefined)),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Sales" },
        groupBy: [
          { type: "column", path: ["T1", "id"] },
          { type: "column", path: ["T1", "year"] },
        ],
        select: {
          id: { type: "column", path: ["T1", "id"] },
          year: { type: "column", path: ["T1", "year"] },
          food: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "category"] },
                target: { type: "value", value: "Food" },
              },
              then: { type: "column", path: ["T1", "amount"] },
              else: { type: "value", value: undefined },
            },
          },
          electronics: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "category"] },
                target: { type: "value", value: "Electronics" },
              },
              then: { type: "column", path: ["T1", "amount"] },
              else: { type: "value", value: undefined },
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.pivotStringColumn[dialect]);
    });
  });

  describe("WHERE -> PIVOT (groupBy)", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .where((item) => [expr.eq(item.category, "Food")])
      .groupBy((item) => [item.id, item.category])
      .select((item) => ({
        id: item.id,
        category: item.category,
        y2020: expr.sum(expr.if(expr.eq(item.year, 2020), item.amount, undefined)),
        y2021: expr.sum(expr.if(expr.eq(item.year, 2021), item.amount, undefined)),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Sales" },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "category"] },
            target: { type: "value", value: "Food" },
          },
        ],
        groupBy: [
          { type: "column", path: ["T1", "id"] },
          { type: "column", path: ["T1", "category"] },
        ],
        select: {
          id: { type: "column", path: ["T1", "id"] },
          category: { type: "column", path: ["T1", "category"] },
          y2020: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "year"] },
                target: { type: "value", value: 2020 },
              },
              then: { type: "column", path: ["T1", "amount"] },
              else: { type: "value", value: undefined },
            },
          },
          y2021: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "year"] },
                target: { type: "value", value: 2021 },
              },
              then: { type: "column", path: ["T1", "amount"] },
              else: { type: "value", value: undefined },
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.pivotWithWhere[dialect]);
    });
  });
});
