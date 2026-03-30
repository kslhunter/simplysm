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
  describe("뷰에서 SELECT", () => {
    const db = createTestDb();
    const def = db.activeUsers().getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelect[dialect]);
    });
  });

  describe("SELECT + WHERE (뷰에서)", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .where((u) => [expr.gt(u.age, 20)])
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectWhere[dialect]);
    });
  });

  describe("SELECT + select 컬럼 (뷰에서)", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .select((u) => ({
        id: u.id,
        name: u.name,
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectColumns[dialect]);
    });
  });

  describe("SELECT + ORDER BY (뷰에서)", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .orderBy((u) => u.name, "ASC")
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectOrderBy[dialect]);
    });
  });

  describe("SELECT + ORDER BY + LIMIT (뷰에서)", () => {
    const db = createTestDb();
    const def = db
      .activeUsers()
      .orderBy((u) => u.id)
      .limit(0, 10)
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.viewSelectOrderByLimit[dialect]);
    });
  });
});

describe("View - SELECT가 있는 뷰", () => {
  describe("UserSummaryView에서 SELECT", () => {
    const db = createTestDb();
    const def = db.userSummary().getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.userSummarySelectColumn[dialect]);
    });
  });
});

describe("뷰 - DDL", () => {
  describe("getCreateViewQueryDef - ActiveUsersView", () => {
    const db = createTestDb();
    const def = db.getCreateViewQueryDef(ActiveUsers);

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createActiveUsersView[dialect]);
    });
  });

  describe("getCreateViewQueryDef - UserSummaryView", () => {
    const db = createTestDb();
    const def = db.getCreateViewQueryDef(UserSummary);

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createUserSummaryView[dialect]);
    });
  });
});
