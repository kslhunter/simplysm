/**
 * INSERT IF NOT EXISTS 테스트
 * - Queryable.getInsertIfNotExistsQueryDef() → QueryBuilder.insertIfNotExists() 통합 테스트
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/dml-insert-if-not-exists.expected";

describe("DML INSERT IF NOT EXISTS", () => {
  // ============================================
  // 기본 INSERT IF NOT EXISTS
  // ============================================
  describe("basic insert if not exists", () => {
    it.each(DIALECTS)("[%s] 기본 INSERT IF NOT EXISTS", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.email, "hong@test.com")])
        .getInsertIfNotExistsQueryDef((c) => ({
          name: "홍길동",
          email: "hong@test.com",
        }));
      const sql = db.qb.insertIfNotExists(def);

      expect(sql).toMatchSql(expected.basicInsertIfNotExists[dialect]);
    });
  });

  // ============================================
  // INSERT IF NOT EXISTS with OUTPUT
  // ============================================
  describe("insert if not exists with output", () => {
    it.each(DIALECTS)("[%s] INSERT IF NOT EXISTS with OUTPUT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.email, "hong@test.com")])
        .getInsertIfNotExistsQueryDef(
          (c) => ({
            name: "홍길동",
            email: "hong@test.com",
          }),
          ["id", "createdAt"],
        );
      const sql = db.qb.insertIfNotExists(def);

      expect(sql).toMatchSql(expected.insertIfNotExistsWithOutput[dialect]);
    });
  });

  // ============================================
  // INSERT IF NOT EXISTS with multiple where conditions
  // ============================================
  describe("insert if not exists with multiple conditions", () => {
    it.each(DIALECTS)("[%s] 복합 조건 INSERT IF NOT EXISTS", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.name, "홍길동"), db.qh.eq(c.email, "hong@test.com")])
        .getInsertIfNotExistsQueryDef((c) => ({
          name: "홍길동",
          email: "hong@test.com",
          age: 30,
        }));
      const sql = db.qb.insertIfNotExists(def);

      expect(sql).toMatchSql(expected.insertIfNotExistsMultipleConditions[dialect]);
    });
  });
});
