import { describe, expect, it } from "vitest";
import { createTestDb, type TestDbContext } from "../setup/TestDbContext";
import { View } from "../../src/schema/view-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./view-builder.expected";

describe("DDL - View Builder", () => {
  describe("기본 뷰 (이름만)", () => {
    const view = View("TestView");

    it("메타 데이터 검증", () => {
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

  describe("description 지정", () => {
    const view = View("TestView").description("테스트 뷰입니다");

    it("메타 데이터 검증", () => {
      expect(view.meta).toEqual({
        name: "TestView",
        description: "테스트 뷰입니다",
        database: undefined,
        schema: undefined,
        viewFn: undefined,
        relations: undefined,
      });
    });
  });

  describe("database 지정", () => {
    const view = View("TestView").database("CustomDb");

    it("메타 데이터 검증", () => {
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

  describe("schema 지정", () => {
    const view = View("TestView").schema("CustomSchema");

    it("메타 데이터 검증", () => {
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

  describe("query 지정 (기본 SELECT)", () => {
    const view = View("TestView").query((db: TestDbContext) =>
      db.user().select((u) => ({
        id: u.id,
        name: u.name,
      })),
    );

    it("메타 데이터 검증", () => {
      expect(view.meta.name).toBe("TestView");
      expect(view.meta.viewFn).toBeTypeOf("function");
    });

    const db = createTestDb();
    const def = db.getCreateViewQueryDef(view);

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.queryBasic[dialect]);
    });
  });

  describe("복합 옵션 (database + schema + description + query)", () => {
    const view = View("TestView")
      .database("CustomDb")
      .schema("CustomSchema")
      .description("복합 옵션 뷰")
      .query((db: TestDbContext) =>
        db.user().select((u) => ({
          id: u.id,
          email: u.email,
        })),
      );

    it("메타 데이터 검증", () => {
      expect(view.meta.name).toBe("TestView");
      expect(view.meta.database).toBe("CustomDb");
      expect(view.meta.schema).toBe("CustomSchema");
      expect(view.meta.description).toBe("복합 옵션 뷰");
      expect(view.meta.viewFn).toBeTypeOf("function");
    });

    const db = createTestDb();
    const def = db.getCreateViewQueryDef(view);

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.combined[dialect]);
    });
  });

  describe("relations 지정", () => {
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

    it("메타 데이터 검증", () => {
      expect(view.meta.name).toBe("TestView");
      expect(view.meta.relations).toBeDefined();
      expect(view.meta.relations?.["company"]).toBeDefined();
    });
  });
});
