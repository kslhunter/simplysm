import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Procedure } from "../../src/schema/procedure-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./procedure-builder.expected";

describe("DDL - Procedure Builder", () => {
  describe("basic procedure (name only)", () => {
    const proc = Procedure("TestProc");

    it("should validate metadata", () => {
      expect(proc.meta).toEqual({
        name: "TestProc",
        description: undefined,
        database: undefined,
        schema: undefined,
        params: undefined,
        returns: undefined,
        query: undefined,
      });
    });
  });

  describe("params specified (single parameter)", () => {
    const proc = Procedure("TestProc").params((c) => ({ id: c.bigint() }));

    it("should validate metadata", () => {
      expect(proc.meta.name).toBe("TestProc");
      expect(proc.meta.params).toBeDefined();
      expect(Object.keys(proc.meta.params!)).toEqual(["id"]);
      expect(proc.meta.params!.id.meta.dataType).toEqual({ type: "bigint" });
    });
  });

  describe("returns specified (single return)", () => {
    const proc = Procedure("TestProc").returns((c) => ({ id: c.bigint() }));

    it("should validate metadata", () => {
      expect(proc.meta.name).toBe("TestProc");
      expect(proc.meta.returns).toBeDefined();
      expect(Object.keys(proc.meta.returns!)).toEqual(["id"]);
      expect(proc.meta.returns!.id.meta.dataType).toEqual({ type: "bigint" });
    });
  });

  describe("body specified + basic DDL generation", () => {
    const proc = Procedure("TestProc")
      .database("TestDb")
      .schema("TestSchema")
      .body("SELECT 1 AS result");

    const db = createTestDb();
    const def = db.getCreateProcQueryDef(proc);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "createProc",
        procedure: { database: "TestDb", schema: "TestSchema", name: "TestProc" },
        params: undefined,
        returns: undefined,
        query: "SELECT 1 AS result",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicProc[dialect]);
    });
  });

  describe("combined options (params + returns + body)", () => {
    const GetUserById = Procedure("GetUserById")
      .database("TestDb")
      .schema("TestSchema")
      .description("Get user by ID")
      .params((c) => ({ userId: c.bigint() }))
      .returns((c) => ({
        id: c.bigint(),
        name: c.varchar(100),
        email: c.varchar(200).nullable(),
      }))
      .body("-- Write the correct query for each DBMS --");

    const db = createTestDb();
    const def = db.getCreateProcQueryDef(GetUserById);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "createProc",
        procedure: { database: "TestDb", schema: "TestSchema", name: "GetUserById" },
        params: [
          {
            name: "userId",
            dataType: { type: "bigint" },
            nullable: undefined,
            default: undefined,
          },
        ],
        returns: [
          {
            name: "id",
            dataType: { type: "bigint" },
            nullable: undefined,
          },
          {
            name: "name",
            dataType: { type: "varchar", length: 100 },
            nullable: undefined,
          },
          {
            name: "email",
            dataType: { type: "varchar", length: 200 },
            nullable: true,
          },
        ],
        query: "-- Write the correct query for each DBMS --",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.complexProc[dialect]);
    });
  });

});
