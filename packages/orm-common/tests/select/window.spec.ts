import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./window.expected";

describe("SELECT - 윈도우 함수", () => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.rowNumber[dialect]);
    });
  });

  describe("RANK: 전체 점수 순위 (동점 시 건너뛰기)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        name: e.name,
        rank: expr.rank({ orderBy: [[e.id, "DESC"]] }),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ntile[dialect]);
    });
  });

  describe("LAG: 이전 행 값 가져오기", () => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lag[dialect]);
    });
  });

  describe("LEAD: 다음 행 값 가져오기", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        nextId: expr.lead(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1 }),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lead[dialect]);
    });
  });

  describe("LAG with default: 이전 행 없을 때 기본값", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        prevId: expr.lag(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1, default: 0 }),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lagWithDefault[dialect]);
    });
  });

  describe("LEAD with default: 다음 행 없을 때 기본값", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        nextId: expr.lead(e.id, { orderBy: [[e.id, "ASC"]] }, { offset: 1, default: -1 }),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.leadWithDefault[dialect]);
    });
  });

  describe("SUM OVER: 누적 합", () => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.avgOver[dialect]);
    });
  });

  describe("COUNT OVER: 파티션 내 카운트", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        deptCount: expr.countOver({ partitionBy: [e.departmentId] }),
      }))
      .getSelectQueryDef();

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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.maxOver[dialect]);
    });
  });
});
