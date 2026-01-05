/**
 * SELECT 기본 테스트
 * - 전체 컬럼 SELECT
 * - 특정 컬럼 select()
 * - distinct()
 * - top()
 * - lock()
 * - sample()
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/select-basic.expected";

describe("SELECT Basic", () => {
  // ============================================
  // 전체 컬럼 SELECT
  // ============================================
  describe("select all columns", () => {
    it.each(DIALECTS)("[%s] 전체 컬럼 SELECT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user;
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.selectAll[dialect]);
    });
  });

  // ============================================
  // 특정 컬럼 select()
  // ============================================
  describe("select specific columns", () => {
    it.each(DIALECTS)("[%s] 특정 컬럼만 SELECT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.select((c) => ({
        id: c.id,
        name: c.name,
      }));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.selectSpecific[dialect]);
    });

    it.each(DIALECTS)("[%s] 컬럼 alias 변경", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.select((c) => ({
        userId: c.id,
        userName: c.name,
        userEmail: c.email,
      }));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.selectAlias[dialect]);
    });

    it.each(DIALECTS)("[%s] 계산된 컬럼 SELECT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.select((c) => ({
        id: c.id,
        name: c.name,
        nameLength: db.qh.length(c.name),
        upperName: db.qh.upper(c.name),
      }));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.selectComputed[dialect]);
    });

    it.each(DIALECTS)("[%s] 고정값 포함 SELECT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.select((c) => ({
        id: c.id,
        name: c.name,
        fixedString: db.qh.val("hello"),
        fixedNumber: db.qh.val(100),
        fixedBool: db.qh.val(true),
      }));
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.selectFixedValues[dialect]);
    });
  });

  // ============================================
  // distinct()
  // ============================================
  describe("distinct", () => {
    it.each(DIALECTS)("[%s] DISTINCT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          name: c.name,
        }))
        .distinct();
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.distinct[dialect]);
    });
  });

  // ============================================
  // top()
  // ============================================
  describe("top", () => {
    it.each(DIALECTS)("[%s] TOP 10", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.top(10);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.top[dialect]);
    });

    it.each(DIALECTS)("[%s] TOP 1 with select", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          id: c.id,
          name: c.name,
        }))
        .top(1);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.topWithSelect[dialect]);
    });
  });

  // ============================================
  // lock()
  // ============================================
  describe("lock", () => {
    it.each(DIALECTS)("[%s] FOR UPDATE (lock)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.lock();
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.lock[dialect]);
    });
  });

  // ============================================
  // sample()
  // ============================================
  describe("sample", () => {
    it.each(DIALECTS)("[%s] TABLESAMPLE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user.sample(100);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.sample[dialect]);
    });
  });

  // ============================================
  // 복합 케이스
  // ============================================
  describe("combined", () => {
    it.each(DIALECTS)("[%s] distinct + top + select", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const qr = db.user
        .select((c) => ({
          name: c.name,
          email: c.email,
        }))
        .distinct()
        .top(5);
      const sql = db.qb.select(qr.getSelectQueryDef());

      expect(sql).toMatchSql(expected.combined[dialect]);
    });
  });
});
