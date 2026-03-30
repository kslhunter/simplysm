import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { Queryable } from "../../src/exec/queryable";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./subquery.expected";

describe("SELECT - WRAP (서브쿼리)", () => {
  describe("기본", () => {
    const db = createTestDb();
    const def = db.user().wrap().getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.wrapBasic[dialect]);
    });
  });

  describe("WRAP -> SELECT", () => {
    const db = createTestDb();
    const def = db
      .user()
      .wrap()
      .select((item) => ({ id: item.id, name: item.name }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.wrapThenSelect[dialect]);
    });
  });

  describe("SELECT -> WRAP", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({ id: item.id, name: item.name }))
      .wrap()
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectThenWrap[dialect]);
    });
  });

  describe("WHERE -> WRAP -> WHERE", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.eq(item.isActive, true)])
      .wrap()
      .where((item) => [expr.gt(item.age, 20)])
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.whereThenWrapThenWhere[dialect]);
    });
  });

  describe("INCLUDE -> WRAP -> SELECT", () => {
    const db = createTestDb();
    const def = db
      .user()
      .include((item) => item.posts)
      .wrap()
      .select((item) => ({ postUserId: item.posts![0].userId }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.includeThenWrapThenSelect[dialect]);
    });
  });

  describe("GROUP BY -> WRAP -> ORDER BY", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name])
      .wrap()
      .orderBy((item) => item.cnt, "DESC")
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupByThenWrapThenOrderBy[dialect]);
    });
  });
});

describe("SELECT - UNION", () => {
  describe("기본 (2개 항목)", () => {
    const db = createTestDb();
    const qr1 = db.user().where((item) => [expr.eq(item.isActive, true)]);
    const qr2 = db.user().where((item) => [expr.gt(item.age, 30)]);
    const def = Queryable.union(qr1, qr2).getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unionBasic[dialect]);
    });
  });

  describe("UNION -> WHERE (각 쿼리에 적용)", () => {
    const db = createTestDb();
    const qr1 = db.user();
    const qr2 = db.user();
    const def = Queryable.union(qr1, qr2)
      .where((item) => [expr.eq(item.isActive, true)])
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unionThenWhere[dialect]);
    });
  });

  describe("UNION -> WRAP -> ORDER BY + LIMIT", () => {
    const db = createTestDb();
    const qr1 = db.user().where((item) => [expr.eq(item.isActive, true)]);
    const qr2 = db.user().where((item) => [expr.gt(item.age, 30)]);
    const def = Queryable.union(qr1, qr2)
      .wrap()
      .orderBy((item) => item.id, "DESC")
      .limit(0, 10)
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unionThenWrapThenOrderByLimit[dialect]);
    });
  });

});

//#region ========== SCALAR SUBQUERY ==========

describe("SELECT - 스칼라 서브쿼리 (expr.subquery)", () => {
  describe("기본 (COUNT)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((u) => ({
        id: u.id,
        postCount: expr.subquery(
          "number",
          db
            .post()
            .where((p) => [expr.eq(p.userId, u.id)])
            .select(() => ({ cnt: expr.count() })),
        ),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.scalarSubquery[dialect]);
    });
  });
});

//#endregion
