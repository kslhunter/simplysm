import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createColumnFactory } from "../../src/schema/factory/column-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./column-builder.expected";

describe("DDL - 컬럼 빌더", () => {
  //#region ========== Basic Data Type Tests ==========

  describe("int type", () => {
    const c = createColumnFactory();
    const column = c.int();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "age",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.intType[dialect]);
    });
  });

  describe("bigint type", () => {
    const c = createColumnFactory();
    const column = c.bigint();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "id",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.bigintType[dialect]);
    });
  });

  describe("float type", () => {
    const c = createColumnFactory();
    const column = c.float();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Product" },
      "weight",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.floatType[dialect]);
    });
  });

  describe("double type", () => {
    const c = createColumnFactory();
    const column = c.double();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Product" },
      "price",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.doubleType[dialect]);
    });
  });

  describe("decimal type", () => {
    const c = createColumnFactory();
    const column = c.decimal(10, 2);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Product" },
      "amount",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.decimalType[dialect]);
    });
  });

  describe("varchar type", () => {
    const c = createColumnFactory();
    const column = c.varchar(100);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "name",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.varcharType[dialect]);
    });
  });

  describe("char type", () => {
    const c = createColumnFactory();
    const column = c.char(10);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "code",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.charType[dialect]);
    });
  });

  describe("text type", () => {
    const c = createColumnFactory();
    const column = c.text();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Post" },
      "content",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.textType[dialect]);
    });
  });

  describe("binary type", () => {
    const c = createColumnFactory();
    const column = c.binary();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "File" },
      "data",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.binaryType[dialect]);
    });
  });

  describe("boolean type", () => {
    const c = createColumnFactory();
    const column = c.boolean();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "isActive",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.booleanType[dialect]);
    });
  });

  describe("datetime type", () => {
    const c = createColumnFactory();
    const column = c.datetime();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "createdAt",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.datetimeType[dialect]);
    });
  });

  describe("date type", () => {
    const c = createColumnFactory();
    const column = c.date();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "birthDate",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateType[dialect]);
    });
  });

  describe("time type", () => {
    const c = createColumnFactory();
    const column = c.time();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Schedule" },
      "startTime",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.timeType[dialect]);
    });
  });

  describe("uuid type", () => {
    const c = createColumnFactory();
    const column = c.uuid();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "uuid",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.uuidType[dialect]);
    });
  });

  //#endregion

  //#region ========== Method Combination Tests ==========

  describe("nullable specified", () => {
    const c = createColumnFactory();
    const column = c.varchar(100).nullable();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "nickname",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.nullableColumn[dialect]);
    });
  });

  describe("default specified", () => {
    const c = createColumnFactory();
    const column = c.int().default(0);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "score",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.defaultColumn[dialect]);
    });
  });

  describe("autoIncrement specified", () => {
    const c = createColumnFactory();
    const column = c.bigint().autoIncrement();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "id",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.autoIncrementColumn[dialect]);
    });
  });

  describe("description specified", () => {
    const c = createColumnFactory();
    const column = c.varchar(100).description("사용자 이름");

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "name",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.descriptionColumn[dialect]);
    });
  });

  describe("nullable + default combination", () => {
    const c = createColumnFactory();
    const column = c.varchar(50).nullable().default("Unknown");

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "status",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.nullableDefaultColumn[dialect]);
    });
  });

  describe("autoIncrement + description combination", () => {
    const c = createColumnFactory();
    const column = c.bigint().autoIncrement().description("Primary Key");

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "id",
      column,
    );

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.autoIncrementDescColumn[dialect]);
    });
  });

  //#endregion
});
