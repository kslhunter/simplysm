import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";
import { GetUserById } from "../setup/procedure/GetUserById";
import { ActiveUsers } from "../setup/views/ActiveUsers";
import { ForeignKeyBuilder } from "../../src/schema/factory/relation-builder";
import { createColumnFactory } from "../../src/schema/factory/column-builder";
import { IndexBuilder } from "../../src/schema/factory/index-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./basic.expected";

const Column = createColumnFactory();

describe("DDL - Database", () => {
  describe("getClearSchemaQueryDef", () => {
    const db = createTestDb();
    const def = db.getClearSchemaQueryDef({ database: "TestDb", schema: "TestSchema" });

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "clearSchema",
        database: "TestDb",
        schema: "TestSchema",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.clearSchema[dialect]);
    });
  });

  describe("getSchemaExistsQueryDef", () => {
    const db = createTestDb();
    const def = db.getSchemaExistsQueryDef("TestDb", "TestSchema");

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "schemaExists",
        database: "TestDb",
        schema: "TestSchema",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.schemaExists[dialect]);
    });
  });
});

describe("DDL - Table", () => {
  describe("getCreateTableQueryDef", () => {
    const db = createTestDb();
    const def = db.getCreateTableQueryDef(User);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "createTable",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        columns: [
          {
            name: "id",
            dataType: { type: "bigint" },
            autoIncrement: true,
            nullable: undefined,
            default: undefined,
          },
          {
            name: "name",
            dataType: { type: "varchar", length: 100 },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
          {
            name: "email",
            dataType: { type: "varchar", length: 200 },
            autoIncrement: undefined,
            nullable: true,
            default: undefined,
          },
          {
            name: "age",
            dataType: { type: "int" },
            autoIncrement: undefined,
            nullable: true,
            default: undefined,
          },
          {
            name: "isActive",
            dataType: { type: "boolean" },
            autoIncrement: undefined,
            nullable: undefined,
            default: true,
          },
          {
            name: "companyId",
            dataType: { type: "bigint" },
            autoIncrement: undefined,
            nullable: true,
            default: undefined,
          },
          {
            name: "createdAt",
            dataType: { type: "datetime" },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
        ],
        primaryKey: ["id"],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createTable[dialect]);
    });
  });

  describe("getDropTableQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropTableQueryDef({ database: "TestDb", schema: "TestSchema", name: "User" });

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "dropTable",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropTable[dialect]);
    });
  });

  describe("getRenameTableQueryDef", () => {
    const db = createTestDb();
    const def = db.getRenameTableQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "Member",
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "renameTable",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        newName: "Member",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.renameTable[dialect]);
    });
  });
});

describe("DDL - Column", () => {
  describe("getAddColumnQueryDef", () => {
    const db = createTestDb();
    const column = Column.varchar(50).nullable();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "nickname",
      column,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "nickname",
          dataType: { type: "varchar", length: 50 },
          autoIncrement: undefined,
          nullable: true,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.addColumn[dialect]);
    });
  });

  describe("getAddColumnQueryDef - with default", () => {
    const db = createTestDb();
    const column = Column.int().default(0);
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "score",
      column,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "score",
          dataType: { type: "int" },
          autoIncrement: undefined,
          nullable: undefined,
          default: 0,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.addColumnWithDefault[dialect]);
    });
  });

  describe("getDropColumnQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "email",
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "dropColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: "email",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropColumn[dialect]);
    });
  });

  describe("getModifyColumnQueryDef", () => {
    const db = createTestDb();
    const column = Column.varchar(200).nullable();
    const def = db.getModifyColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "name",
      column,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "modifyColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "name",
          dataType: { type: "varchar", length: 200 },
          autoIncrement: undefined,
          nullable: true,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.modifyColumn[dialect]);
    });
  });

  describe("getRenameColumnQueryDef", () => {
    const db = createTestDb();
    const def = db.getRenameColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "name",
      "fullName",
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "renameColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: "name",
        newName: "fullName",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.renameColumn[dialect]);
    });
  });
});

describe("DDL - Primary Key", () => {
  describe("getDropPrimaryKeyQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropPrimaryKeyQueryDef({ database: "TestDb", schema: "TestSchema", name: "User" });

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "dropPrimaryKey",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropPrimaryKey[dialect]);
    });
  });

  describe("getAddPrimaryKeyQueryDef", () => {
    const db = createTestDb();
    const def = db.getAddPrimaryKeyQueryDef({ database: "TestDb", schema: "TestSchema", name: "User" }, [
      "id",
    ]);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addPrimaryKey",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        columns: ["id"],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.addPrimaryKey[dialect]);
    });
  });

});

describe("DDL - Foreign Key / Index", () => {
  describe("getAddForeignKeyQueryDef", () => {
    const db = createTestDb();
    const userRelation = Post.meta.relations?.["user"];
    if (!(userRelation instanceof ForeignKeyBuilder)) {
      throw new Error("user relation not found");
    }

    const def = db.getAddForeignKeyQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Post" },
      "user",
      userRelation,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addForeignKey",
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
      expect(builder.build(def)).toMatchSql(expected.addForeignKey[dialect]);
    });
  });

  describe("getDropForeignKeyQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropForeignKeyQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Post" },
      "user",
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "dropForeignKey",
        table: { database: "TestDb", schema: "TestSchema", name: "Post" },
        foreignKey: "FK_Post_user",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropForeignKey[dialect]);
    });
  });

  describe("getAddIndexQueryDef", () => {
    const db = createTestDb();
    const indexBuilder = new IndexBuilder({ columns: ["email"] as string[], unique: true });

    const def = db.getAddIndexQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      indexBuilder,
    );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "addIndex",
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
      expect(builder.build(def)).toMatchSql(expected.addIndex[dialect]);
    });
  });

  describe("getDropIndexQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropIndexQueryDef({ database: "TestDb", schema: "TestSchema", name: "User" }, [
      "email",
    ]);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "dropIndex",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        index: "IDX_User_email",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropIndex[dialect]);
    });
  });

});

describe("DDL - View", () => {
  describe("getCreateViewQueryDef", () => {
    const db = createTestDb();

    const def = db.getCreateViewQueryDef(ActiveUsers);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "createView",
        view: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
        queryDef: {
          type: "select",
          from: { database: "TestDb", schema: "TestSchema", name: "User" },
          as: "T1",
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "isActive"] },
              target: { type: "value", value: true },
            },
          ],
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createView[dialect]);
    });
  });

  describe("getDropViewQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropViewQueryDef({
      database: "TestDb",
      schema: "TestSchema",
      name: "ActiveUsers",
    });

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "dropView",
        view: { database: "TestDb", schema: "TestSchema", name: "ActiveUsers" },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropView[dialect]);
    });
  });
});

describe("DDL - Procedure", () => {
  describe("getCreateProcQueryDef", () => {
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
        query: "-- DBMSwrite matching query --",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createProc[dialect]);
    });
  });

  describe("getDropProcQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropProcQueryDef({
      database: "TestDb",
      schema: "TestSchema",
      name: "GetUserById",
    });

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "dropProc",
        procedure: { database: "TestDb", schema: "TestSchema", name: "GetUserById" },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropProc[dialect]);
    });
  });
});
