import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Table } from "../../src/schema/table-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./table-builder.expected";

describe("DDL - Table Builder", () => {
  describe("기본 테이블 (이름만)", () => {
    const table = Table("User");

    it("메타 데이터 검증", () => {
      expect(table.meta).toEqual({
        name: "User",
        description: undefined,
        database: undefined,
        schema: undefined,
        columns: undefined,
        primaryKey: undefined,
        relations: undefined,
        indexes: undefined,
      });
    });
  });

  describe("description 지정", () => {
    const table = Table("User").description("사용자 테이블");

    it("메타 데이터 검증", () => {
      expect(table.meta).toEqual({
        name: "User",
        description: "사용자 테이블",
        database: undefined,
        schema: undefined,
        columns: undefined,
        primaryKey: undefined,
        relations: undefined,
        indexes: undefined,
      });
    });
  });

  describe("database 지정", () => {
    const table = Table("User").database("CustomDb");

    it("메타 데이터 검증", () => {
      expect(table.meta).toEqual({
        name: "User",
        description: undefined,
        database: "CustomDb",
        schema: undefined,
        columns: undefined,
        primaryKey: undefined,
        relations: undefined,
        indexes: undefined,
      });
    });
  });

  describe("schema 지정", () => {
    const table = Table("User").schema("CustomSchema");

    it("메타 데이터 검증", () => {
      expect(table.meta).toEqual({
        name: "User",
        description: undefined,
        database: undefined,
        schema: "CustomSchema",
        columns: undefined,
        primaryKey: undefined,
        relations: undefined,
        indexes: undefined,
      });
    });
  });

  describe("columns 지정 (단일 컬럼)", () => {
    const table = Table("User").columns((c) => ({ id: c.bigint() }));

    it("메타 데이터 검증", () => {
      expect(table.meta.name).toBe("User");
      expect(table.meta.columns).toBeDefined();
      expect(Object.keys(table.meta.columns!)).toEqual(["id"]);
      expect(table.meta.columns!.id.meta.dataType).toEqual({ type: "bigint" });
    });
  });

  describe("columns 지정 (여러 컬럼)", () => {
    const table = Table("User").columns((c) => ({
      id: c.bigint(),
      name: c.varchar(100),
      email: c.varchar(200),
    }));

    it("메타 데이터 검증", () => {
      expect(table.meta.name).toBe("User");
      expect(table.meta.columns).toBeDefined();
      expect(Object.keys(table.meta.columns!)).toEqual(["id", "name", "email"]);
      expect(table.meta.columns!.id.meta.dataType).toEqual({ type: "bigint" });
      expect(table.meta.columns!.name.meta.dataType).toEqual({ type: "varchar", length: 100 });
      expect(table.meta.columns!.email.meta.dataType).toEqual({ type: "varchar", length: 200 });
    });
  });

  describe("primaryKey 지정 (단일 키)", () => {
    const User = Table("User")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({ id: c.bigint() }))
      .primaryKey("id");

    const db = createTestDb();
    const def = db.getCreateTableQueryDef(User);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createTable",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        columns: [
          {
            name: "id",
            dataType: { type: "bigint" },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
        ],
        primaryKey: ["id"],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.singlePrimaryKey[dialect]);
    });
  });

  describe("primaryKey 지정 (복합 키)", () => {
    const Order = Table("Order")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        userId: c.bigint(),
        productId: c.bigint(),
        quantity: c.int(),
      }))
      .primaryKey("userId", "productId");

    const db = createTestDb();
    const def = db.getCreateTableQueryDef(Order);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createTable",
        table: { database: "TestDb", schema: "TestSchema", name: "Order" },
        columns: [
          {
            name: "userId",
            dataType: { type: "bigint" },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
          {
            name: "productId",
            dataType: { type: "bigint" },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
          {
            name: "quantity",
            dataType: { type: "int" },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
        ],
        primaryKey: ["userId", "productId"],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.compositePrimaryKey[dialect]);
    });
  });

  describe("indexes 지정 (단일 인덱스)", () => {
    const User = Table("User")
      .columns((c) => ({
        id: c.bigint(),
        email: c.varchar(200),
      }))
      .primaryKey("id")
      .indexes((i) => [i.index("email")]);

    it("메타 데이터 검증", () => {
      expect(User.meta.indexes).toBeDefined();
      expect(User.meta.indexes!.length).toBe(1);
      expect(User.meta.indexes![0].meta.columns).toEqual(["email"]);
    });
  });

  describe("indexes 지정 (여러 인덱스)", () => {
    const User = Table("User")
      .columns((c) => ({
        id: c.bigint(),
        email: c.varchar(200),
        name: c.varchar(100),
        age: c.int(),
      }))
      .primaryKey("id")
      .indexes((i) => [i.index("email"), i.index("name", "age")]);

    it("메타 데이터 검증", () => {
      expect(User.meta.indexes).toBeDefined();
      expect(User.meta.indexes!.length).toBe(2);
      expect(User.meta.indexes![0].meta.columns).toEqual(["email"]);
      expect(User.meta.indexes![1].meta.columns).toEqual(["name", "age"]);
    });
  });

  describe("indexes 지정 (unique 인덱스)", () => {
    const User = Table("User")
      .columns((c) => ({
        id: c.bigint(),
        email: c.varchar(200),
      }))
      .primaryKey("id")
      .indexes((i) => [i.index("email").unique()]);

    it("메타 데이터 검증", () => {
      expect(User.meta.indexes).toBeDefined();
      expect(User.meta.indexes!.length).toBe(1);
      expect(User.meta.indexes![0].meta.columns).toEqual(["email"]);
      expect(User.meta.indexes![0].meta.unique).toBe(true);
    });
  });

  describe("relations 지정 (foreignKey)", () => {
    const Company = Table("Company")
      .columns((c) => ({ id: c.bigint() }))
      .primaryKey("id");

    const User = Table("User")
      .columns((c) => ({
        id: c.bigint(),
        companyId: c.bigint(),
      }))
      .primaryKey("id")
      .relations((r) => ({
        company: r.foreignKey(["companyId"], () => Company),
      }));

    it("메타 데이터 검증", () => {
      expect(User.meta.relations).toBeDefined();
      expect(Object.keys(User.meta.relations!)).toEqual(["company"]);
      expect(User.meta.relations!.company.meta.columns).toEqual(["companyId"]);
      expect(User.meta.relations!.company.meta.targetFn).toBeDefined();
    });
  });

  describe("복합 옵션 1 (database + schema + description)", () => {
    const User = Table("User")
      .database("TestDb")
      .schema("TestSchema")
      .description("사용자 테이블")
      .columns((c) => ({
        id: c.bigint(),
        name: c.varchar(100),
      }))
      .primaryKey("id");

    const db = createTestDb();
    const def = db.getCreateTableQueryDef(User);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createTable",
        table: { database: "TestDb", schema: "TestSchema", name: "User" },
        columns: [
          {
            name: "id",
            dataType: { type: "bigint" },
            autoIncrement: undefined,
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
        ],
        primaryKey: ["id"],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.complexOptions1[dialect]);
    });
  });

  describe("복합 옵션 2 (columns + PK + indexes)", () => {
    const User = Table("User")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({
        id: c.bigint(),
        email: c.varchar(200),
        name: c.varchar(100),
      }))
      .primaryKey("id")
      .indexes((i) => [i.index("email").unique()]);

    it("메타 데이터 검증", () => {
      expect(User.meta.database).toBe("TestDb");
      expect(User.meta.schema).toBe("TestSchema");
      expect(Object.keys(User.meta.columns!)).toEqual(["id", "email", "name"]);
      expect(User.meta.primaryKey).toEqual(["id"]);
      expect(User.meta.indexes!.length).toBe(1);
      expect(User.meta.indexes![0].meta.unique).toBe(true);
    });
  });

  describe("복합 옵션 3 (다양한 컬럼 타입)", () => {
    const Product = Table("Product")
      .database("TestDb")
      .schema("TestSchema")
      .description("상품 테이블")
      .columns((c) => ({
        id: c.bigint().autoIncrement(),
        name: c.varchar(200),
        price: c.decimal(10, 2),
        stock: c.int().default(0),
        isActive: c.boolean().default(true),
        description: c.text().nullable(),
        createdAt: c.datetime(),
      }))
      .primaryKey("id");

    const db = createTestDb();
    const def = db.getCreateTableQueryDef(Product);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createTable",
        table: { database: "TestDb", schema: "TestSchema", name: "Product" },
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
            dataType: { type: "varchar", length: 200 },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
          {
            name: "price",
            dataType: { type: "decimal", precision: 10, scale: 2 },
            autoIncrement: undefined,
            nullable: undefined,
            default: undefined,
          },
          {
            name: "stock",
            dataType: { type: "int" },
            autoIncrement: undefined,
            nullable: undefined,
            default: 0,
          },
          {
            name: "isActive",
            dataType: { type: "boolean" },
            autoIncrement: undefined,
            nullable: undefined,
            default: true,
          },
          {
            name: "description",
            dataType: { type: "text" },
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.complexOptions3[dialect]);
    });
  });

  describe("체이닝 메서드 순서", () => {
    // 메서드 체이닝 순서가 달라도 동일한 결과
    const table1 = Table("User")
      .columns((c) => ({ id: c.bigint() }))
      .database("TestDb")
      .schema("TestSchema")
      .primaryKey("id");

    const table2 = Table("User")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({ id: c.bigint() }))
      .primaryKey("id");

    it("메타 데이터 동일성 검증", () => {
      expect(table1.meta).toEqual(table2.meta);
    });
  });
});
