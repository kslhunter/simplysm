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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T2",
        from: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T2",
        from: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
        },
        select: {
          id: { type: "column", path: ["T2", "id"] },
          name: { type: "column", path: ["T2", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T2",
        from: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          select: {
            id: { type: "column", path: ["T1", "id"] },
            name: { type: "column", path: ["T1", "name"] },
          },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T2",
        from: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "isActive"] },
              target: { type: "value", value: true },
            },
          ],
        },
        where: [
          {
            type: "gt",
            source: { type: "column", path: ["T2", "age"] },
            target: { type: "value", value: 20 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T2",
        from: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          select: {
            "id": { type: "column", path: ["T1", "id"] },
            "name": { type: "column", path: ["T1", "name"] },
            "email": { type: "column", path: ["T1", "email"] },
            "age": { type: "column", path: ["T1", "age"] },
            "isActive": { type: "column", path: ["T1", "isActive"] },
            "companyId": { type: "column", path: ["T1", "companyId"] },
            "createdAt": { type: "column", path: ["T1", "createdAt"] },
            "posts.id": { type: "column", path: ["T1.posts", "id"] },
            "posts.userId": { type: "column", path: ["T1.posts", "userId"] },
            "posts.title": { type: "column", path: ["T1.posts", "title"] },
            "posts.content": { type: "column", path: ["T1.posts", "content"] },
            "posts.viewCount": { type: "column", path: ["T1.posts", "viewCount"] },
            "posts.publishedAt": { type: "column", path: ["T1.posts", "publishedAt"] },
          },
          joins: [
            {
              type: "select",
              as: "T1.posts",
              from: { database: "TestDb", schema: "TestSchema", name: "Post" },
              isSingle: false,
              where: [
                {
                  type: "eq",
                  source: { type: "column", path: ["T1.posts", "userId"] },
                  target: { type: "column", path: ["T1", "id"] },
                },
              ],
            },
          ],
        },
        select: {
          postUserId: { type: "column", path: ["T2", "posts.userId"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T2",
        from: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          select: {
            name: { type: "column", path: ["T1", "name"] },
            cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] }, distinct: undefined },
          },
          groupBy: [{ type: "column", path: ["T1", "name"] }],
        },
        orderBy: [[{ type: "column", path: ["T2", "cnt"] }, "DESC"]],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupByThenWrapThenOrderBy[dialect]);
    });
  });
});

describe("SELECT - UNION", () => {
  describe("기본 (2개)", () => {
    const db = createTestDb();
    const qr1 = db.user().where((item) => [expr.eq(item.isActive, true)]);
    const qr2 = db.user().where((item) => [expr.gt(item.age, 30)]);
    const def = Queryable.union(qr1, qr2).getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T3",
        from: [
          {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "isActive"] },
                target: { type: "value", value: true },
              },
            ],
          },
          {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            where: [
              {
                type: "gt",
                source: { type: "column", path: ["T2", "age"] },
                target: { type: "value", value: 30 },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unionBasic[dialect]);
    });
  });

  describe("3개 이상", () => {
    const db = createTestDb();
    const qr1 = db.user().where((item) => [expr.eq(item.age, 20)]);
    const qr2 = db.user().where((item) => [expr.eq(item.age, 30)]);
    const qr3 = db.user().where((item) => [expr.eq(item.age, 40)]);
    const def = Queryable.union(qr1, qr2, qr3).getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T4",
        from: [
          {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "age"] },
                target: { type: "value", value: 20 },
              },
            ],
          },
          {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T2", "age"] },
                target: { type: "value", value: 30 },
              },
            ],
          },
          {
            type: "select",
            as: "T3",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T3", "age"] },
                target: { type: "value", value: 40 },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unionThree[dialect]);
    });
  });

  describe("UNION -> WHERE (각 쿼리에 적용)", () => {
    const db = createTestDb();
    const qr1 = db.user();
    const qr2 = db.user();
    const def = Queryable.union(qr1, qr2)
      .where((item) => [expr.eq(item.isActive, true)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T3",
        from: [
          {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "isActive"] },
                target: { type: "value", value: true },
              },
            ],
          },
          {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T2", "isActive"] },
                target: { type: "value", value: true },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T4",
        from: {
          type: "select",
          as: "T3",
          from: [
            {
              type: "select",
              as: "T1",
              from: { database: "TestDb", schema: "TestSchema", name: "User" },
              where: [
                {
                  type: "eq",
                  source: { type: "column", path: ["T1", "isActive"] },
                  target: { type: "value", value: true },
                },
              ],
            },
            {
              type: "select",
              as: "T2",
              from: { database: "TestDb", schema: "TestSchema", name: "User" },
              where: [
                {
                  type: "gt",
                  source: { type: "column", path: ["T2", "age"] },
                  target: { type: "value", value: 30 },
                },
              ],
            },
          ],
        },
        orderBy: [[{ type: "column", path: ["T4", "id"] }, "DESC"]],
        limit: [0, 10],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unionThenWrapThenOrderByLimit[dialect]);
    });
  });

  describe("UNION -> SELECT", () => {
    const db = createTestDb();
    const qr1 = db.user().select((item) => ({ id: item.id, name: item.name }));
    const qr2 = db.user().select((item) => ({ id: item.id, name: item.name }));
    const def = Queryable.union(qr1, qr2).getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T3",
        from: [
          {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            select: {
              id: { type: "column", path: ["T1", "id"] },
              name: { type: "column", path: ["T1", "name"] },
            },
          },
          {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            select: {
              id: { type: "column", path: ["T2", "id"] },
              name: { type: "column", path: ["T2", "name"] },
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.unionThenSelect[dialect]);
    });
  });
});

//#region ========== SCALAR SUBQUERY ==========

describe("SELECT - SCALAR SUBQUERY (expr.subquery)", () => {
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

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          postCount: {
            type: "subquery",
            queryDef: {
              type: "select",
              as: "T2",
              from: { database: "TestDb", schema: "TestSchema", name: "Post" },
              where: [
                {
                  type: "eq",
                  source: { type: "column", path: ["T2", "userId"] },
                  target: { type: "column", path: ["T1", "id"] },
                },
              ],
              select: {
                cnt: { type: "count" },
              },
            },
          },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.scalarSubquery[dialect]);
    });
  });
});

//#endregion
