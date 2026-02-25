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

  describe("COUNT", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .groupBy((item) => [item.id, item.category])
      .select((item) => ({
        id: item.id,
        category: item.category,
        y2020: expr.count(expr.if(expr.eq(item.year, 2020), item.amount, undefined)),
        y2021: expr.count(expr.if(expr.eq(item.year, 2021), item.amount, undefined)),
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
            type: "count",
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
            type: "count",
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
      expect(builder.build(def)).toMatchSql(expected.pivotCount[dialect]);
    });
  });

  describe("AVG", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .groupBy((item) => [item.id, item.category])
      .select((item) => ({
        id: item.id,
        category: item.category,
        y2020: expr.avg(expr.if(expr.eq(item.year, 2020), item.amount, undefined)),
        y2021: expr.avg(expr.if(expr.eq(item.year, 2021), item.amount, undefined)),
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
            type: "avg",
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
            type: "avg",
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
      expect(builder.build(def)).toMatchSql(expected.pivotAvg[dialect]);
    });
  });

  describe("MAX", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .groupBy((item) => [item.id, item.category])
      .select((item) => ({
        id: item.id,
        category: item.category,
        y2020: expr.max(expr.if(expr.eq(item.year, 2020), item.amount, undefined)),
        y2021: expr.max(expr.if(expr.eq(item.year, 2021), item.amount, undefined)),
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
            type: "max",
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
            type: "max",
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
      expect(builder.build(def)).toMatchSql(expected.pivotMax[dialect]);
    });
  });

  describe("MIN", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .groupBy((item) => [item.id, item.category])
      .select((item) => ({
        id: item.id,
        category: item.category,
        y2020: expr.min(expr.if(expr.eq(item.year, 2020), item.amount, undefined)),
        y2021: expr.min(expr.if(expr.eq(item.year, 2021), item.amount, undefined)),
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
            type: "min",
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
            type: "min",
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
      expect(builder.build(def)).toMatchSql(expected.pivotMin[dialect]);
    });
  });

  describe("3 or more pivot values", () => {
    const db = createTestDb();
    const def = db
      .sales()
      .groupBy((item) => [item.id, item.category])
      .select((item) => ({
        id: item.id,
        category: item.category,
        y2019: expr.sum(expr.if(expr.eq(item.year, 2019), item.amount, undefined)),
        y2020: expr.sum(expr.if(expr.eq(item.year, 2020), item.amount, undefined)),
        y2021: expr.sum(expr.if(expr.eq(item.year, 2021), item.amount, undefined)),
        y2022: expr.sum(expr.if(expr.eq(item.year, 2022), item.amount, undefined)),
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
          y2019: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "year"] },
                target: { type: "value", value: 2019 },
              },
              then: { type: "column", path: ["T1", "amount"] },
              else: { type: "value", value: undefined },
            },
          },
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
          y2022: {
            type: "sum",
            arg: {
              type: "if",
              condition: {
                type: "eq",
                source: { type: "column", path: ["T1", "year"] },
                target: { type: "value", value: 2022 },
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
      expect(builder.build(def)).toMatchSql(expected.pivotMultipleYears[dialect]);
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
        food: expr.sum(expr.if(expr.eq(item.category, "식품"), item.amount, undefined)),
        electronics: expr.sum(expr.if(expr.eq(item.category, "전자"), item.amount, undefined)),
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
                target: { type: "value", value: "식품" },
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
                target: { type: "value", value: "전자" },
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
      .where((item) => [expr.eq(item.category, "식품")])
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
            target: { type: "value", value: "식품" },
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
