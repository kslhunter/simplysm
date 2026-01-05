/**
 * DELETE 테스트
 * - Queryable.getDeleteQueryDef() → QueryBuilder.delete() 통합 테스트
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/dml-delete.expected";

describe("DML DELETE", () => {
  // ============================================
  // 기본 DELETE (전체 테이블)
  // ============================================
  describe("basic delete", () => {
    it.each(DIALECTS)("[%s] 기본 DELETE (전체 행)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getDeleteQueryDef();
      const sql = db.qb.delete(def);

      expect(sql).toMatchSql(expected.basicDelete[dialect]);
    });
  });

  // ============================================
  // DELETE with WHERE
  // ============================================
  describe("delete with where", () => {
    it.each(DIALECTS)("[%s] DELETE with WHERE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.where((c) => [db.qh.eq(c.id, 1n)]).getDeleteQueryDef();
      const sql = db.qb.delete(def);

      expect(sql).toMatchSql(expected.deleteWithWhere[dialect]);
    });
  });

  // ============================================
  // DELETE with 복수 WHERE 조건
  // ============================================
  describe("delete with multiple where", () => {
    it.each(DIALECTS)("[%s] DELETE with 복수 WHERE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.isActive, false), db.qh.lt(c.age, 18)])
        .getDeleteQueryDef();
      const sql = db.qb.delete(def);

      expect(sql).toMatchSql(expected.deleteWithMultipleWhere[dialect]);
    });
  });

  // ============================================
  // DELETE with OUTPUT
  // ============================================
  describe("delete with output", () => {
    it.each(DIALECTS)("[%s] DELETE with OUTPUT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getDeleteQueryDef(["id", "name"]);
      const sql = db.qb.delete(def);

      expect(sql).toMatchSql(expected.deleteWithOutput[dialect]);
    });
  });

  // ============================================
  // DELETE with disableFkCheck
  // ============================================
  describe("delete with disableFkCheck", () => {
    it.each(DIALECTS)("[%s] FK 체크 비활성화 DELETE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getDeleteWithoutFkCheckQueryDef();
      const sql = db.qb.delete(def);

      expect(sql).toMatchSql(expected.deleteWithDisableFkCheck[dialect]);
    });
  });

  // ============================================
  // DELETE with JOIN + WHERE
  // ============================================
  describe("delete with join", () => {
    it.each(DIALECTS)("[%s] DELETE with JOIN + WHERE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // Post를 User와 join해서, User.isActive가 false인 Post들을 DELETE
      const def = db.post
        .include((r) => r.user!)
        .where((c) => [db.qh.eq(c.user!.isActive, false)])
        .getDeleteQueryDef();
      const sql = db.qb.delete(def);

      expect(sql).toMatchSql(expected.deleteWithJoin[dialect]);
    });
  });

  // ============================================
  // TRUNCATE TABLE
  // ============================================
  describe("truncate", () => {
    it.each(DIALECTS)("[%s] 테이블 TRUNCATE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getTruncateQueryDef();
      const sql = db.qb.truncate(def);

      expect(sql).toMatchSql(expected.truncateTable[dialect]);
    });
  });
});
