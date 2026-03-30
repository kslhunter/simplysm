import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createIndexFactory } from "../../src/schema/factory/index-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./index-builder.expected";

const IndexFactory = createIndexFactory<"name" | "email" | "age">();

describe("DDL - 인덱스 빌더", () => {
  describe("IndexBuilder - 단일 컬럼 인덱스", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("email");
    const def = db.getAddIndexQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.singleColumnIndex[dialect]);
    });
  });

  describe("IndexBuilder - 유니크 인덱스", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("email").unique();
    const def = db.getAddIndexQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.uniqueIndex[dialect]);
    });
  });

  describe("IndexBuilder - 복합 인덱스", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("name", "email");
    const def = db.getAddIndexQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.compositeIndex[dialect]);
    });
  });

  describe("IndexBuilder - orderBy 지정", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("name", "email").orderBy("DESC", "ASC");
    const def = db.getAddIndexQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderByIndex[dialect]);
    });
  });

  describe("IndexBuilder - 이름 지정", () => {
    const db = createTestDb();
    const indexBuilder = IndexFactory.index("email").name("UQ_User_email");
    const def = db.getAddIndexQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.customNameIndex[dialect]);
    });
  });

});
