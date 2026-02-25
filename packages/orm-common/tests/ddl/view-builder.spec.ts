import { describe, expect, it } from "vitest";
import { createTestDb, type TestDbContext } from "../setup/TestDbContext";
import { View } from "../../src/schema/view-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./view-builder.expected";

describe("DDL - View Builder", () => {
  describe("basic view (name only)", () => {
    const view = View("TestView");

    it("should validate metadata", () => {
      expect(view.meta).toEqual({
        name: "TestView",
        description: undefined,
        database: undefined,
        schema: undefined,
        viewFn: undefined,
        relations: undefined,
      });
    });
  });

  describe("description specified", () => {
    const view = View("TestView").description("This is a test view");

    it("should validate metadata", () => {
      expect(view.meta).toEqual({
        name: "TestView",
        description: "This is a test view",
        database: undefined,
        schema: undefined,
        viewFn: undefined,
        relations: undefined,
      });
    });
  });

  describe("database specified", () => {
    const view = View("TestView").database("CustomDb");

    it("should validate metadata", () => {
      expect(view.meta).toEqual({
        name: "TestView",
        description: undefined,
        database: "CustomDb",
        schema: undefined,
        viewFn: undefined,
        relations: undefined,
      });
    });
  });

  describe("schema specified", () => {
    const view = View("TestView").schema("CustomSchema");

    it("should validate metadata", () => {
      expect(view.meta).toEqual({
        name: "TestView",
        description: undefined,
        database: undefined,
        schema: "CustomSchema",
        viewFn: undefined,
        relations: undefined,
      });
    });
  });

  describe("query specified (basic SELECT)", () => {
    const view = View("TestView").query((db: TestDbContext) =>
      db.user().select((u) => ({
        id: u.id,
        name: u.name,
      })),
    );

    it("should validate metadata", () => {
      expect(view.meta.name).toBe("TestView");
      expect(view.meta.viewFn).toBeTypeOf("function");
    });

    const db = createTestDb();
    const def = db.getCreateViewQueryDef(view);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "createView",
        view: { database: "TestDb", schema: "TestSchema", name: "TestView" },
        queryDef: {
          type: "select",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          as: "T1",
          select: {
            id: { type: "column", path: ["T1", "id"] },
            name: { type: "column", path: ["T1", "name"] },
          },
        },
      });
    });

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

    it("should validate metadata", () => {
      expect(view.meta.name).toBe("TestView");
      expect(view.meta.database).toBe("CustomDb");
      expect(view.meta.schema).toBe("CustomSchema");
      expect(view.meta.description).toBe("Combined options view");
      expect(view.meta.viewFn).toBeTypeOf("function");
    });

    const db = createTestDb();
    const def = db.getCreateViewQueryDef(view);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "createView",
        view: { database: "CustomDb", schema: "CustomSchema", name: "TestView" },
        queryDef: {
          type: "select",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          as: "T1",
          select: {
            id: { type: "column", path: ["T1", "id"] },
            email: { type: "column", path: ["T1", "email"] },
          },
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.combined[dialect]);
    });
  });

  describe("relations specified", () => {
    const Company = View("Company").query((db: TestDbContext) =>
      db.company().select((c) => ({ id: c.id })),
    );

    const view = View("TestView")
      .query((db: TestDbContext) =>
        db.user().select((u) => ({
          id: u.id,
          name: u.name,
          companyId: u.companyId,
        })),
      )
      .relations((r) => ({
        company: r.relationKey(["companyId"], () => Company),
      }));

    it("should validate metadata", () => {
      expect(view.meta.name).toBe("TestView");
      expect(view.meta.relations).toBeDefined();
      expect(view.meta.relations?.["company"]).toBeDefined();
    });
  });
});
