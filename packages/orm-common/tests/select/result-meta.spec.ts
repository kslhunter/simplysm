import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Post } from "../setup/models/Post";
import { User } from "../setup/models/User";
import { Company } from "../setup/models/Company";
import { expr } from "../../src/expr/expr";

describe("getResultMeta", () => {
  it("기본 테이블", () => {
    const db = createTestDb();
    const meta = db.user().getResultMeta();

    expect(meta).toEqual({
      columns: {
        id: "number",
        name: "string",
        email: "string",
        age: "number",
        isActive: "boolean",
        companyId: "number",
        createdAt: "DateTime",
      },
      joins: {},
    });
  });

  it("join (1:N 배열)", () => {
    const db = createTestDb();
    const meta = db
      .user()
      .join("posts", (q, c) => q.from(Post).where((item) => [expr.eq(item.userId, c.id)]))
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        "id": "number",
        "name": "string",
        "email": "string",
        "age": "number",
        "isActive": "boolean",
        "companyId": "number",
        "createdAt": "DateTime",
        "posts.id": "number",
        "posts.userId": "number",
        "posts.title": "string",
        "posts.content": "string",
        "posts.viewCount": "number",
        "posts.publishedAt": "DateTime",
      },
      joins: {
        posts: { isSingle: false },
      },
    });
  });

  it("joinSingle (N:1 단일)", () => {
    const db = createTestDb();
    const meta = db
      .post()
      .joinSingle("user", (q, c) => q.from(User).where((item) => [expr.eq(item.id, c.userId)]))
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        "id": "number",
        "userId": "number",
        "title": "string",
        "content": "string",
        "viewCount": "number",
        "publishedAt": "DateTime",
        "user.id": "number",
        "user.name": "string",
        "user.email": "string",
        "user.age": "number",
        "user.isActive": "boolean",
        "user.companyId": "number",
        "user.createdAt": "DateTime",
      },
      joins: {
        user: { isSingle: true },
      },
    });
  });

  it("다단계 join", () => {
    const db = createTestDb();
    const meta = db
      .post()
      .joinSingle("user", (q, c) =>
        q
          .from(User)
          .joinSingle("company", (q2, c2) => q2.from(Company).where((item) => [expr.eq(item.id, c2.companyId)]))
          .where((item) => [expr.eq(item.id, c.userId)]),
      )
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        "id": "number",
        "userId": "number",
        "title": "string",
        "content": "string",
        "viewCount": "number",
        "publishedAt": "DateTime",
        "user.id": "number",
        "user.name": "string",
        "user.email": "string",
        "user.age": "number",
        "user.isActive": "boolean",
        "user.companyId": "number",
        "user.createdAt": "DateTime",
        "user.company.id": "number",
        "user.company.name": "string",
        "user.company.foundedAt": "DateOnly",
      },
      joins: {
        "user": { isSingle: true },
        "user.company": { isSingle: true },
      },
    });
  });

  it("다중 join (배열 + 단일)", () => {
    const db = createTestDb();
    const meta = db
      .user()
      .join("posts", (q, c) => q.from(Post).where((item) => [expr.eq(item.userId, c.id)]))
      .joinSingle("company", (q, c) => q.from(Company).where((item) => [expr.eq(item.id, c.companyId)]))
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        "id": "number",
        "name": "string",
        "email": "string",
        "age": "number",
        "isActive": "boolean",
        "companyId": "number",
        "createdAt": "DateTime",
        "posts.id": "number",
        "posts.userId": "number",
        "posts.title": "string",
        "posts.content": "string",
        "posts.viewCount": "number",
        "posts.publishedAt": "DateTime",
        "company.id": "number",
        "company.name": "string",
        "company.foundedAt": "DateOnly",
      },
      joins: {
        posts: { isSingle: false },
        company: { isSingle: true },
      },
    });
  });

  it("select로 커스텀 columns", () => {
    const db = createTestDb();
    const meta = db
      .user()
      .select((cols) => ({
        userId: cols.id,
        userName: cols.name,
      }))
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        userId: "number",
        userName: "string",
      },
      joins: {},
    });
  });

  it("include (FK N:1)", () => {
    const db = createTestDb();
    const meta = db
      .post()
      .include((item) => item.user)
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        "id": "number",
        "userId": "number",
        "title": "string",
        "content": "string",
        "viewCount": "number",
        "publishedAt": "DateTime",
        "user.id": "number",
        "user.name": "string",
        "user.email": "string",
        "user.age": "number",
        "user.isActive": "boolean",
        "user.companyId": "number",
        "user.createdAt": "DateTime",
      },
      joins: {
        user: { isSingle: true },
      },
    });
  });

  it("include (FKT 1:N)", () => {
    const db = createTestDb();
    const meta = db
      .user()
      .include((item) => item.posts)
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        "id": "number",
        "name": "string",
        "email": "string",
        "age": "number",
        "isActive": "boolean",
        "companyId": "number",
        "createdAt": "DateTime",
        "posts.id": "number",
        "posts.userId": "number",
        "posts.title": "string",
        "posts.content": "string",
        "posts.viewCount": "number",
        "posts.publishedAt": "DateTime",
      },
      joins: {
        posts: { isSingle: false },
      },
    });
  });

  it("다단계 include", () => {
    const db = createTestDb();
    const meta = db
      .post()
      .include((item) => item.user.company)
      .getResultMeta();

    expect(meta).toEqual({
      columns: {
        "id": "number",
        "userId": "number",
        "title": "string",
        "content": "string",
        "viewCount": "number",
        "publishedAt": "DateTime",
        "user.id": "number",
        "user.name": "string",
        "user.email": "string",
        "user.age": "number",
        "user.isActive": "boolean",
        "user.companyId": "number",
        "user.createdAt": "DateTime",
        "user.company.id": "number",
        "user.company.name": "string",
        "user.company.foundedAt": "DateOnly",
      },
      joins: {
        "user": { isSingle: true },
        "user.company": { isSingle: true },
      },
    });
  });
});
