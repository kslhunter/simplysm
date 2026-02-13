import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createRelationFactory } from "../../src/schema/factory/relation-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./relation-builder.expected";
import { Table } from "../../src/schema/table-builder";

// 테스트용 테이블 정의
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
    const def = db.getAddFkQueryDef({ database: "TestDb", schema: "TestSchema", name: "Post" }, "user", fkBuilder);

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicForeignKey[dialect]);
    });
  });

  describe("ForeignKeyBuilder - description 지정", () => {
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
    const fkBuilder = RelationFactory.foreignKey(["userId"], () => User).description("사용자 관계");

    const db = createTestDb();
    const def = db.getAddFkQueryDef({ database: "TestDb", schema: "TestSchema", name: "Post" }, "user", fkBuilder);

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
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
    const def = db.getAddFkQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Employee" },
      "company",
      fkBuilder,
    );

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.compositeForeignKey[dialect]);
    });
  });

  //#endregion

  //#region ========== ForeignKeyTargetBuilder ==========

  describe("ForeignKeyTargetBuilder - 기본 (배열)", () => {
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

    // ForeignKeyTargetBuilder는 역방향 관계로 QueryDef가 없음
    // 타입 추론 테스트만 수행
    it("메타 데이터 검증", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "posts",
        description: undefined,
        isSingle: undefined,
      });
    });
  });

  describe("ForeignKeyTargetBuilder - single()", () => {
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

    it("메타 데이터 검증", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "primaryPost",
        description: undefined,
        isSingle: true,
      });
    });
  });

  describe("ForeignKeyTargetBuilder - description 지정", () => {
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
    const targetBuilder = RelationFactory.foreignKeyTarget(() => Post, "posts").description("사용자의 게시물 목록");

    it("메타 데이터 검증", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "posts",
        description: "사용자의 게시물 목록",
        isSingle: undefined,
      });
    });
  });

  //#endregion

  //#region ========== RelationKeyBuilder ==========

  describe("RelationKeyBuilder - 기본", () => {
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

    // RelationKey는 DB에 FK를 등록하지 않으므로 getAddFkQueryDef 테스트 불가
    // 메타데이터만 검증
    it("메타 데이터 검증", () => {
      expect(rkBuilder.meta).toEqual({
        ownerFn: expect.any(Function),
        columns: ["authorId"],
        targetFn: expect.any(Function),
        description: undefined,
      });
    });
  });

  describe("RelationKeyBuilder - description 지정", () => {
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
    const rkBuilder = RelationFactory.relationKey(["authorId"], () => User).description("작성자 관계 (논리적)");

    it("메타 데이터 검증", () => {
      expect(rkBuilder.meta).toEqual({
        ownerFn: expect.any(Function),
        columns: ["authorId"],
        targetFn: expect.any(Function),
        description: "작성자 관계 (논리적)",
      });
    });
  });

  //#endregion

  //#region ========== RelationKeyTargetBuilder ==========

  describe("RelationKeyTargetBuilder - 기본 (배열)", () => {
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

    it("메타 데이터 검증", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "authoredPosts",
        description: undefined,
        isSingle: undefined,
      });
    });
  });

  describe("RelationKeyTargetBuilder - single()", () => {
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

    it("메타 데이터 검증", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "featuredPost",
        description: undefined,
        isSingle: true,
      });
    });
  });

  describe("RelationKeyTargetBuilder - description 지정", () => {
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
    const targetBuilder = RelationFactory.relationKeyTarget(() => Post, "authoredPosts").description(
      "작성한 게시물 목록 (논리적)",
    );

    it("메타 데이터 검증", () => {
      expect(targetBuilder.meta).toEqual({
        targetTableFn: expect.any(Function),
        relationName: "authoredPosts",
        description: "작성한 게시물 목록 (논리적)",
        isSingle: undefined,
      });
    });
  });

  //#endregion
});
