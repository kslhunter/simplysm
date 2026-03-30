import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Table } from "../../src/schema/table-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./table-builder.expected";

describe("DDL - 테이블 빌더", () => {
  describe("primaryKey specified (single key)", () => {
    const User = Table("User")
      .database("TestDb")
      .schema("TestSchema")
      .columns((c) => ({ id: c.bigint() }))
      .primaryKey("id");

    const db = createTestDb();
    const def = db.getCreateTableQueryDef(User);

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.singlePrimaryKey[dialect]);
    });
  });

  describe("primaryKey specified (composite key)", () => {
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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.compositePrimaryKey[dialect]);
    });
  });

  describe("combined options 1 (database + schema + description)", () => {
    const User = Table("User")
      .database("TestDb")
      .schema("TestSchema")
      .description("User table")
      .columns((c) => ({
        id: c.bigint(),
        name: c.varchar(100),
      }))
      .primaryKey("id");

    const db = createTestDb();
    const def = db.getCreateTableQueryDef(User);

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.complexOptions1[dialect]);
    });
  });

  describe("combined options 3 (various column types)", () => {
    const Product = Table("Product")
      .database("TestDb")
      .schema("TestSchema")
      .description("Product table")
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

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.complexOptions3[dialect]);
    });
  });

  describe("method chaining order", () => {
    // Same result even with different method chaining order
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

    it("should validate metadata consistency", () => {
      expect(table1.meta).toEqual(table2.meta);
    });
  });
});
