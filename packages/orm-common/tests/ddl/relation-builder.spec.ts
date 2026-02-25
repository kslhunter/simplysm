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

describe("DDL - Relation Builder", () => {
  //#region ========== ForeignKeyBuilder ==========

  describe("ForeignKeyBuilder - basic FK", () => {
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
    const def = db.getAddFkQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Post" },
      "user",
      fkBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Post" },
        foreignKey: {
          name: "FK_Post_user",
          fkColumns: ["userId"],
          targetTable: { database: "TestDb", schema: "TestSchema", name: "User" },
          targetPkColumns: ["id"],
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicForeignKey[dialect]);
    });
  });

  describe("ForeignKeyBuilder - description specified", () => {
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
    const fkBuilder = RelationFactory.foreignKey(["userId"], () => User).description("User relationship");

    const db = createTestDb();
    const def = db.getAddFkQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Post" },
      "user",
      fkBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Post" },
        foreignKey: {
          name: "FK_Post_user",
          fkColumns: ["userId"],
          targetTable: { database: "TestDb", schema: "TestSchema", name: "User" },
          targetPkColumns: ["id"],
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicForeignKey[dialect]);
    });
  });

  describe("ForeignKeyBuilder - composite FK", () => {
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
    const def = db.getAddFkQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Employee" },
      "company",
      fkBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        foreignKey: {
          name: "FK_Employee_company",
          fkColumns: ["companyId", "companyRegionId"],
          targetTable: { database: "TestDb", schema: "TestSchema", name: "Company" },
          targetPkColumns: ["id", "regionId"],
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.compositeForeignKey[dialect]);
    });
  });

  //#endregion

  //#region ========== ForeignKeyTargetBuilder ==========

  describe("ForeignKeyTargetBuilder - basic (array)", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        userId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => User);
    const targetBuilder = RelationFactory.foreignKeyTarget(() => Post, "posts");

    // ForeignKeyTargetBuilder has no QueryDef as it is a reverse relationship
    // Only type inference testing is performed
    it("should validate metadata", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "posts",
        description: undefined,
        isSingle: undefined,
      });
    });
  });

  describe("ForeignKeyTargetBuilder - single() method", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        userId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => User);
    const targetBuilder = RelationFactory.foreignKeyTarget(() => Post, "primaryPost").single();

    it("should validate metadata", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "primaryPost",
        description: undefined,
        isSingle: true,
      });
    });
  });

  describe("ForeignKeyTargetBuilder - description specified", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        userId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => User);
    const targetBuilder = RelationFactory.foreignKeyTarget(() => Post, "posts").description(
      "List of posts by user",
    );

    it("should validate metadata", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "posts",
        description: "List of posts by user",
        isSingle: undefined,
      });
    });
  });

  //#endregion

  //#region ========== RelationKeyBuilder ==========

  describe("RelationKeyBuilder - basic", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        authorId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => Post);
    const rkBuilder = RelationFactory.relationKey(["authorId"], () => User);

    // RelationKey does not register FK in DB so getAddFkQueryDef test is not possible
    // Only metadata validation
    it("should validate metadata", () => {
      expect(rkBuilder.meta).toEqual({
        ownerFn: expect.any(Function),
        columns: ["authorId"],
        targetFn: expect.any(Function),
        description: undefined,
      });
    });
  });

  describe("RelationKeyBuilder - description specified", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        authorId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => Post);
    const rkBuilder = RelationFactory.relationKey(["authorId"], () => User).description(
      "Author relationship (logical)",
    );

    it("should validate metadata", () => {
      expect(rkBuilder.meta).toEqual({
        ownerFn: expect.any(Function),
        columns: ["authorId"],
        targetFn: expect.any(Function),
        description: "Author relationship (logical)",
      });
    });
  });

  //#endregion

  //#region ========== RelationKeyTargetBuilder ==========

  describe("RelationKeyTargetBuilder - basic (array)", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        authorId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => User);
    const targetBuilder = RelationFactory.relationKeyTarget(() => Post, "authoredPosts");

    it("should validate metadata", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "authoredPosts",
        description: undefined,
        isSingle: undefined,
      });
    });
  });

  describe("RelationKeyTargetBuilder - single() method", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        authorId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => User);
    const targetBuilder = RelationFactory.relationKeyTarget(() => Post, "featuredPost").single();

    it("should validate metadata", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "featuredPost",
        description: undefined,
        isSingle: true,
      });
    });
  });

  describe("RelationKeyTargetBuilder - description specified", () => {
    const Post = Table("Post")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        authorId: c.bigint(),
      }))
      .primaryKey("id")
      .relations(() => ({}));

    const RelationFactory = createRelationFactory(() => User);
    const targetBuilder = RelationFactory.relationKeyTarget(
      () => Post,
      "authoredPosts",
    ).description("List of authored posts (logical)");

    it("should validate metadata", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "authoredPosts",
        description: "List of authored posts (logical)",
        isSingle: undefined,
      });
    });
  });

  //#endregion
});
