import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./window.expected";

describe("SELECT - Window Functions", () => {
  describe("ROW_NUMBER: Department salary ranking", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        name: e.name,
        departmentId: e.departmentId,
        rowNum: expr.rowNumber({ partitionBy: [e.departmentId], orderBy: [[e.id, "ASC"]] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          departmentId: { type: "column", path: ["T1", "departmentId"] },
          rowNum: {
            type: "window",
            fn: { type: "rowNumber" },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rowNumber[dialect]);
    });
  });

  describe("RANK: Overall score ranking (skip on tie)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        name: e.name,
        rank: expr.rank({ orderBy: [[e.id, "DESC"]] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          rank: {
            type: "window",
            fn: { type: "rank" },
            spec: {
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "DESC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rank[dialect]);
    });
  });

  describe("DENSE_RANK: Overall score ranking (consecutive on tie)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        denseRank: expr.denseRank({ orderBy: [[e.id, "DESC"]] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          denseRank: {
            type: "window",
            fn: { type: "denseRank" },
            spec: {
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "DESC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.denseRank[dialect]);
    });
  });

  describe("NTILE: Divide into quartiles", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        quartile: expr.ntile(4, { orderBy: [[e.id, "DESC"]] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          quartile: {
            type: "window",
            fn: { type: "ntile", n: 4 },
            spec: {
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "DESC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ntile[dialect]);
    });
  });

  describe("LAG: Get previous row value", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        name: e.name,
        prevId: expr.lag(
          e.id,
          { partitionBy: [e.departmentId], orderBy: [[e.id, "ASC"]] },
          { offset: 1 },
        ),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          prevId: {
            type: "window",
            fn: {
              type: "lag",
              column: { type: "column", path: ["T1", "id"] },
              offset: 1,
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lag[dialect]);
    });
  });

  describe("LEAD: Get next row value", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        nextId: expr.lead(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1 }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          nextId: {
            type: "window",
            fn: {
              type: "lead",
              column: { type: "column", path: ["T1", "id"] },
              offset: 1,
            },
            spec: {
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lead[dialect]);
    });
  });

  describe("LAG with default: Default value when no previous row", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        prevId: expr.lag(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1, default: 0 }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          prevId: {
            type: "window",
            fn: {
              type: "lag",
              column: { type: "column", path: ["T1", "id"] },
              offset: 1,
              default: { type: "value", value: 0 },
            },
            spec: {
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lagWithDefault[dialect]);
    });
  });

  describe("LEAD with default: Default value when no next row", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        nextId: expr.lead(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1, default: -1 }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          nextId: {
            type: "window",
            fn: {
              type: "lead",
              column: { type: "column", path: ["T1", "id"] },
              offset: 1,
              default: { type: "value", value: -1 },
            },
            spec: {
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.leadWithDefault[dialect]);
    });
  });

  describe("SUM OVER: Cumulative sum", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        runningTotal: expr.sumOver(e.id, {
          partitionBy: [e.departmentId],
          orderBy: [[e.id, "ASC"]],
        }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          runningTotal: {
            type: "window",
            fn: {
              type: "sum",
              column: { type: "column", path: ["T1", "id"] },
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.sumOver[dialect]);
    });
  });

  describe("AVG OVER: moving average", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        avgId: expr.avgOver(e.id, { partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          avgId: {
            type: "window",
            fn: {
              type: "avg",
              column: { type: "column", path: ["T1", "id"] },
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.avgOver[dialect]);
    });
  });

  describe("COUNT OVER: count within partition", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        deptCount: expr.countOver({ partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          deptCount: {
            type: "window",
            fn: { type: "count" },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.countOver[dialect]);
    });
  });

  describe("FIRST_VALUE / LAST_VALUE", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        firstInDept: expr.firstValue(e.name, {
          partitionBy: [e.departmentId],
          orderBy: [[e.id, "ASC"]],
        }),
        lastInDept: expr.lastValue(e.name, {
          partitionBy: [e.departmentId],
          orderBy: [[e.id, "ASC"]],
        }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          firstInDept: {
            type: "window",
            fn: {
              type: "firstValue",
              column: { type: "column", path: ["T1", "name"] },
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
          lastInDept: {
            type: "window",
            fn: {
              type: "lastValue",
              column: { type: "column", path: ["T1", "name"] },
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.firstLastValue[dialect]);
    });
  });

  describe("multiple window function combinations", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        name: e.name,
        rowNum: expr.rowNumber({ partitionBy: [e.departmentId], orderBy: [[e.id, "ASC"]] }),
        rank: expr.rank({ partitionBy: [e.departmentId], orderBy: [[e.id, "DESC"]] }),
        prevName: expr.lag(
          e.name,
          { partitionBy: [e.departmentId], orderBy: [[e.id, "ASC"]] },
          { offset: 1 },
        ),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          rowNum: {
            type: "window",
            fn: { type: "rowNumber" },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
          rank: {
            type: "window",
            fn: { type: "rank" },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "DESC"]],
            },
          },
          prevName: {
            type: "window",
            fn: {
              type: "lag",
              column: { type: "column", path: ["T1", "name"] },
              offset: 1,
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
              orderBy: [[{ type: "column", path: ["T1", "id"] }, "ASC"]],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.combined[dialect]);
    });
  });

  describe("MIN OVER: min ID per department", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        minId: expr.minOver(e.id, { partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          minId: {
            type: "window",
            fn: {
              type: "min",
              column: { type: "column", path: ["T1", "id"] },
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.minOver[dialect]);
    });
  });

  describe("MAX OVER: max ID per department", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        maxId: expr.maxOver(e.id, { partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          maxId: {
            type: "window",
            fn: {
              type: "max",
              column: { type: "column", path: ["T1", "id"] },
            },
            spec: {
              partitionBy: [{ type: "column", path: ["T1", "departmentId"] }],
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.maxOver[dialect]);
    });
  });
});
