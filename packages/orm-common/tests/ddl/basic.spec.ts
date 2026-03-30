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

describe("DDL - 데이터베이스", () => {
  describe("getClearSchemaQueryDef", () => {
    const db = createTestDb();
    const def = db.getClearSchemaQueryDef({ database: "TestDb", schema: "TestSchema" });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.clearSchema[dialect]);
    });
  });

  describe("getSchemaExistsQueryDef", () => {
    const db = createTestDb();
    const def = db.getSchemaExistsQueryDef("TestDb", "TestSchema");

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.schemaExists[dialect]);
    });
  });
});

describe("DDL - 테이블", () => {
  describe("getCreateTableQueryDef", () => {
    const db = createTestDb();
    const def = db.getCreateTableQueryDef(User);

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.createTable[dialect]);
    });
  });

  describe("getDropTableQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropTableQueryDef({ database: "TestDb", schema: "TestSchema", name: "User" });

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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.renameTable[dialect]);
    });
  });
});

describe("DDL - 컬럼", () => {
  describe("getAddColumnQueryDef", () => {
    const db = createTestDb();
    const column = Column.varchar(50).nullable();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "nickname",
      column,
    );

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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.renameColumn[dialect]);
    });
  });
});

describe("DDL - 기본 키", () => {
  describe("getDropPrimaryKeyQueryDef", () => {
    const db = createTestDb();
    const def = db.getDropPrimaryKeyQueryDef({ database: "TestDb", schema: "TestSchema", name: "User" });

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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.addPrimaryKey[dialect]);
    });
  });

});

describe("DDL - 외래 키 / 인덱스", () => {
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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropIndex[dialect]);
    });
  });

});

describe("DDL - 뷰", () => {
  describe("getCreateViewQueryDef", () => {
    const db = createTestDb();

    const def = db.getCreateViewQueryDef(ActiveUsers);

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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropView[dialect]);
    });
  });
});

describe("DDL - 프로시저", () => {
  describe("getCreateProcQueryDef", () => {
    const db = createTestDb();
    const def = db.getCreateProcQueryDef(GetUserById);

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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dropProc[dialect]);
    });
  });
});
