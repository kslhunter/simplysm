import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createColumnFactory } from "../../src/schema/factory/column-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./column-builder.expected";

describe("DDL - Column Builder", () => {
  //#region ========== 데이터 타입 기본 테스트 ==========

  describe("int 타입", () => {
    const c = createColumnFactory();
    const column = c.int();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "age",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "age",
          dataType: { type: "int" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.intType[dialect]);
    });
  });

  describe("bigint 타입", () => {
    const c = createColumnFactory();
    const column = c.bigint();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "id",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "id",
          dataType: { type: "bigint" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.bigintType[dialect]);
    });
  });

  describe("float 타입", () => {
    const c = createColumnFactory();
    const column = c.float();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Product" },
      "weight",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "Product" },
        column: {
          name: "weight",
          dataType: { type: "float" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.floatType[dialect]);
    });
  });

  describe("double 타입", () => {
    const c = createColumnFactory();
    const column = c.double();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Product" },
      "price",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "Product" },
        column: {
          name: "price",
          dataType: { type: "double" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.doubleType[dialect]);
    });
  });

  describe("decimal 타입", () => {
    const c = createColumnFactory();
    const column = c.decimal(10, 2);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Product" },
      "amount",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "Product" },
        column: {
          name: "amount",
          dataType: { type: "decimal", precision: 10, scale: 2 },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.decimalType[dialect]);
    });
  });

  describe("varchar 타입", () => {
    const c = createColumnFactory();
    const column = c.varchar(100);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "name",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "name",
          dataType: { type: "varchar", length: 100 },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.varcharType[dialect]);
    });
  });

  describe("char 타입", () => {
    const c = createColumnFactory();
    const column = c.char(10);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "code",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "code",
          dataType: { type: "char", length: 10 },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.charType[dialect]);
    });
  });

  describe("text 타입", () => {
    const c = createColumnFactory();
    const column = c.text();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Post" },
      "content",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "Post" },
        column: {
          name: "content",
          dataType: { type: "text" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.textType[dialect]);
    });
  });

  describe("binary 타입", () => {
    const c = createColumnFactory();
    const column = c.binary();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "File" },
      "data",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "File" },
        column: {
          name: "data",
          dataType: { type: "binary" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.binaryType[dialect]);
    });
  });

  describe("boolean 타입", () => {
    const c = createColumnFactory();
    const column = c.boolean();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "isActive",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "isActive",
          dataType: { type: "boolean" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.booleanType[dialect]);
    });
  });

  describe("datetime 타입", () => {
    const c = createColumnFactory();
    const column = c.datetime();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "createdAt",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "createdAt",
          dataType: { type: "datetime" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.datetimeType[dialect]);
    });
  });

  describe("date 타입", () => {
    const c = createColumnFactory();
    const column = c.date();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "birthDate",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "birthDate",
          dataType: { type: "date" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.dateType[dialect]);
    });
  });

  describe("time 타입", () => {
    const c = createColumnFactory();
    const column = c.time();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Schedule" },
      "startTime",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "Schedule" },
        column: {
          name: "startTime",
          dataType: { type: "time" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.timeType[dialect]);
    });
  });

  describe("uuid 타입", () => {
    const c = createColumnFactory();
    const column = c.uuid();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "uuid",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "uuid",
          dataType: { type: "uuid" },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.uuidType[dialect]);
    });
  });

  //#endregion

  //#region ========== 메서드 조합 테스트 ==========

  describe("nullable 지정", () => {
    const c = createColumnFactory();
    const column = c.varchar(100).nullable();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "nickname",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "nickname",
          dataType: { type: "varchar", length: 100 },
          autoIncrement: undefined,
          nullable: true,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.nullableColumn[dialect]);
    });
  });

  describe("default 지정", () => {
    const c = createColumnFactory();
    const column = c.int().default(0);

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "score",
      column,
    );

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.defaultColumn[dialect]);
    });
  });

  describe("autoIncrement 지정", () => {
    const c = createColumnFactory();
    const column = c.bigint().autoIncrement();

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "id",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "id",
          dataType: { type: "bigint" },
          autoIncrement: true,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.autoIncrementColumn[dialect]);
    });
  });

  describe("description 지정", () => {
    const c = createColumnFactory();
    const column = c.varchar(100).description("사용자 이름");

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "name",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "name",
          dataType: { type: "varchar", length: 100 },
          autoIncrement: undefined,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.descriptionColumn[dialect]);
    });
  });

  describe("nullable + default 조합", () => {
    const c = createColumnFactory();
    const column = c.varchar(50).nullable().default("Unknown");

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "status",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "status",
          dataType: { type: "varchar", length: 50 },
          autoIncrement: undefined,
          nullable: true,
          default: "Unknown",
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.nullableDefaultColumn[dialect]);
    });
  });

  describe("autoIncrement + description 조합", () => {
    const c = createColumnFactory();
    const column = c.bigint().autoIncrement().description("Primary Key");

    const db = createTestDb();
    const def = db.getAddColumnQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "User" },
      "id",
      column,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "addColumn",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        column: {
          name: "id",
          dataType: { type: "bigint" },
          autoIncrement: true,
          nullable: undefined,
          default: undefined,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.autoIncrementDescColumn[dialect]);
    });
  });

  //#endregion
});
