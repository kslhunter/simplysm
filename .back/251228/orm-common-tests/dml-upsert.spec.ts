/**
 * UPSERT 테스트
 * - Queryable.getUpsertQueryDef() → QueryBuilder.upsert() 통합 테스트
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/dml-upsert.expected";

describe("DML UPSERT", () => {
  // ============================================
  // 기본 UPSERT (동일 레코드로 update/insert)
  // ============================================
  describe("basic upsert", () => {
    it.each(DIALECTS)("[%s] 기본 UPSERT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getUpsertQueryDef(() => ({
          name: "홍길동",
          email: "hong@test.com",
        }));

      const sql = db.qb.upsert(def);

      expect(sql).toMatchSql(expected.upsertBasic[dialect]);
    });
  });

  // ============================================
  // UPSERT with 별도 update/insert 레코드
  // ============================================
  describe("upsert with different records", () => {
    it.each(DIALECTS)("[%s] update/insert 레코드 분리", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getUpsertQueryDef(
          () => ({ name: "업데이트됨" }),
          () => ({ name: "신규", email: "new@test.com" }),
        );

      const sql = db.qb.upsert(def);

      expect(sql).toMatchSql(expected.upsertDifferentRecords[dialect]);
    });
  });

  // ============================================
  // UPSERT with OUTPUT
  // ============================================
  describe("upsert with output", () => {
    it.each(DIALECTS)("[%s] UPSERT with OUTPUT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getUpsertQueryDef(
          () => ({ name: "홍길동" }),
          () => ({ name: "홍길동", email: "hong@test.com" }),
          ["id", "createdAt"],
        );

      const sql = db.qb.upsert(def);

      expect(sql).toMatchSql(expected.upsertWithOutput[dialect]);
    });
  });

  // ============================================
  // UPSERT - INSERT만 (빈 updateRecord)
  // ============================================
  describe("upsert insert only", () => {
    it.each(DIALECTS)("[%s] UPDATE 없이 INSERT만", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getUpsertQueryDef(
          () => ({}),
          () => ({ name: "신규", email: "new@test.com" }),
        );

      const sql = db.qb.upsert(def);

      expect(sql).toMatchSql(expected.upsertInsertOnly[dialect]);
    });
  });
});
