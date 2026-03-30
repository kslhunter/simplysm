import { describe, expect, it } from "vitest";
import { createTestDb, type TestDbContext } from "../setup/TestDbContext";
import { View } from "../../src/schema/view-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./view-builder.expected";

describe("DDL - 뷰 빌더", () => {
  describe("query specified (basic SELECT)", () => {
    const view = View("TestView").query((db: TestDbContext) =>
      db.user().select((u) => ({
        id: u.id,
        name: u.name,
      })),
    );

    const db = createTestDb();
    const def = db.getCreateViewQueryDef(view);

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.queryBasic[dialect]);
    });
  });

  describe("combined options (database + schema + description + query)", () => {
    const view = View("TestView")
      .database("CustomDb")
      .schema("CustomSchema")
      .description("Combined options view")
      .query((db: TestDbContext) =>
        db.user().select((u) => ({
          id: u.id,
          email: u.email,
        })),
      );

    const db = createTestDb();
    const def = db.getCreateViewQueryDef(view);

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.combined[dialect]);
    });
  });

});
