import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { ActiveUsers } from "../setup/views/ActiveUsers";
import { UserSummary } from "../setup/views/UserSummary";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./view.expected";

describe("View - 기본", () => {
  describe("View에서 SELECT", () => {
    const db = createTestDb();
    const def = db.activeUsers().getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        from: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
        as: "T1",
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelect[dialect]);
    });
  });

  describe("View에서 SELECT + WHERE", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .where((u) => [expr.gt(u.age, 20)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        from: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
        as: "T1",
        where: [
          {
            type: "gt",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 20 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectWhere[dialect]);
    });
  });

  describe("View에서 SELECT + 컬럼 선택", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .select((u) => ({
        id: u.id,
        name: u.name,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        from: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
        as: "T1",
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectColumns[dialect]);
    });
  });

  describe("View에서 SELECT + ORDER BY", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .orderBy((u) => u.name, "ASC")
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        from: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
        as: "T1",
        orderBy: [[{ type: "column", path: ["T1", "name"] }, "ASC"]],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectOrderBy[dialect]);
    });
  });

  describe("View에서 SELECT + ORDER BY + LIMIT", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .orderBy((u) => u.id)
      .limit(0, 10)
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        from: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
        as: "T1",
        orderBy: [[{ type: "column", path: ["T1", "id"] }]],
        limit: [0, 10],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectOrderByLimit[dialect]);
    });
  });
});

describe("View - SELECT가 있는 뷰", () => {
  describe("UserSummaryView에서 SELECT", () => {
    const db = createTestDb();
    const def = db.userSummary().getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        from: { database: "TestDb", schema: "TestSchema", name: "UserSummary" },
        as: "T1",
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.userSummarySelect[dialect]);
    });
  });

  describe("UserSummaryView에서 특정 컬럼 선택", () => {
    const db = createTestDb();
    const def = db
      .userSummary()
      .select((u) => ({
        userName: u.name,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        from: { database: "TestDb", schema: "TestSchema", name: "UserSummary" },
        as: "T1",
        select: {
          userName: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.userSummarySelectColumn[dialect]);
    });
  });
});

describe("View - DDL", () => {
  describe("getCreateViewQueryDef - ActiveUsersView", () => {
    const db = createTestDb();
    const def = db.getCreateViewQueryDef(ActiveUsers);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createView",
        view: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
        queryDef: {
          type: "select",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          as: "T1",
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "isActive"] },
              target: { type: "value", value: true },
            },
          ],
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createActiveUsersView[dialect]);
    });
  });

  describe("getCreateViewQueryDef - UserSummaryView", () => {
    const db = createTestDb();
    const def = db.getCreateViewQueryDef(UserSummary);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createView",
        view: { database: "TestDb", schema: "TestSchema", name: "UserSummary" },
        queryDef: {
          type: "select",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          as: "T1",
          select: {
            id: { type: "column", path: ["T1", "id"] },
            name: { type: "column", path: ["T1", "name"] },
            email: { type: "column", path: ["T1", "email"] },
          },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createUserSummaryView[dialect]);
    });
  });
});
