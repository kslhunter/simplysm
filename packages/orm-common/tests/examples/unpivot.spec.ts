import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./unpivot.expected";

describe("SELECT - UNPIVOT (join + union)", () => {
  describe("기본", () => {
    const db = createTestDb();
    const def = db
      .monthlySales()
      .join("unpvt", (qr, c) =>
        qr.union(
          qr.select({ month: expr.val("string", "jan"), amount: c.jan }),
          qr.select({ month: expr.val("string", "feb"), amount: c.feb }),
          qr.select({ month: expr.val("string", "mar"), amount: c.mar }),
        ),
      )
      .select((item) => ({
        id: item.id,
        category: item.category,
        month: item.unpvt![0].month,
        amount: item.unpvt![0].amount,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "MonthlySales" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          category: { type: "column", path: ["T1", "category"] },
          month: { type: "column", path: ["T1.unpvt", "month"] },
          amount: { type: "column", path: ["T1.unpvt", "amount"] },
        },
        joins: [
          {
            type: "select",
            as: "T1.unpvt",
            from: [
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  month: { type: "value", value: "jan" },
                  amount: { type: "column", path: ["T1", "jan"] },
                },
              },
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  month: { type: "value", value: "feb" },
                  amount: { type: "column", path: ["T1", "feb"] },
                },
              },
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  month: { type: "value", value: "mar" },
                  amount: { type: "column", path: ["T1", "mar"] },
                },
              },
            ],
            isSingle: false,
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unpivotBasic[dialect]);
    });
  });

  describe("2개 컬럼 unpivot", () => {
    const db = createTestDb();
    const def = db
      .monthlySales()
      .join("unpvt", (qr, c) =>
        qr.union(
          qr.select({ period: expr.val("string", "jan"), value: c.jan }),
          qr.select({ period: expr.val("string", "feb"), value: c.feb }),
        ),
      )
      .select((item) => ({
        id: item.id,
        category: item.category,
        mar: item.mar,
        period: item.unpvt![0].period,
        value: item.unpvt![0].value,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "MonthlySales" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          category: { type: "column", path: ["T1", "category"] },
          mar: { type: "column", path: ["T1", "mar"] },
          period: { type: "column", path: ["T1.unpvt", "period"] },
          value: { type: "column", path: ["T1.unpvt", "value"] },
        },
        joins: [
          {
            type: "select",
            as: "T1.unpvt",
            from: [
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  period: { type: "value", value: "jan" },
                  value: { type: "column", path: ["T1", "jan"] },
                },
              },
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  period: { type: "value", value: "feb" },
                  value: { type: "column", path: ["T1", "feb"] },
                },
              },
            ],
            isSingle: false,
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unpivotTwoColumns[dialect]);
    });
  });

  describe("WHERE -> UNPIVOT", () => {
    const db = createTestDb();
    const def = db
      .monthlySales()
      .where((r) => [expr.eq(r.category, "A")])
      .join("unpvt", (qr, c) =>
        qr.union(
          qr.select({ month: expr.val("string", "jan"), amount: c.jan }),
          qr.select({ month: expr.val("string", "feb"), amount: c.feb }),
          qr.select({ month: expr.val("string", "mar"), amount: c.mar }),
        ),
      )
      .select((item) => ({
        id: item.id,
        category: item.category,
        month: item.unpvt![0].month,
        amount: item.unpvt![0].amount,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "MonthlySales" },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "category"] },
            target: { type: "value", value: "A" },
          },
        ],
        select: {
          id: { type: "column", path: ["T1", "id"] },
          category: { type: "column", path: ["T1", "category"] },
          month: { type: "column", path: ["T1.unpvt", "month"] },
          amount: { type: "column", path: ["T1.unpvt", "amount"] },
        },
        joins: [
          {
            type: "select",
            as: "T1.unpvt",
            from: [
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  month: { type: "value", value: "jan" },
                  amount: { type: "column", path: ["T1", "jan"] },
                },
              },
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  month: { type: "value", value: "feb" },
                  amount: { type: "column", path: ["T1", "feb"] },
                },
              },
              {
                type: "select",
                as: "T1.unpvt",
                select: {
                  month: { type: "value", value: "mar" },
                  amount: { type: "column", path: ["T1", "mar"] },
                },
              },
            ],
            isSingle: false,
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unpivotWithWhere[dialect]);
    });
  });
});
