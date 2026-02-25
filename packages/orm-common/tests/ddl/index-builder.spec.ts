import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createIndexFactory } from "../../src/schema/factory/index-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./index-builder.expected";

const IndexFactory = createIndexFactory<"name" | "email" | "age">();

describe("DDL - Index Builder", () => {
  describe("IndexBuilder - single column index", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("email");
    const def = db.getAddIdxQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIdx",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: {
          name: "IDX_User_email",
          columns: [{ name: "email", orderBy: "ASC" }],
          unique: undefined,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.singleColumnIndex[dialect]);
    });
  });

  describe("IndexBuilder - unique index", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("email").unique();
    const def = db.getAddIdxQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIdx",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: {
          name: "IDX_User_email",
          columns: [{ name: "email", orderBy: "ASC" }],
          unique: true,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.uniqueIndex[dialect]);
    });
  });

  describe("IndexBuilder - composite index", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("name", "email");
    const def = db.getAddIdxQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIdx",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: {
          name: "IDX_User_name_email",
          columns: [
            { name: "name", orderBy: "ASC" },
            { name: "email", orderBy: "ASC" },
          ],
          unique: undefined,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.compositeIndex[dialect]);
    });
  });

  describe("IndexBuilder - orderBy specified", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("name", "email").orderBy("DESC", "ASC");
    const def = db.getAddIdxQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIdx",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: {
          name: "IDX_User_name_email",
          columns: [
            { name: "name", orderBy: "DESC" },
            { name: "email", orderBy: "ASC" },
          ],
          unique: undefined,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderByIndex[dialect]);
    });
  });

  describe("IndexBuilder - name specified", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("email").name("UQ_User_email");
    const def = db.getAddIdxQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIdx",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: {
          name: "UQ_User_email",
          columns: [{ name: "email", orderBy: "ASC" }],
          unique: undefined,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.customNameIndex[dialect]);
    });
  });

  describe("IndexBuilder - description specified", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("email").description("이메일 검색용 인덱스");
    const def = db.getAddIdxQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIdx",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: {
          name: "IDX_User_email",
          columns: [{ name: "email", orderBy: "ASC" }],
          unique: undefined,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.singleColumnIndex[dialect]);
    });
  });

  describe("IndexBuilder - combined options (unique + orderBy)", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("name", "email").unique().orderBy("DESC", "ASC");
    const def = db.getAddIdxQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIdx",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: {
          name: "IDX_User_name_email",
          columns: [
            { name: "name", orderBy: "DESC" },
            { name: "email", orderBy: "ASC" },
          ],
          unique: true,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.uniqueOrderByIndex[dialect]);
    });
  });
});
