import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createRelationFactory } from "../../src/schema/factory/relation-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./relation-builder.expected";
import { Table } from "../../src/schema/table-builder";

// Test table definition
const User = Table("User")
  .database("TestDb")
  .schema("TestSchema")
  .columns((c) => ({
    id: c.bigint(),
    name: c.varchar(100),
  }))
  .primaryKey("id")
  .relations(() => ({}));

describe("DDL - 관계 빌더", () => {
  //#region ========== ForeignKeyBuilder ==========

  describe("ForeignKeyBuilder - 기본 FK", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        userId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => Post);
    const fkBuilder = RelationFactory.foreignKey(["userId"], () => User);

    const db = createTestDb();
    const def = db.getAddForeignKeyQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Post" },
      "user",
      fkBuilder,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicForeignKey[dialect]);
    });
  });

  describe("ForeignKeyBuilder - 복합 FK", () => {
    const Company = Table("Company")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        regionId: c.int(),
        name: c.varchar(100),
      }))
      .primaryKey("id", "regionId")
      .relations(() => ({}));

    const Employee = Table("Employee")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        companyId: c.bigint(),
        companyRegionId: c.int(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => Employee);
    const fkBuilder = RelationFactory.foreignKey(["companyId", "companyRegionId"], () => Company);

    const db = createTestDb();
    const def = db.getAddForeignKeyQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Employee" },
      "company",
      fkBuilder,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.compositeForeignKey[dialect]);
    });
  });

  //#endregion
});
