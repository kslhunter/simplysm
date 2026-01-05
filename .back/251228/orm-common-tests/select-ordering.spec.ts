/**
 * SELECT ORDERING 테스트
 * - orderBy: ASC, DESC
 * - 다중 컬럼 정렬
 * - 표현식 정렬
 * - clearOrderBy
 * - limit (pagination)
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/select-ordering.expected";

describe("SELECT ORDERING", () => {
  // ============================================
  // orderBy ASC (기본)
  // ============================================
  describe("orderBy ASC", () => {
    it.each(DIALECTS)("[%s] ORDER BY name ASC", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.orderBy((c) => c.name);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.orderByAsc[dialect]);
    });
  });

  // ============================================
  // orderBy DESC
  // ============================================
  describe("orderBy DESC", () => {
    it.each(DIALECTS)("[%s] ORDER BY name DESC", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.orderBy((c) => c.name, true);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.orderByDesc[dialect]);
    });
  });

  // ============================================
  // 다중 컬럼 정렬
  // ============================================
  describe("orderBy multiple columns", () => {
    it.each(DIALECTS)("[%s] ORDER BY name ASC, createdAt DESC", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.orderBy((c) => c.name).orderBy((c) => c.createdAt, true);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.orderByMultiple[dialect]);
    });
  });

  // ============================================
  // 표현식 정렬
  // ============================================
  describe("orderBy expression", () => {
    it.each(DIALECTS)("[%s] ORDER BY IFNULL(age, 0) DESC", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.orderBy((c) => db.qh.ifNull(c.age, 0), true);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.orderByExpression[dialect]);
    });
  });

  // ============================================
  // clearOrderBy
  // ============================================
  describe("clearOrderBy", () => {
    it.each(DIALECTS)("[%s] clearOrderBy 후 새로운 orderBy", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .orderBy((c) => c.name)
        .orderBy((c) => c.createdAt, true)
        .clearOrderBy()
        .orderBy((c) => c.id);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.clearOrderBy[dialect]);
    });
  });

  // ============================================
  // limit (pagination)
  // ============================================
  describe("limit", () => {
    it.each(DIALECTS)("[%s] LIMIT skip=10, take=20", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.orderBy((c) => c.id).limit(10, 20);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.limit[dialect]);
    });
  });
});
