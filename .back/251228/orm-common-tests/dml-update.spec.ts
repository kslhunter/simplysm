/**
 * UPDATE 테스트
 * - Queryable.getUpdateQueryDef() → QueryBuilder.update() 통합 테스트
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/dml-update.expected";

describe("DML UPDATE", () => {
  // ============================================
  // 기본 UPDATE (전체 테이블)
  // ============================================
  describe("basic update", () => {
    it.each(DIALECTS)("[%s] 기본 UPDATE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user.getUpdateQueryDef(() => ({
        isActive: false,
      }));
      const sql = db.qb.update(def);

      expect(sql).toMatchSql(expected.basicUpdate[dialect]);
    });
  });

  // ============================================
  // UPDATE with WHERE
  // ============================================
  describe("update with where", () => {
    it.each(DIALECTS)("[%s] UPDATE with WHERE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getUpdateQueryDef(() => ({
          name: "김철수",
          email: "kim@test.com",
        }));
      const sql = db.qb.update(def);

      expect(sql).toMatchSql(expected.updateWithWhere[dialect]);
    });
  });

  // ============================================
  // UPDATE with NULL (null은 NULL로, undefined는 컬럼 제외)
  // ============================================
  describe("update with null", () => {
    it.each(DIALECTS)(
      "[%s] NULL 값 UPDATE (undefined는 제외, null은 NULL)",
      (dialect: TDialect) => {
        const db = new TestDbContext(dialect);

        const def = db.user
          .where((c) => [db.qh.eq(c.id, 1n)])
          .getUpdateQueryDef(() => ({
            name: "홍길동",
            email: undefined, // 컬럼 제외
            age: db.qh.val(undefined), // NULL로 업데이트
          }));
        const sql = db.qb.update(def);

        expect(sql).toMatchSql(expected.updateWithNull[dialect]);
      },
    );
  });

  // ============================================
  // UPDATE with 기존값
  // ============================================
  describe("update with prev value", () => {
    it.each(DIALECTS)(
      "[%s] NULL 값 UPDATE (undefined는 제외, null은 NULL)",
      (dialect: TDialect) => {
        const db = new TestDbContext(dialect);

        const def = db.user
          .where((c) => [db.qh.eq(c.id, 1n)])
          .getUpdateQueryDef((c) => ({
            age: db.qh.sql("number")`${c.age} + 3`,
          }));
        const sql = db.qb.update(def);

        expect(sql).toMatchSql(expected.updateWithPrevValue[dialect]);
      },
    );
  });

  // ============================================
  // UPDATE with OUTPUT
  // ============================================
  describe("update with output", () => {
    it.each(DIALECTS)("[%s] UPDATE with OUTPUT", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getUpdateQueryDef(
          () => ({
            name: "홍길동",
          }),
          ["id", "name"],
        );
      const sql = db.qb.update(def);

      expect(sql).toMatchSql(expected.updateWithOutput[dialect]);
    });
  });

  // ============================================
  // UPDATE with disableFkCheck
  // ============================================
  describe("update with disableFkCheck", () => {
    it.each(DIALECTS)("[%s] FK 체크 비활성화 UPDATE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.order
        .where((c) => [db.qh.eq(c.id, 1n)])
        .getUpdateWithoutFkCheckQueryDef(() => ({
          userId: 999n, // 존재하지 않는 FK
        }));
      const sql = db.qb.update(def);

      expect(sql).toMatchSql(expected.updateWithDisableFkCheck[dialect]);
    });
  });

  // ============================================
  // UPDATE with JOIN + WHERE
  // ============================================
  describe("update with join", () => {
    it.each(DIALECTS)("[%s] UPDATE with JOIN + WHERE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // Post를 User와 join해서, User.isActive가 false인 Post들의 viewCount를 0으로 UPDATE
      const def = db.post
        .include((r) => r.user!)
        .where((c) => [db.qh.eq(c.user!.isActive, false)])
        .getUpdateQueryDef(() => ({
          viewCount: 0,
        }));
      const sql = db.qb.update(def);

      expect(sql).toMatchSql(expected.updateWithJoin[dialect]);
    });
  });

  // ============================================
  // UPDATE 복수 WHERE 조건
  // ============================================
  describe("update with multiple where", () => {
    it.each(DIALECTS)("[%s] UPDATE with 복수 WHERE", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const def = db.user
        .where((c) => [db.qh.eq(c.isActive, true), db.qh.gte(c.age, 18)])
        .getUpdateQueryDef(() => ({
          isActive: false,
        }));
      const sql = db.qb.update(def);

      expect(sql).toMatchSql(expected.updateWithMultipleWhere[dialect]);
    });
  });
});
