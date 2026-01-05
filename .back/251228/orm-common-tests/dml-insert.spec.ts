/**
 * INSERT 테스트
 * - Queryable.getInsertQueryDef() → QueryBuilder.insert() 통합 테스트
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import { UserBackup } from "./models/UserBackup";
import * as expected from "./expected/dml-insert.expected";

describe("DML INSERT", () => {
  // ============================================
  // 단일 레코드 INSERT
  // ============================================
  describe("single record insert", () => {
    it.each(DIALECTS)("[%s] 단일 레코드 INSERT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getInsertQueryDef([
        { name: "홍길동", email: "hong@test.com", age: 30, isActive: true },
      ]);
      const sql = db.qb.insert(def);

      expect(sql).toMatchSql(expected.singleInsert[dialect]);
    });
  });

  // ============================================
  // 배치 INSERT (여러 레코드)
  // ============================================
  describe("batch insert", () => {
    it.each(DIALECTS)("[%s] 배치 INSERT (3개 레코드)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getInsertQueryDef([
        { name: "홍길동", email: "hong@test.com" },
        { name: "김철수", email: "kim@test.com" },
        { name: "이영희", email: "lee@test.com" },
      ]);
      const sql = db.qb.insert(def);

      expect(sql).toMatchSql(expected.batchInsert[dialect]);
    });
  });

  // ============================================
  // INSERT with NULL
  // ============================================
  describe("insert with null", () => {
    it.each(DIALECTS)("[%s] NULL 값 포함 INSERT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getInsertQueryDef([
        { name: "홍길동", email: undefined, age: db.qh.val(undefined), isActive: true },
      ]);
      const sql = db.qb.insert(def);

      expect(sql).toMatchSql(expected.insertWithNull[dialect]);
    });
  });

  // ============================================
  // INSERT with OUTPUT (단일 레코드)
  // ============================================
  describe("insert with output (single)", () => {
    it.each(DIALECTS)("[%s] INSERT with OUTPUT (단일)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getInsertQueryDef(
        [{ name: "홍길동", email: "hong@test.com" }],
        ["id", "createdAt"],
      );
      const sql = db.qb.insert(def);

      expect(sql).toMatchSql(expected.insertWithOutputSingle[dialect]);
    });
  });

  // ============================================
  // INSERT with OUTPUT (배치)
  // ============================================
  describe("insert with output (batch)", () => {
    it.each(DIALECTS)("[%s] INSERT with OUTPUT (배치)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getInsertQueryDef(
        [
          { name: "홍길동", email: "hong@test.com" },
          { name: "김철수", email: "kim@test.com" },
        ],
        ["id", "createdAt"],
      );
      const sql = db.qb.insert(def);

      expect(sql).toMatchSql(expected.insertWithOutputBatch[dialect]);
    });
  });

  // ============================================
  // INSERT INTO SELECT
  // ============================================
  describe("insert into select", () => {
    it.each(DIALECTS)("[%s] INSERT INTO ... SELECT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.isActive, true)])
        .select((c) => ({
          name: c.name,
          email: c.email,
        }))
        .getInsertIntoQueryDef(UserBackup);

      const sql = db.qb.insertInto(def);

      expect(sql).toMatchSql(expected.insertIntoSelect[dialect]);
    });

    it.each(DIALECTS)("[%s] INSERT INTO with stopAutoIdentity", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.isActive, true)])
        .select((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }))
        .getInsertIntoQueryDef(UserBackup, { stopAutoIdentity: true });

      const sql = db.qb.insertInto(def);

      expect(sql).toMatchSql(expected.insertIntoWithStopAutoIdentity[dialect]);
    });
  });

  // ============================================
  // INSERT with disableFkCheck
  // ============================================
  describe("insert with disableFkCheck", () => {
    it.each(DIALECTS)("[%s] FK 체크 비활성화 INSERT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.order.getInsertWithoutFkCheckQueryDef([{ userId: 999n, amount: 10000 }]);
      const sql = db.qb.insert(def);

      expect(sql).toMatchSql(expected.insertWithDisableFkCheck[dialect]);
    });
  });

  // ============================================
  // 빈 records 배열
  // ============================================
  describe("empty records", () => {
    it.each(DIALECTS)("[%s] 빈 records 배열은 빈 문자열 반환", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getInsertQueryDef([]);
      const sql = db.qb.insert(def);

      expect(sql).toBe("");
    });
  });
});
