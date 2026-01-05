/**
 * SELECT WHERE 테스트
 * - 비교 연산자: eq, notEq, gt, lt, gte, lte
 * - NULL 체크: isNull, isNotNull
 * - 문자열: like
 * - 범위: in, between
 * - 논리: and, or
 * - 다중 where 체이닝
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/select-where.expected";

describe("SELECT WHERE", () => {
  // ============================================
  // 비교 연산자 - eq
  // ============================================
  describe("eq", () => {
    it.each(DIALECTS)("[%s] WHERE id = 1", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.eq(c.id, 1n));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereEq[dialect]);
    });
  });

  // ============================================
  // 비교 연산자 - notEq
  // ============================================
  describe("notEq", () => {
    it.each(DIALECTS)("[%s] WHERE id != 1", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.notEq(c.id, 1n));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereNotEq[dialect]);
    });
  });

  // ============================================
  // 비교 연산자 - gt
  // ============================================
  describe("gt", () => {
    it.each(DIALECTS)("[%s] WHERE age > 18", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.gt(c.age, 18));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereGt[dialect]);
    });
  });

  // ============================================
  // 비교 연산자 - gte
  // ============================================
  describe("gte", () => {
    it.each(DIALECTS)("[%s] WHERE age >= 18", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.gte(c.age, 18));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereGte[dialect]);
    });
  });

  // ============================================
  // 비교 연산자 - lt
  // ============================================
  describe("lt", () => {
    it.each(DIALECTS)("[%s] WHERE age < 65", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.lt(c.age, 65));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereLt[dialect]);
    });
  });

  // ============================================
  // 비교 연산자 - lte
  // ============================================
  describe("lte", () => {
    it.each(DIALECTS)("[%s] WHERE age <= 65", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.lte(c.age, 65));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereLte[dialect]);
    });
  });

  // ============================================
  // NULL 체크 - isNull
  // ============================================
  describe("isNull", () => {
    it.each(DIALECTS)("[%s] WHERE email IS NULL", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.isNull(c.email));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereIsNull[dialect]);
    });
  });

  // ============================================
  // NULL 체크 - isNotNull
  // ============================================
  describe("isNotNull", () => {
    it.each(DIALECTS)("[%s] WHERE email IS NOT NULL", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.isNotNull(c.email));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereIsNotNull[dialect]);
    });
  });

  // ============================================
  // 문자열 - like
  // ============================================
  describe("like", () => {
    it.each(DIALECTS)("[%s] WHERE name LIKE '%kim%'", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.like(c.name, "%kim%"));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereLike[dialect]);
    });
  });

  // ============================================
  // 범위 - in
  // ============================================
  describe("in", () => {
    it.each(DIALECTS)("[%s] WHERE id IN (1, 2, 3)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.in(c.id, [1n, 2n, 3n]));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereIn[dialect]);
    });
  });

  // ============================================
  // 범위 - notIn
  // ============================================
  describe("notIn", () => {
    it.each(DIALECTS)("[%s] WHERE id NOT IN (1, 2, 3)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.notIn(c.id, [1n, 2n, 3n]));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereNotIn[dialect]);
    });
  });

  // ============================================
  // 범위 - between
  // ============================================
  describe("between", () => {
    it.each(DIALECTS)("[%s] WHERE age BETWEEN 18 AND 65", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.between(c.age, 18, 65));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereBetween[dialect]);
    });
  });

  // ============================================
  // 논리 - and
  // ============================================
  describe("and", () => {
    it.each(DIALECTS)("[%s] WHERE (age >= 18 AND age <= 65)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.and(db.qh.gte(c.age, 18), db.qh.lte(c.age, 65)));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereAnd[dialect]);
    });
  });

  // ============================================
  // 논리 - or
  // ============================================
  describe("or", () => {
    it.each(DIALECTS)("[%s] WHERE (id = 1 OR id = 2)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.or(db.qh.eq(c.id, 1n), db.qh.eq(c.id, 2n)));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereOr[dialect]);
    });
  });

  // ============================================
  // 다중 where 체이닝
  // ============================================
  describe("chained where", () => {
    it.each(DIALECTS)("[%s] 다중 where() 호출", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.where((c) => db.qh.gte(c.age, 18)).where((c) => db.qh.isNotNull(c.email));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.whereChained[dialect]);
    });
  });
});
