import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Post } from "../setup/models/Post";
import { User } from "../setup/models/User";
import { Company } from "../setup/models/Company";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./join.expected";

describe("SELECT - JOIN", () => {
  describe("기본", () => {
    const db = createTestDb();
    const def = db
      .user()
      .join("post", (q, c) => q.from(Post).where((item) => [expr.eq(item.userId, c.id)]))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
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
          "post.id": { type: "column", path: ["T1.post", "id"] },
          "post.userId": { type: "column", path: ["T1.post", "userId"] },
          "post.title": { type: "column", path: ["T1.post", "title"] },
          "post.content": { type: "column", path: ["T1.post", "content"] },
          "post.viewCount": { type: "column", path: ["T1.post", "viewCount"] },
          "post.publishedAt": { type: "column", path: ["T1.post", "publishedAt"] },
        },
        joins: [
          {
            type: "select",
            as: "T1.post",
            from: { database: "TestDb", schema: "TestSchema", name: "Post" },
            isSingle: false,
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1.post", "userId"] },
                target: { type: "column", path: ["T1", "id"] },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinBasic[dialect]);
    });
  });

  describe("joinSingle", () => {
    const db = createTestDb();
    const def = db
      .post()
      .joinSingle("user", (q, c) => q.from(User).where((item) => [expr.eq(item.id, c.userId)]))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Post" },
        select: {
          "id": { type: "column", path: ["T1", "id"] },
          "userId": { type: "column", path: ["T1", "userId"] },
          "title": { type: "column", path: ["T1", "title"] },
          "content": { type: "column", path: ["T1", "content"] },
          "viewCount": { type: "column", path: ["T1", "viewCount"] },
          "publishedAt": { type: "column", path: ["T1", "publishedAt"] },
          "user.id": { type: "column", path: ["T1.user", "id"] },
          "user.name": { type: "column", path: ["T1.user", "name"] },
          "user.email": { type: "column", path: ["T1.user", "email"] },
          "user.age": { type: "column", path: ["T1.user", "age"] },
          "user.isActive": { type: "column", path: ["T1.user", "isActive"] },
          "user.companyId": { type: "column", path: ["T1.user", "companyId"] },
          "user.createdAt": { type: "column", path: ["T1.user", "createdAt"] },
        },
        joins: [
          {
            type: "select",
            as: "T1.user",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            isSingle: true,
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1.user", "id"] },
                target: { type: "column", path: ["T1", "userId"] },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinSingle[dialect]);
    });
  });

  it("select 후 join", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({ id: item.id, name: item.name }))
      .join("post", (q, c) => q.from(Post).where((item) => [expr.eq(item.userId, c.id)]))
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "User" },
      select: {
        "id": { type: "column", path: ["T1", "id"] },
        "name": { type: "column", path: ["T1", "name"] },
        "post.id": { type: "column", path: ["T1.post", "id"] },
        "post.userId": { type: "column", path: ["T1.post", "userId"] },
        "post.title": { type: "column", path: ["T1.post", "title"] },
        "post.content": { type: "column", path: ["T1.post", "content"] },
        "post.viewCount": { type: "column", path: ["T1.post", "viewCount"] },
        "post.publishedAt": { type: "column", path: ["T1.post", "publishedAt"] },
      },
      joins: [
        {
          type: "select",
          as: "T1.post",
          from: { database: "TestDb", schema: "TestSchema", name: "Post" },
          isSingle: false,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.post", "userId"] },
              target: { type: "column", path: ["T1", "id"] },
            },
          ],
        },
      ],
    });
  });

  it("다중 join", () => {
    const db = createTestDb();
    const def = db
      .user()
      .join("posts", (q, c) => q.from(Post).where((item) => [expr.eq(item.userId, c.id)]))
      .join("company", (q, c) => q.from(Company).where((item) => [expr.eq(item.id, c.companyId)]))
      .getSelectQueryDef();

    expect(def).toEqual({
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
        "company.id": { type: "column", path: ["T1.company", "id"] },
        "company.name": { type: "column", path: ["T1.company", "name"] },
        "company.foundedAt": { type: "column", path: ["T1.company", "foundedAt"] },
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
        {
          type: "select",
          as: "T1.company",
          from: { database: "TestDb", schema: "TestSchema", name: "Company" },
          isSingle: false,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.company", "id"] },
              target: { type: "column", path: ["T1", "companyId"] },
            },
          ],
        },
      ],
    });
  });

  describe("다단계 join(Single)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .joinSingle("user", (q, c) =>
        q
          .from(User)
          .joinSingle("company", (q2, c2) =>
            q2.from(Company).where((item) => [expr.eq(item.id, c2.companyId)]),
          )
          .where((item) => [expr.eq(item.id, c.userId)]),
      )
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Post" },
        select: {
          "id": { type: "column", path: ["T1", "id"] },
          "userId": { type: "column", path: ["T1", "userId"] },
          "title": { type: "column", path: ["T1", "title"] },
          "content": { type: "column", path: ["T1", "content"] },
          "viewCount": { type: "column", path: ["T1", "viewCount"] },
          "publishedAt": { type: "column", path: ["T1", "publishedAt"] },
          "user.id": { type: "column", path: ["T1.user", "id"] },
          "user.name": { type: "column", path: ["T1.user", "name"] },
          "user.email": { type: "column", path: ["T1.user", "email"] },
          "user.age": { type: "column", path: ["T1.user", "age"] },
          "user.isActive": { type: "column", path: ["T1.user", "isActive"] },
          "user.companyId": { type: "column", path: ["T1.user", "companyId"] },
          "user.createdAt": { type: "column", path: ["T1.user", "createdAt"] },
          "user.company.id": { type: "column", path: ["T1.user", "company.id"] },
          "user.company.name": { type: "column", path: ["T1.user", "company.name"] },
          "user.company.foundedAt": { type: "column", path: ["T1.user", "company.foundedAt"] },
        },
        joins: [
          {
            type: "select",
            as: "T1.user",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            isSingle: true,
            select: {
              "id": { type: "column", path: ["T1.user", "id"] },
              "name": { type: "column", path: ["T1.user", "name"] },
              "email": { type: "column", path: ["T1.user", "email"] },
              "age": { type: "column", path: ["T1.user", "age"] },
              "isActive": { type: "column", path: ["T1.user", "isActive"] },
              "companyId": { type: "column", path: ["T1.user", "companyId"] },
              "createdAt": { type: "column", path: ["T1.user", "createdAt"] },
              "company.id": { type: "column", path: ["T1.user.company", "id"] },
              "company.name": { type: "column", path: ["T1.user.company", "name"] },
              "company.foundedAt": { type: "column", path: ["T1.user.company", "foundedAt"] },
            },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1.user", "id"] },
                target: { type: "column", path: ["T1", "userId"] },
              },
            ],
            joins: [
              {
                type: "select",
                as: "T1.user.company",
                from: { database: "TestDb", schema: "TestSchema", name: "Company" },
                isSingle: true,
                where: [
                  {
                    type: "eq",
                    source: { type: "column", path: ["T1.user.company", "id"] },
                    target: { type: "column", path: ["T1.user", "companyId"] },
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinSingleMultiLevel[dialect]);
    });
  });

  describe("joinSingle + LATERAL (orderBy + top)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .joinSingle("latestPost", (qr, c) =>
        qr
          .from(Post)
          .where((item) => [expr.eq(item.userId, c.id)])
          .orderBy((item) => item.publishedAt, "DESC")
          .top(1),
      )
      .getSelectQueryDef();

    it("QueryDef 검증 - orderBy, top 포함", () => {
      const join = def.joins![0];
      expect(join.orderBy).toEqual([
        [{ type: "column", path: ["T1.latestPost", "publishedAt"] }, "DESC"],
      ]);
      expect(join.top).toBe(1);
      expect(join.isSingle).toBe(true);
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinSingleLateral[dialect]);
    });
  });

  describe("joinSingle + LATERAL (select 집계)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .joinSingle("postStats", (qr, c) =>
        qr
          .from(Post)
          .where((item) => [expr.eq(item.userId, c.id)])
          .select(() => ({ cnt: expr.count() })),
      )
      .getSelectQueryDef();

    it("QueryDef 검증 - select 포함", () => {
      const join = def.joins![0];
      expect(join.select).toBeDefined();
      expect(join.select!["cnt"]).toEqual({ type: "count" });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinSingleLateralAgg[dialect]);
    });
  });

  it("join + where 조합", () => {
    const db = createTestDb();
    const def = db
      .user()
      .join("post", (q, c) => q.from(Post).where((item) => [expr.eq(item.userId, c.id)]))
      .where((item) => [expr.eq(item.isActive, true)])
      .getSelectQueryDef();

    expect(def).toEqual({
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
        "post.id": { type: "column", path: ["T1.post", "id"] },
        "post.userId": { type: "column", path: ["T1.post", "userId"] },
        "post.title": { type: "column", path: ["T1.post", "title"] },
        "post.content": { type: "column", path: ["T1.post", "content"] },
        "post.viewCount": { type: "column", path: ["T1.post", "viewCount"] },
        "post.publishedAt": { type: "column", path: ["T1.post", "publishedAt"] },
      },
      where: [
        {
          type: "eq",
          source: { type: "column", path: ["T1", "isActive"] },
          target: { type: "value", value: true },
        },
      ],
      joins: [
        {
          type: "select",
          as: "T1.post",
          from: { database: "TestDb", schema: "TestSchema", name: "Post" },
          isSingle: false,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.post", "userId"] },
              target: { type: "column", path: ["T1", "id"] },
            },
          ],
        },
      ],
    });
  });
});

