/**
 * SUBQUERY 테스트
 * - wrap() - 서브쿼리 감싸기
 * - wrap() 후 where/select/orderBy
 * - union - UNION ALL
 * - 중첩 서브쿼리
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import { Queryable } from "../src/query/queryable";
import * as expected from "./expected/select-subquery.expected";

describe("SELECT SUBQUERY", () => {
  // ============================================
  // 기본 wrap (서브쿼리)
  // ============================================
  describe("basic wrap", () => {
    it.each(DIALECTS)("[%s] 단순 wrap", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.wrap();
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.basicWrap[dialect]);
    });
  });

  // ============================================
  // wrap 후 where
  // ============================================
  describe("wrap then where", () => {
    it.each(DIALECTS)("[%s] wrap 후 where 조건 추가", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .where((c) => [db.qh.gt(c.age, 20)])
        .wrap()
        .where((c) => [db.qh.eq(c.isActive, true)]);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.wrapThenWhere[dialect]);
    });
  });

  // ============================================
  // wrap 후 select
  // ============================================
  describe("wrap then select", () => {
    it.each(DIALECTS)("[%s] wrap 후 컬럼 선택", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.wrap().select((c) => ({
        id: c.id,
        name: c.name,
      }));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.wrapThenSelect[dialect]);
    });
  });

  // ============================================
  // wrap 후 orderBy, limit
  // ============================================
  describe("wrap then orderBy limit", () => {
    it.each(DIALECTS)("[%s] wrap 후 정렬 및 페이징", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .where((c) => [db.qh.eq(c.isActive, true)])
        .wrap()
        .orderBy((c) => c.name)
        .limit(0, 10);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.wrapThenOrderByLimit[dialect]);
    });
  });

  // ============================================
  // 기본 union
  // ============================================
  describe("basic union", () => {
    it.each(DIALECTS)("[%s] 두 쿼리 UNION ALL", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr1 = db.user.where((c) => [db.qh.eq(c.isActive, true)]);
      const qr2 = db.user.where((c) => [db.qh.gt(c.age, 30)]);
      const qr = Queryable.union([qr1, qr2]);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.basicUnion[dialect]);
    });
  });

  // ============================================
  // union 후 wrap (중첩)
  // ============================================
  describe("union then wrap", () => {
    it.each(DIALECTS)("[%s] union 결과를 wrap", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr1 = db.user.where((c) => [db.qh.eq(c.isActive, true)]);
      const qr2 = db.user.where((c) => [db.qh.gt(c.age, 30)]);
      const qr = Queryable.union([qr1, qr2])
        .wrap()
        .orderBy((c) => c.name)
        .limit(0, 5);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.unionThenWrap[dialect]);
    });
  });
});
