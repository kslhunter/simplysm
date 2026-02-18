import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./window.expected";

describe("SELECT - Window Functions", () => {
  describe("ROW_NUMBER: 부서별 급여 순위", () => {
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

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rowNumber[dialect]);
    });
  });

  describe("RANK: 전체 점수 순위 (동점 시 건너뜀)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        name: e.name,
        rank: expr.rank({ orderBy: [[e.id, "DESC"]] }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rank[dialect]);
    });
  });

  describe("DENSE_RANK: 전체 점수 순위 (동점 시 연속)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        denseRank: expr.denseRank({ orderBy: [[e.id, "DESC"]] }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.denseRank[dialect]);
    });
  });

  describe("NTILE: 4분위로 나누기", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        quartile: expr.ntile(4, { orderBy: [[e.id, "DESC"]] }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ntile[dialect]);
    });
  });

  describe("LAG: 이전 행 값 조회", () => {
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

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lag[dialect]);
    });
  });

  describe("LEAD: 다음 행 값 조회", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        nextId: expr.lead(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1 }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lead[dialect]);
    });
  });

  describe("LAG with default: 이전 행이 없을 때 기본값", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        prevId: expr.lag(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1, default: 0 }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lagWithDefault[dialect]);
    });
  });

  describe("LEAD with default: 다음 행이 없을 때 기본값", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        nextId: expr.lead(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1, default: -1 }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.leadWithDefault[dialect]);
    });
  });

  describe("SUM OVER: 누적 합계", () => {
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

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.sumOver[dialect]);
    });
  });

  describe("AVG OVER: 이동 평균", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        avgId: expr.avgOver(e.id, { partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.avgOver[dialect]);
    });
  });

  describe("COUNT OVER: 파티션 내 개수", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        deptCount: expr.countOver({ partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.firstLastValue[dialect]);
    });
  });

  describe("여러 윈도우 함수 조합", () => {
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

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.combined[dialect]);
    });
  });

  describe("MIN OVER: 부서별 최소 ID", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        minId: expr.minOver(e.id, { partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.minOver[dialect]);
    });
  });

  describe("MAX OVER: 부서별 최대 ID", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        maxId: expr.maxOver(e.id, { partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.maxOver[dialect]);
    });
  });
});