describe("SELECT - INCLUDE", () => {
  it("FK (N:1)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .include((item) => item.user)
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      select: {
        "id": { type: "column", path: ["T1", "id"] },
        "userId": { type: "column", path: ["T1", "userId"] },
        "title": { type: "column", path: ["T1", "title"] },
        "content": { type: "column", path: ["T1", "content"] },
        "viewCount": { type: "column", path: ["T1", "viewCount"] },
        "publishedAt": { type: "column", path: ["T1", "publishedAt"] },
        "user.id": { type: "column", path: ["T1.user", "id"] },
        "user.name": { type: "column", path: ["T1.user", "name"] },
        "user.email": { type: "column", path: ["T1.user", "email"] },
        "user.age": { type: "column", path: ["T1.user", "age"] },
        "user.isActive": { type: "column", path: ["T1.user", "isActive"] },
        "user.companyId": { type: "column", path: ["T1.user", "companyId"] },
        "user.createdAt": { type: "column", path: ["T1.user", "createdAt"] },
      },
      joins: [
        {
          type: "select",
          as: "T1.user",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          isSingle: true,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.user", "id"] },
              target: { type: "column", path: ["T1", "userId"] },
            },
          ],
        },
      ],
    });
  });

  it("FKT (1:N)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .include((item) => item.posts)
      .getSelectQueryDef();

    expect(def).toEqual({
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
    });
  });

  it("다단계 include (FK -> FK)", () => {
    const db = createTestDb();
    const def = db
      .post()
      .include((item) => item.user.company)
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      select: {
        "id": { type: "column", path: ["T1", "id"] },
        "userId": { type: "column", path: ["T1", "userId"] },
        "title": { type: "column", path: ["T1", "title"] },
        "content": { type: "column", path: ["T1", "content"] },
        "viewCount": { type: "column", path: ["T1", "viewCount"] },
        "publishedAt": { type: "column", path: ["T1", "publishedAt"] },
        "user.id": { type: "column", path: ["T1.user", "id"] },
        "user.name": { type: "column", path: ["T1.user", "name"] },
        "user.email": { type: "column", path: ["T1.user", "email"] },
        "user.age": { type: "column", path: ["T1.user", "age"] },
        "user.isActive": { type: "column", path: ["T1.user", "isActive"] },
        "user.companyId": { type: "column", path: ["T1.user", "companyId"] },
        "user.createdAt": { type: "column", path: ["T1.user", "createdAt"] },
        "user.company.id": { type: "column", path: ["T1.user.company", "id"] },
        "user.company.name": { type: "column", path: ["T1.user.company", "name"] },
        "user.company.foundedAt": { type: "column", path: ["T1.user.company", "foundedAt"] },
      },
      joins: [
        {
          type: "select",
          as: "T1.user",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          isSingle: true,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.user", "id"] },
              target: { type: "column", path: ["T1", "userId"] },
            },
          ],
        },
        {
          type: "select",
          as: "T1.user.company",
          from: { database: "TestDb", schema: "TestSchema", name: "Company" },
          isSingle: true,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.user.company", "id"] },
              target: { type: "column", path: ["T1.user", "companyId"] },
            },
          ],
        },
      ],
    });
  });

  it("다중 include", () => {
    const db = createTestDb();
    const def = db
      .post()
      .include((item) => item.user)
      .include((item) => item.user.company)
      .getSelectQueryDef();

    // 중복 include는 자동으로 제거됨 (user 1번, company 1번)
    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      select: {
        "id": { type: "column", path: ["T1", "id"] },
        "userId": { type: "column", path: ["T1", "userId"] },
        "title": { type: "column", path: ["T1", "title"] },
        "content": { type: "column", path: ["T1", "content"] },
        "viewCount": { type: "column", path: ["T1", "viewCount"] },
        "publishedAt": { type: "column", path: ["T1", "publishedAt"] },
        "user.id": { type: "column", path: ["T1.user", "id"] },
        "user.name": { type: "column", path: ["T1.user", "name"] },
        "user.email": { type: "column", path: ["T1.user", "email"] },
        "user.age": { type: "column", path: ["T1.user", "age"] },
        "user.isActive": { type: "column", path: ["T1.user", "isActive"] },
        "user.companyId": { type: "column", path: ["T1.user", "companyId"] },
        "user.createdAt": { type: "column", path: ["T1.user", "createdAt"] },
        "user.company.id": { type: "column", path: ["T1.user.company", "id"] },
        "user.company.name": { type: "column", path: ["T1.user.company", "name"] },
        "user.company.foundedAt": { type: "column", path: ["T1.user.company", "foundedAt"] },
      },
      joins: [
        {
          type: "select",
          as: "T1.user",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          isSingle: true,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.user", "id"] },
              target: { type: "column", path: ["T1", "userId"] },
            },
          ],
        },
        {
          type: "select",
          as: "T1.user.company",
          from: { database: "TestDb", schema: "TestSchema", name: "Company" },
          isSingle: true,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.user.company", "id"] },
              target: { type: "column", path: ["T1.user", "companyId"] },
            },
          ],
        },
      ],
    });
  });

  it("include + select 조합", () => {
    const db = createTestDb();
    const def = db
      .post()
      .include((item) => item.user)
      .select((item) => ({
        title: item.title,
        userName: item.user!.name,
      }))
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      select: {
        title: { type: "column", path: ["T1", "title"] },
        userName: { type: "column", path: ["T1.user", "name"] },
      },
      joins: [
        {
          type: "select",
          as: "T1.user",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          isSingle: true,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.user", "id"] },
              target: { type: "column", path: ["T1", "userId"] },
            },
          ],
        },
      ],
    });
  });

  it("include + where 조합", () => {
    const db = createTestDb();
    const def = db
      .post()
      .include((item) => item.user)
      .where((item) => [expr.eq(item.user!.isActive, true)])
      .getSelectQueryDef();

    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "Post" },
      select: {
        "id": { type: "column", path: ["T1", "id"] },
        "userId": { type: "column", path: ["T1", "userId"] },
        "title": { type: "column", path: ["T1", "title"] },
        "content": { type: "column", path: ["T1", "content"] },
        "viewCount": { type: "column", path: ["T1", "viewCount"] },
        "publishedAt": { type: "column", path: ["T1", "publishedAt"] },
        "user.id": { type: "column", path: ["T1.user", "id"] },
        "user.name": { type: "column", path: ["T1.user", "name"] },
        "user.email": { type: "column", path: ["T1.user", "email"] },
        "user.age": { type: "column", path: ["T1.user", "age"] },
        "user.isActive": { type: "column", path: ["T1.user", "isActive"] },
        "user.companyId": { type: "column", path: ["T1.user", "companyId"] },
        "user.createdAt": { type: "column", path: ["T1.user", "createdAt"] },
      },
      where: [
        {
          type: "eq",
          source: { type: "column", path: ["T1.user", "isActive"] },
          target: { type: "value", value: true },
        },
      ],
      joins: [
        {
          type: "select",
          as: "T1.user",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          isSingle: true,
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1.user", "id"] },
              target: { type: "column", path: ["T1", "userId"] },
            },
          ],
        },
      ],
    });
  });

  describe("3 depth include (FK -> FKT -> FK)", () => {
    // Post → user(FK) → posts(FKT) → user(FK)
    const db = createTestDb();
    const def = db
      .post()
      .include((item) => item.user.posts.user)
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "Post" },
        select: {
          "id": { type: "column", path: ["T1", "id"] },
          "userId": { type: "column", path: ["T1", "userId"] },
          "title": { type: "column", path: ["T1", "title"] },
          "content": { type: "column", path: ["T1", "content"] },
          "viewCount": { type: "column", path: ["T1", "viewCount"] },
          "publishedAt": { type: "column", path: ["T1", "publishedAt"] },
          "user.id": { type: "column", path: ["T1.user", "id"] },
          "user.name": { type: "column", path: ["T1.user", "name"] },
          "user.email": { type: "column", path: ["T1.user", "email"] },
          "user.age": { type: "column", path: ["T1.user", "age"] },
          "user.isActive": { type: "column", path: ["T1.user", "isActive"] },
          "user.companyId": { type: "column", path: ["T1.user", "companyId"] },
          "user.createdAt": { type: "column", path: ["T1.user", "createdAt"] },
          "user.posts.id": { type: "column", path: ["T1.user.posts", "id"] },
          "user.posts.userId": { type: "column", path: ["T1.user.posts", "userId"] },
          "user.posts.title": { type: "column", path: ["T1.user.posts", "title"] },
          "user.posts.content": { type: "column", path: ["T1.user.posts", "content"] },
          "user.posts.viewCount": { type: "column", path: ["T1.user.posts", "viewCount"] },
          "user.posts.publishedAt": { type: "column", path: ["T1.user.posts", "publishedAt"] },
          "user.posts.user.id": { type: "column", path: ["T1.user.posts.user", "id"] },
          "user.posts.user.name": { type: "column", path: ["T1.user.posts.user", "name"] },
          "user.posts.user.email": { type: "column", path: ["T1.user.posts.user", "email"] },
          "user.posts.user.age": { type: "column", path: ["T1.user.posts.user", "age"] },
          "user.posts.user.isActive": { type: "column", path: ["T1.user.posts.user", "isActive"] },
          "user.posts.user.companyId": {
            type: "column",
            path: ["T1.user.posts.user", "companyId"],
          },
          "user.posts.user.createdAt": {
            type: "column",
            path: ["T1.user.posts.user", "createdAt"],
          },
        },
        joins: [
          {
            type: "select",
            as: "T1.user",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            isSingle: true,
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1.user", "id"] },
                target: { type: "column", path: ["T1", "userId"] },
              },
            ],
          },
          {
            type: "select",
            as: "T1.user.posts",
            from: { database: "TestDb", schema: "TestSchema", name: "Post" },
            isSingle: false,
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1.user.posts", "userId"] },
                target: { type: "column", path: ["T1.user", "id"] },
              },
            ],
          },
          {
            type: "select",
            as: "T1.user.posts.user",
            from: { database: "TestDb", schema: "TestSchema", name: "User" },
            isSingle: true,
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1.user.posts.user", "id"] },
                target: { type: "column", path: ["T1.user.posts", "userId"] },
              },
            ],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.include3Depth[dialect]);
    });
  });
});
