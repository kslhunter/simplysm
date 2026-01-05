/**
 * SELECT GROUP BY / HAVING 테스트
 * - groupBy: 단일, 다중 컬럼
 * - 집계 함수: count, sum, avg, max, min
 * - having: 조건 필터
 * - 복합 쿼리: where + groupBy + having + orderBy
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/select-grouping.expected";

describe("SELECT GROUPING", () => {
  // ============================================
  // groupBy 단일 컬럼
  // ============================================
  describe("groupBy single column", () => {
    it.each(DIALECTS)("[%s] GROUP BY isActive", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          isActive: c.isActive,
          cnt: db.qh.count(c.id),
        }))
        .groupBy((c) => [c.isActive]);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.groupBySingle[dialect]);
    });
  });

  // ============================================
  // groupBy 다중 컬럼
  // ============================================
  describe("groupBy multiple columns", () => {
    it.each(DIALECTS)("[%s] GROUP BY isActive, age", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          isActive: c.isActive,
          age: c.age,
          cnt: db.qh.count(c.id),
        }))
        .groupBy((c) => [c.isActive, c.age]);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.groupByMultiple[dialect]);
    });
  });

  // ============================================
  // 집계 함수
  // ============================================
  describe("aggregate functions", () => {
    it.each(DIALECTS)("[%s] COUNT, SUM, AVG, MAX, MIN", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          isActive: c.isActive,
          cnt: db.qh.count(c.id),
          sumAge: db.qh.sum(c.age),
          avgAge: db.qh.avg(c.age),
          maxAge: db.qh.max(c.age),
          minAge: db.qh.min(c.age),
        }))
        .groupBy((c) => [c.isActive]);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.aggregateFunctions[dialect]);
    });
  });

  // ============================================
  // having
  // ============================================
  describe("having", () => {
    it.each(DIALECTS)("[%s] HAVING COUNT(*) > 5", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          isActive: c.isActive,
          cnt: db.qh.count(c.id),
        }))
        .groupBy((c) => [c.isActive])
        .having((c) => db.qh.gt(db.qh.count(c.isActive), 5));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.having[dialect]);
    });
  });

  // ============================================
  // 다중 having
  // ============================================
  describe("having multiple conditions", () => {
    it.each(DIALECTS)("[%s] HAVING COUNT > 5 AND AVG >= 20", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          isActive: c.isActive,
          age: c.age,
          cnt: db.qh.count(c.id),
          avgAge: db.qh.avg(c.age),
        }))
        .groupBy((c) => [c.isActive])
        .having((c) => db.qh.gt(db.qh.count(c.isActive), 5))
        .having((c) => db.qh.gte(db.qh.avg(c.age), 20));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.havingMultiple[dialect]);
    });
  });

  // ============================================
  // 복합 쿼리: where + groupBy + having + orderBy
  // ============================================
  describe("complex query", () => {
    it.each(DIALECTS)("[%s] WHERE + GROUP BY + HAVING + ORDER BY", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .where((c) => db.qh.isNotNull(c.age))
        .select((c) => ({
          isActive: c.isActive,
          cnt: db.qh.count(c.id),
          avgAge: db.qh.avg(c.age),
        }))
        .groupBy((c) => [c.isActive])
        .having((c) => db.qh.gt(db.qh.count(c.isActive), 5))
        .orderBy((c) => db.qh.count(c.isActive), true);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.complexQuery[dialect]);
    });
  });
});
